const { flushPromises, mockLocation } = require('./test-utils');

// Mock Chrome API
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn((listener) => {
        mockChrome.runtime.onMessage.listener = listener;
      }),
      removeListener: jest.fn(),
      listener: null
    }
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

global.chrome = mockChrome;

// Mock fetch
global.fetch = jest.fn();

// Import MockElement from setup
const { MockElement } = global;

// Load content.js and make its functions available
const fs = require('fs');
const path = require('path');
const contentJs = fs.readFileSync(path.resolve(__dirname, '../content.js'), 'utf8');
eval(contentJs);

describe('Content Script', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockChrome.runtime.onMessage.listener = null;
    mockChrome.storage.sync.get.mockReset();
    mockChrome.storage.sync.set.mockReset();
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();
    global.fetch.mockReset();

    // Reset DOM
    document.body.innerHTML = '';
    document.title = '';

    // Set up initial location
    mockLocation({
      href: 'https://github.com/user/repo/compare/main...feature',
      pathname: '/user/repo/compare/main...feature'
    });

    // Load content script and get message listener
    jest.isolateModules(() => {
      require('../content.js');
    });
  });

  describe('getBranchInfo', () => {
    test('extracts branch info from compare URL', () => {
      document.title = 'Comparing master...feature · user/repo';
      mockLocation({
        href: 'https://github.com/user/repo/compare/master...feature',
        pathname: '/user/repo/compare/master...feature'
      });

      const branchInfo = getBranchInfo();
      expect(branchInfo).toEqual({
        base: 'master',
        head: 'feature'
      });
    });

    it('extracts branch info from pull request title', () => {
      // Arrange
      document.title = 'Comparing main...feature · user/repo';
      mockLocation({
        href: 'https://github.com/user/repo/compare/main...feature',
        pathname: '/user/repo/compare/main...feature'
      });

      // Act
      const result = getBranchInfo();

      // Assert
      expect(result).toEqual({
        base: 'main',
        head: 'feature'
      });
    });

    it('extracts branch info from select elements', () => {
      // Arrange
      const select = document.createElement('select');
      select.setAttribute('name', 'pull_request[base]');
      select.value = 'develop';
      document.body.appendChild(select);

      document.title = 'Comparing develop...feature · user/repo';
      mockLocation({
        href: 'https://github.com/user/repo/compare/develop...feature',
        pathname: '/user/repo/compare/develop...feature'
      });

      // Act
      const result = getBranchInfo();

      // Assert
      expect(result).toEqual({
        base: 'develop',
        head: 'feature'
      });
    });

    it('returns null for invalid URLs', () => {
      mockLocation({
        href: 'https://github.com/user/repo/pulls',
        pathname: '/user/repo/pulls'
      });
      document.title = 'Pull Requests · user/repo';

      const result = getBranchInfo();
      expect(result).toBeNull();
    });
  });

  describe('checkTokenPermissions', () => {
    it('returns true for valid token', async () => {
      // Setup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser' })
      });

      // Act
      const result = await checkTokenPermissions('valid-token');

      // Assert
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token valid-token'
          })
        })
      );
    });

    it('throws error for invalid token', async () => {
      // Setup
      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Bad credentials' })
      });

      // Act & Assert
      await expect(checkTokenPermissions('invalid-token'))
        .rejects
        .toThrow('Failed to check token permissions: Bad credentials');
    });
  });

  describe('getChanges', () => {
    test('fetches and processes changes correctly', async () => {
      // Mock storage.sync.get to return a token
      mockChrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

      // Mock fetch to return changes
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            total_commits: 2,
            files: [
              {
                filename: 'test.js',
                additions: 10,
                deletions: 5,
                patch: '@@ -1,3 +1,4 @@\n Line 1\n+Line 2\n Line 3\n Line 4',
                status: 'modified',
                changes: 15
              }
            ],
            commits: [
              {
                commit: {
                  message: 'test commit',
                  author: { name: 'Test User' }
                }
              }
            ]
          })
        });

      const result = await getChanges({
        base: 'main',
        head: 'feature'
      });

      expect(result).toEqual({
        diff: JSON.stringify({
          stats: {
            total_commits: 2,
            total_changes: 1,
            additions: 10,
            deletions: 5,
            changed_files: 1,
            files_shown: 'Showing top 15 most significant files'
          },
          commits: [
            {
              message: 'test commit',
              author: 'Test User'
            }
          ],
          files: [
            {
              filename: 'test.js',
              status: 'modified',
              additions: 10,
              deletions: 5,
              changes: 15,
              patch: '@@ -1,3 +1,4 @@\n Line 1\n+Line 2\n Line 3\n Line 4'
            }
          ]
        }, null, 2)
      });
    });

    test('handles API errors', async () => {
      // Mock storage.sync.get to return a token
      mockChrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

      // Mock fetch to return an error
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ message: 'API error' })
        });

      await expect(getChanges({
        base: 'main',
        head: 'feature'
      })).rejects.toThrow('Failed to fetch changes from GitHub: API error');
    });

    test('handles missing token', async () => {
      // Mock storage.sync.get to return no token
      mockChrome.storage.sync.get.mockResolvedValue({});

      await expect(getChanges({
        base: 'main',
        head: 'feature'
      })).rejects.toThrow('GitHub token not found');
    });

    test('truncates large patches intelligently', async () => {
      // Mock storage.sync.get to return a token
      mockChrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

      // Mock fetch responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            total_commits: 1,
            files: [
              {
                filename: 'test.js',
                additions: 60,
                deletions: 0,
                patch: Array(100).fill('+ test line').join('\n'),
                status: 'modified',
                changes: 60
              }
            ],
            commits: [
              {
                commit: {
                  message: 'test commit',
                  author: { name: 'Test User' }
                }
              }
            ]
          })
        });

      const result = await getChanges({
        base: 'main',
        head: 'feature'
      });

      const summary = JSON.parse(result.diff);
      expect(summary.files[0].patch).toContain('...truncated...');
      expect(summary.files[0].patch.split('\n').length).toBeLessThanOrEqual(52); // 50 lines + truncated message
    });

    test('prioritizes important lines in truncation', async () => {
      // Mock storage.sync.get to return a token
      mockChrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

      // Create a patch with important lines
      const importantLines = [
        '+ function testFunction() {',
        '+ class TestClass {',
        '+ export const test = 1;',
        '+ import { test } from "./test";'
      ];
      const fillerLines = Array(100).fill('  console.log("test");');
      const patch = [...importantLines, ...fillerLines].join('\n');

      // Mock fetch responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            total_commits: 1,
            files: [
              {
                filename: 'test.js',
                additions: 104,
                deletions: 0,
                patch,
                status: 'modified',
                changes: 104
              }
            ],
            commits: [
              {
                commit: {
                  message: 'test commit',
                  author: { name: 'Test User' }
                }
              }
            ]
          })
        });

      const result = await getChanges({
        base: 'main',
        head: 'feature'
      });

      const summary = JSON.parse(result.diff);
      const truncatedPatch = summary.files[0].patch;
      
      // Check that important lines are preserved
      importantLines.forEach(line => {
        expect(truncatedPatch).toContain(line);
      });
    });

    test('sorts files by significance', async () => {
      // Mock storage.sync.get to return a token
      mockChrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

      // Mock fetch responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            total_commits: 1,
            files: [
              {
                filename: 'README.md',
                additions: 1,
                deletions: 0,
                patch: '+ test',
                status: 'modified',
                changes: 1
              },
              {
                filename: 'src/main.js',
                additions: 10,
                deletions: 5,
                patch: Array(15).fill('+ test').join('\n'),
                status: 'modified',
                changes: 15
              },
              {
                filename: 'test.txt',
                additions: 2,
                deletions: 2,
                patch: '+ test\n+ test',
                status: 'modified',
                changes: 4
              }
            ],
            commits: [
              {
                commit: {
                  message: 'test commit',
                  author: { name: 'Test User' }
                }
              }
            ]
          })
        });

      const result = await getChanges({
        base: 'main',
        head: 'feature'
      });

      const summary = JSON.parse(result.diff);
      
      // Verify files are sorted by significance (changes) and file type
      expect(summary.files[0].filename).toBe('src/main.js');
      expect(summary.files[0].changes).toBe(15);
      
      // Verify stats are calculated correctly
      expect(summary.stats.total_changes).toBe(3);
      expect(summary.stats.additions).toBe(13);
      expect(summary.stats.deletions).toBe(7);
    });

    test('handles more than 15 files', async () => {
      // Mock storage.sync.get to return a token
      mockChrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

      // Create 20 files
      const files = Array(20).fill(null).map((_, i) => ({
        filename: `file${i}.js`,
        additions: i + 1,
        deletions: 0,
        patch: `+ test line ${i}`,
        status: 'modified',
        changes: i + 1
      }));

      // Mock fetch responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            total_commits: 1,
            files,
            commits: [
              {
                commit: {
                  message: 'test commit',
                  author: { name: 'Test User' }
                }
              }
            ]
          })
        });

      const result = await getChanges({
        base: 'main',
        head: 'feature'
      });

      const summary = JSON.parse(result.diff);
      
      // Verify only top 15 files are included
      expect(summary.files.length).toBe(15);
      expect(summary.stats.note).toBe('5 additional files not shown');
    });

    test('sorts files by changes and file type correctly', async () => {
      // Mock storage.sync.get to return a token
      mockChrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

      // Create test files with specific changes and types
      const testFiles = [
        {
          filename: 'README.md',
          additions: 20,
          deletions: 10,
          patch: 'test patch',
          status: 'modified',
          changes: 30
        },
        {
          filename: 'src/main.js',
          additions: 15,
          deletions: 15,
          patch: 'test patch',
          status: 'modified',
          changes: 30
        },
        {
          filename: 'docs/guide.md',
          additions: 15,
          deletions: 15,
          patch: 'test patch',
          status: 'modified',
          changes: 30
        },
        {
          filename: 'src/utils.ts',
          additions: 10,
          deletions: 5,
          patch: 'test patch',
          status: 'modified',
          changes: 15
        },
        {
          filename: 'assets/style.css',
          additions: 25,
          deletions: 10,
          patch: 'test patch',
          status: 'modified',
          changes: 35
        }
      ];

      // Mock fetch responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            total_commits: 1,
            files: testFiles,
            commits: []
          })
        });

      const result = await getChanges({
        base: 'main',
        head: 'feature'
      });

      const summary = JSON.parse(result.diff);
      const sortedFiles = summary.files;

      // Verify sorting order:
      // 1. style.css should be first (most changes - 35)
      // 2. main.js should be second (30 changes, source file)
      // 3. README.md and docs/guide.md should follow (30 changes, non-source)
      expect(sortedFiles[0].filename).toBe('assets/style.css');
      expect(sortedFiles[1].filename).toBe('src/main.js');
      expect(sortedFiles[2].filename).toBe('README.md');
      expect(sortedFiles[3].filename).toBe('docs/guide.md');
      expect(sortedFiles[4].filename).toBe('src/utils.ts');

      // For files with equal changes (30), source files should come first
      const equalChangesFiles = sortedFiles.filter(f => f.changes === 30);
      const sourceFileFirst = equalChangesFiles[0].filename.endsWith('.js');
      const nonSourceFileLater = equalChangesFiles[equalChangesFiles.length - 1].filename.endsWith('.md');
      expect(sourceFileFirst).toBe(true);
      expect(nonSourceFileLater).toBe(true);
    });

    test('truncates patches with important lines correctly', async () => {
      // Mock storage.sync.get to return a token
      mockChrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

      // Create a patch with important lines mixed in
      const patchLines = [
        '  console.log("start");',
        '  const x = 1;',
        '  const y = 2;',
        'function importantFunction1() {',
        '  // Some code',
        '}',
        '  console.log("middle");',
        '  const z = 3;',
        '  const w = 4;',
        '+ new important line 1',
        '  console.log("more middle");',
        '  const a = 5;',
        '  const b = 6;',
        '- removed important line 1',
        '  console.log("end");',
        'export const something1 = 42;'
      ];

      // Create more important lines to exceed the maxLines limit
      const importantLines = Array(30).fill(0).map((_, i) => [
        `function importantFunction${i}() {}`,
        `+ new important line ${i}`,
        `- removed important line ${i}`,
        `export const something${i} = ${i};`
      ]).flat();

      // Generate patch with both important and non-important lines
      const patch = [
        ...patchLines,
        ...importantLines,
        ...Array(20).fill('  console.log("padding");')
      ].join('\n');

      // Mock fetch responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            total_commits: 1,
            files: [{
              filename: 'test.js',
              additions: 1,
              deletions: 1,
              patch,
              status: 'modified',
              changes: 2
            }],
            commits: [
              {
                commit: {
                  message: 'test commit',
                  author: { name: 'Test User' }
                }
              }
            ]
          })
        });

      const result = await getChanges({
        base: 'main',
        head: 'feature'
      });

      const summary = JSON.parse(result.diff);
      const truncatedPatch = summary.files[0].patch;
      
      // Verify important lines are kept
      expect(truncatedPatch).toContain('function importantFunction1()');
      expect(truncatedPatch).toContain('export const something1 = 42');
      expect(truncatedPatch).toContain('+ new important line 1');
      expect(truncatedPatch).toContain('- removed important line 1');
      
      // Verify non-important lines are truncated
      expect(truncatedPatch).not.toContain('const x = 1');
      expect(truncatedPatch).not.toContain('const y = 2');
      expect(truncatedPatch).not.toContain('const z = 3');
      expect(truncatedPatch).not.toContain('const w = 4');
      
      // Verify truncation happened
      expect(truncatedPatch).toContain('...truncated...');
      expect(truncatedPatch.split('\n').length).toBeLessThanOrEqual(52); // 50 lines + truncated message
    });

    test('handles API errors with custom message', async () => {
      // Mock storage.sync.get to return a token
      mockChrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

      // Mock fetch to return an error with custom message
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ message: 'Custom error from GitHub' })
        });

      await expect(getChanges({
        base: 'main',
        head: 'feature'
      })).rejects.toThrow('Failed to fetch changes from GitHub: Custom error from GitHub');
    });

    test('handles API errors without message', async () => {
      // Mock storage.sync.get to return a token
      mockChrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

      // Mock fetch to return an error without message
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Internal Server Error',
          json: () => Promise.reject(new Error('Invalid JSON'))
        });

      await expect(getChanges({
        base: 'main',
        head: 'feature'
      })).rejects.toThrow('Failed to fetch changes from GitHub: Internal Server Error');
    });
  });

  describe('Message Handling', () => {
    test('responds to generatePRSummary message', async () => {
      // Mock storage.sync.get to return tokens
      mockChrome.storage.sync.get.mockResolvedValue({
        githubToken: 'test-token',
        openaiKey: 'test-openai-key'
      });

      // Mock fetch to return changes
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            total_commits: 2,
            files: [
              {
                filename: 'test.js',
                additions: 10,
                deletions: 5,
                patch: '@@ -1,3 +1,4 @@\n Line 1\n+Line 2\n Line 3\n Line 4',
                status: 'modified',
                changes: 15
              }
            ],
            commits: [
              {
                commit: {
                  message: 'test commit',
                  author: { name: 'Test User' }
                }
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: 'Test Title',
                    summary: 'Test Summary'
                  })
                }
              }
            ]
          })
        });

      // Mock getBranchInfo
      global.getBranchInfo = jest.fn().mockReturnValue({
        base: 'main',
        head: 'feature'
      });

      // Call the message listener
      const request = { action: 'generatePRSummary' };
      const sendResponse = jest.fn();

      const shouldHandleAsync = mockChrome.runtime.onMessage.listener(request, {}, sendResponse);
      expect(shouldHandleAsync).toBe(true);

      await flushPromises();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('handles errors in message processing', async () => {
      // Mock window.location
      mockLocation({
        href: 'https://github.com/user/repo/invalid',
        pathname: '/user/repo/invalid'
      });

      // Mock getBranchInfo to return null
      global.getBranchInfo = jest.fn().mockReturnValue(null);
      console.log('getBranchInfo mock set up');

      // Mock storage.sync.get to return tokens
      mockChrome.storage.sync.get.mockResolvedValue({
        githubToken: 'test-token',
        openaiKey: 'test-openai-key'
      });
      console.log('storage.sync.get mock set up');

      // Call the message listener
      const request = { action: 'generatePRSummary' };
      const sendResponse = jest.fn();
      console.log('About to call message listener');

      const shouldHandleAsync = mockChrome.runtime.onMessage.listener(request, {}, sendResponse);
      console.log('Message listener called, shouldHandleAsync:', shouldHandleAsync);

      await flushPromises();
      console.log('Promises flushed, sendResponse calls:', sendResponse.mock.calls);

      expect(sendResponse).toHaveBeenCalledWith({
        error: 'Could not determine branch information'
      });
    });
  });
});

describe('updatePRForm', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="pull_request_title" />
      <textarea id="pull_request_body" />
    `;
  });

  test('updates PR form with summary', () => {
    const summary = {
      title: 'Test Title',
      summary: 'Test Summary'
    };

    const titleInput = document.getElementById('pull_request_title');
    const bodyInput = document.getElementById('pull_request_body');

    // Create input event
    const inputEvent = new Event('input', {
      bubbles: true,
      cancelable: true,
    });

    // Mock dispatchEvent
    titleInput.dispatchEvent = jest.fn();
    bodyInput.dispatchEvent = jest.fn();

    updatePRForm(summary);

    expect(titleInput.value).toBe('Test Title');
    expect(bodyInput.value).toBe('Test Summary');
    expect(titleInput.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
    expect(bodyInput.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
  });

  test('handles different title input selectors', () => {
    // Test each selector
    const selectors = [
      'input[name="pull_request[title]"]',
      '#pull_request_title',
      'input[aria-label="Title"]'
    ];

    selectors.forEach(selector => {
      // Reset document
      document.body.innerHTML = '';
      
      // Create input with current selector
      const input = document.createElement('input');
      if (selector.startsWith('#')) {
        input.id = selector.slice(1);
      } else if (selector.includes('[name=')) {
        input.setAttribute('name', 'pull_request[title]');
      } else if (selector.includes('[aria-label=')) {
        input.setAttribute('aria-label', 'Title');
      }
      document.body.appendChild(input);

      // Mock dispatchEvent
      input.dispatchEvent = jest.fn();

      // Update form
      updatePRForm({
        title: 'Test Title',
        summary: 'Test Summary'
      });

      // Verify
      expect(input.value).toBe('Test Title');
      expect(input.dispatchEvent).toHaveBeenCalled();
    });
  });

  test('handles different description input selectors', () => {
    // Test each selector
    const selectors = [
      'textarea[name="pull_request[body]"]',
      '#pull_request_body',
      'textarea[aria-label="Description"]'
    ];

    selectors.forEach(selector => {
      // Reset document
      document.body.innerHTML = '';
      
      // Create textarea with current selector
      const textarea = document.createElement('textarea');
      if (selector.startsWith('#')) {
        textarea.id = selector.slice(1);
      } else if (selector.includes('[name=')) {
        textarea.setAttribute('name', 'pull_request[body]');
      } else if (selector.includes('[aria-label=')) {
        textarea.setAttribute('aria-label', 'Description');
      }
      document.body.appendChild(textarea);

      // Mock dispatchEvent
      textarea.dispatchEvent = jest.fn();

      // Update form
      updatePRForm({
        title: 'Test Title',
        summary: 'Test Summary'
      });

      // Verify
      expect(textarea.value).toBe('Test Summary');
      expect(textarea.dispatchEvent).toHaveBeenCalled();
    });
  });

  test('handles missing form elements gracefully', () => {
    // Spy on console.warn
    const consoleWarnSpy = jest.spyOn(console, 'warn');

    // Reset document
    document.body.innerHTML = '';

    // Update form
    updatePRForm({
      title: 'Test Title',
      summary: 'Test Summary'
    });

    // Verify warnings were logged
    expect(consoleWarnSpy).toHaveBeenCalledWith('No title input found');
    expect(consoleWarnSpy).toHaveBeenCalledWith('No description input found');
  });
});

describe('Message Listener', () => {
  let sendResponse;

  beforeEach(() => {
    // Reset the mock functions
    jest.clearAllMocks();
    sendResponse = jest.fn();
    
    // Set up a valid GitHub URL
    mockLocation({
      href: 'https://github.com/user/repo/compare/main...feature',
      pathname: '/user/repo/compare/main...feature'
    });
    document.title = 'Comparing main...feature · user/repo';

    // Mock chrome.storage.sync.get
    mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
      const result = {
        githubToken: 'test-token',
        openaiKey: 'test-key'
      };
      if (typeof callback === 'function') {
        callback(result);
      }
      return Promise.resolve(result);
    });

    // Mock fetch
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ login: 'user' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          files: [],
          commits: [],
          total_commits: 0
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Test PR Title',
                summary: 'Test PR Summary'
              })
            }
          }]
        })
      });

    // Mock getBranchInfo
    global.getBranchInfo = jest.fn().mockReturnValue({
      base: 'main',
      head: 'feature'
    });

    // Mock generateSummary
    global.generateSummary = jest.fn().mockResolvedValue({
      title: 'Test PR Title',
      summary: 'Test PR Summary'
    });

    // Mock updatePRForm
    global.updatePRForm = jest.fn();

    // Mock getChanges
    global.getChanges = jest.fn().mockResolvedValue({
      files: [],
      commits: [],
      total_commits: 0
    });

    // Mock checkTokenPermissions
    global.checkTokenPermissions = jest.fn().mockResolvedValue(true);
  });

  test('handles generatePRSummary message', async () => {
    // Call the message listener
    const result = await mockChrome.runtime.onMessage.listener(
      { action: 'generatePRSummary' },
      { tab: { id: 1 } },
      sendResponse
    );

    // Wait for any promises to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result).toBe(true); // Indicates the message was handled
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('handles errors in generatePRSummary', async () => {
    // Force an error by setting an invalid URL
    mockLocation({
      href: 'https://github.com/owner/repo/pulls',
      pathname: '/owner/repo/pulls'
    });

    // Mock getBranchInfo to return null
    global.getBranchInfo = jest.fn().mockReturnValue(null);

    const result = await mockChrome.runtime.onMessage.listener(
      { action: 'generatePRSummary' },
      { tab: { id: 1 } },
      sendResponse
    );

    // Wait for any promises to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result).toBe(true); // Indicates the message was handled
    expect(sendResponse).toHaveBeenCalledWith({
      error: 'Could not determine branch information'
    });
  });
});

describe('GitHub PR Summary Generator', () => {
  let titleInput;
  let descriptionInput;

  beforeEach(() => {
    // Reset mock values before each test
    mockLocation({
      href: 'https://github.com/user/repo/compare/main...feature',
      pathname: '/user/repo/compare/main...feature'
    });
    document.title = 'Comparing main...feature · user/repo';

    // Create mock form elements
    titleInput = new MockElement();
    descriptionInput = new MockElement();

    // Directly override global.document.querySelector
    global.document.querySelector = jest.fn((selector) => {
      if (selector === 'input[name="pull_request[title]"]' || selector === '#pull_request_title' || selector === 'input[aria-label="Title"]') {
        return titleInput;
      }
      if (selector === 'textarea[name="pull_request[body]"]' || selector === '#pull_request_body' || selector === 'textarea[aria-label="Description"]') {
        return descriptionInput;
      }
      if (selector.includes('base')) {
        const baseSelect = new MockElement();
        baseSelect.value = 'main';
        return baseSelect;
      }
      return null;
    });

    // Mock storage
    mockChrome.storage.sync.get.mockImplementation((keys) => {
      const result = {};
      if (Array.isArray(keys) && keys.includes('githubToken')) {
        result.githubToken = 'test-token';
      }
      if (Array.isArray(keys) && keys.includes('openaiKey')) {
        result.openaiKey = 'test-key';
      }
      return Promise.resolve(result);
    });

    // Reset fetch mock
    global.fetch.mockReset();
  });

  it('should handle PR summary generation end-to-end', async () => {
    // Mock GitHub API response
    const mockDiff = 'diff --git a/file.txt b/file.txt\n+new line';
    const mockDiffResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue(mockDiff),
      json: jest.fn().mockResolvedValue({
        files: [{
          filename: 'file.txt',
          status: 'modified',
          additions: 1,
          deletions: 0,
          changes: 1,
          patch: '+new line'
        }],
        total_commits: 1,
        commits: [{
          commit: {
            message: 'Test commit',
            author: { name: 'Test Author' }
          }
        }]
      })
    };

    const mockUserResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({})
    };

    global.fetch
      .mockImplementationOnce(() => Promise.resolve(mockUserResponse)) // Token check
      .mockImplementationOnce(() => Promise.resolve(mockDiffResponse)) // Diff fetch
      .mockImplementationOnce(() => Promise.resolve({ // OpenAI response
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Test PR Title',
                summary: 'Test PR Summary'
              })
            }
          }]
        })
      }));

    // Create a promise to wait for the response
    const responsePromise = new Promise((resolve) => {
      const sendResponse = jest.fn((response) => {
        resolve(response);
      });

      // Trigger the message listener
      mockChrome.runtime.onMessage.listener(
        { action: 'generatePRSummary' },
        {},
        sendResponse
      );
    });

    // Wait for the response
    const response = await responsePromise;
    expect(response).toEqual({ success: true });

    // Verify the GitHub API calls were made with correct parameters
    const fetchCalls = global.fetch.mock.calls;
    expect(fetchCalls.length).toBe(3);

    // Verify token check call
    expect(fetchCalls[0][0]).toBe('https://api.github.com/user');
    expect(fetchCalls[0][1].headers).toEqual(
      expect.objectContaining({
        'Authorization': 'token test-token'
      })
    );

    // Verify diff fetch call
    expect(fetchCalls[1][0]).toContain('/compare/');
    expect(fetchCalls[1][1].headers).toEqual(
      expect.objectContaining({
        'Authorization': 'token test-token'
      })
    );

    // Verify the OpenAI API call was made with correct parameters
    expect(fetchCalls[2][0]).toBe('https://api.openai.com/v1/chat/completions');
    expect(fetchCalls[2][1].headers).toEqual(
      expect.objectContaining({
        'Authorization': 'Bearer test-key'
      })
    );

    // Verify the form was updated
    expect(titleInput.value).toBe('Test PR Title');
    expect(descriptionInput.value).toBe('Test PR Summary');
    expect(titleInput.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
    expect(descriptionInput.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
  });

  it('should handle errors gracefully', async () => {
    // Mock GitHub API error
    global.fetch.mockRejectedValueOnce(new Error('API Error'));

    // Create a promise to wait for the response
    const responsePromise = new Promise((resolve) => {
      const sendResponse = jest.fn((response) => {
        resolve(response);
      });

      // Trigger the message listener
      mockChrome.runtime.onMessage.listener(
        { action: 'generatePRSummary' },
        {},
        sendResponse
      );
    });

    // Wait for the response
    const response = await responsePromise;
    expect(response).toEqual(
      expect.objectContaining({
        error: expect.any(String)
      })
    );
  });
});

describe('generateSummary', () => {
  test('handles OpenAI API errors gracefully', async () => {
    // Mock storage.sync.get to return tokens
    mockChrome.storage.sync.get.mockResolvedValue({
      openaiKey: 'test-key',
      model: 'gpt-4'
    });

    // Mock fetch to return an error
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: () => Promise.resolve({
        error: {
          message: 'Rate limit exceeded'
        }
      })
    });

    await expect(generateSummary({
      diff: JSON.stringify({
        stats: { total_commits: 1 },
        commits: [],
        files: []
      })
    })).rejects.toThrow('OpenAI API error: Rate limit exceeded');
  });

  test('handles invalid JSON response from OpenAI', async () => {
    // Mock storage.sync.get to return tokens
    mockChrome.storage.sync.get.mockResolvedValue({
      openaiKey: 'test-key',
      model: 'gpt-4'
    });

    // Mock fetch to return invalid JSON
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      })
    });

    await expect(generateSummary({
      diff: JSON.stringify({
        stats: { total_commits: 1 },
        commits: [],
        files: []
      })
    })).rejects.toThrow('Failed to parse summary from OpenAI response');
  });

  test('uses default model when not specified', async () => {
    // Mock storage.sync.get to return only openaiKey
    mockChrome.storage.sync.get.mockResolvedValue({
      openaiKey: 'test-key'
    });

    // Mock fetch to capture the request body
    global.fetch.mockImplementationOnce(async (url, options) => {
      const body = JSON.parse(options.body);
      expect(body.model).toBe('chatgpt-4o-latest');
      return {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Test',
                summary: 'Test'
              })
            }
          }]
        })
      };
    });

    await generateSummary({
      diff: JSON.stringify({
        stats: { total_commits: 1 },
        commits: [],
        files: []
      })
    });
  });

  test('handles network errors from OpenAI API', async () => {
    // Mock storage.sync.get to return tokens
    mockChrome.storage.sync.get.mockResolvedValue({
      openaiKey: 'test-key',
      model: 'gpt-4'
    });

    // Mock fetch to throw network error
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(generateSummary({
      diff: JSON.stringify({
        stats: { total_commits: 1 },
        commits: [],
        files: []
      })
    })).rejects.toThrow('Network error');
  });

  test('handles empty response from OpenAI', async () => {
    // Mock storage.sync.get to return tokens
    mockChrome.storage.sync.get.mockResolvedValue({
      openaiKey: 'test-key',
      model: 'gpt-4'
    });

    // Mock fetch to return empty response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: ''
          }
        }]
      })
    });

    await expect(generateSummary({
      diff: JSON.stringify({
        stats: { total_commits: 1 },
        commits: [],
        files: []
      })
    })).rejects.toThrow('Failed to parse summary from OpenAI response');
  });

  test('handles malformed response from OpenAI', async () => {
    // Mock storage.sync.get to return tokens
    mockChrome.storage.sync.get.mockResolvedValue({
      openaiKey: 'test-key',
      model: 'gpt-4'
    });

    // Mock fetch to return malformed response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: '{invalid json'
          }
        }]
      })
    });

    await expect(generateSummary({
      diff: JSON.stringify({
        stats: { total_commits: 1 },
        commits: [],
        files: []
      })
    })).rejects.toThrow('Failed to parse summary from OpenAI response');
  });

  test('handles missing content in OpenAI response', async () => {
    // Mock storage.sync.get to return tokens
    mockChrome.storage.sync.get.mockResolvedValue({
      openaiKey: 'test-key',
      model: 'gpt-4'
    });

    // Mock fetch to return response without content
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {}
        }]
      })
    });

    await expect(generateSummary({
      diff: JSON.stringify({
        stats: { total_commits: 1 },
        commits: [],
        files: []
      })
    })).rejects.toThrow('Failed to parse summary from OpenAI response');
  });

  test('handles missing message in OpenAI response', async () => {
    // Mock storage.sync.get to return tokens
    mockChrome.storage.sync.get.mockResolvedValue({
      openaiKey: 'test-key',
      model: 'gpt-4'
    });

    // Mock fetch to return response without message
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{}]
      })
    });

    await expect(generateSummary({
      diff: JSON.stringify({
        stats: { total_commits: 1 },
        commits: [],
        files: []
      })
    })).rejects.toThrow('Cannot read properties of undefined (reading \'content\')');
  });
});

describe('generatePrompt', () => {
  test('generates prompt with all required sections', () => {
    const changesData = {
      stats: {
        total_commits: 2,
        changed_files: 3,
        additions: 10,
        deletions: 5,
        note: '2 additional files not shown'
      },
      commits: [
        {
          message: 'feat: add new feature',
          author: 'Test User'
        },
        {
          message: 'fix: bug fix',
          author: 'Another User'
        }
      ],
      files: [
        {
          filename: 'test.js',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: '+ test line'
        }
      ]
    };

    const prompt = generatePrompt(changesData);
    
    // Verify prompt contains all required sections
    expect(prompt).toContain('Stats:');
    expect(prompt).toContain('Recent Commits:');
    expect(prompt).toContain('Most Significant Files Changed:');
    
    // Verify stats are included
    expect(prompt).toContain('Total commits: 2');
    expect(prompt).toContain('Files changed: 3');
    expect(prompt).toContain('Additions: 10');
    expect(prompt).toContain('Deletions: 5');
    expect(prompt).toContain('Note: 2 additional files not shown');
    
    // Verify commits are included
    expect(prompt).toContain('feat: add new feature (by Test User)');
    expect(prompt).toContain('fix: bug fix (by Another User)');
    
    // Verify file changes are included
    expect(prompt).toContain('File: test.js');
    expect(prompt).toContain('Status: modified');
    expect(prompt).toContain('Changes: +10 -5');
    expect(prompt).toContain('test line');
  });

  test('handles missing optional fields', () => {
    const changesData = {
      stats: {
        total_commits: 1,
        changed_files: 1,
        additions: 1,
        deletions: 0
      },
      commits: [
        {
          message: 'test commit',
          author: 'Test User'
        }
      ],
      files: [
        {
          filename: 'test.js',
          status: 'added',
          additions: 1,
          deletions: 0,
          changes: 1
        }
      ]
    };

    const prompt = generatePrompt(changesData);
    
    // Verify prompt is generated without optional fields
    expect(prompt).toContain('Stats:');
    expect(prompt).toContain('Recent Commits:');
    expect(prompt).toContain('Most Significant Files Changed:');
    expect(prompt).not.toContain('Note:');
  });

  test('handles empty commits array', () => {
    const changesData = {
      stats: {
        total_commits: 0,
        changed_files: 1,
        additions: 1,
        deletions: 0
      },
      commits: [],
      files: [
        {
          filename: 'test.js',
          status: 'added',
          additions: 1,
          deletions: 0,
          changes: 1
        }
      ]
    };

    const prompt = generatePrompt(changesData);
    
    // Verify prompt is generated without commits
    expect(prompt).toContain('Stats:');
    expect(prompt).toContain('Recent Commits:');
    expect(prompt).toContain('Most Significant Files Changed:');
    expect(prompt).not.toContain('(by');
  });
}); 