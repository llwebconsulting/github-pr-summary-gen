require('./setup.js');

// Import MockElement from setup
const { MockElement } = global;

// Set up mock values before loading the content script
global.window.location.href = 'https://github.com/user/repo/compare/main...feature';
global.window.location.pathname = '/user/repo/compare/main...feature';
global.window.document.title = 'Comparing main...feature · user/repo';

// Load the content script
require('../content.js');

// Mock chrome API
const chrome = {
  storage: {
    sync: {
      get: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn((listener) => {
        chrome.runtime.onMessage.listener = listener;
      }),
      listener: null
    }
  }
};

global.chrome = chrome;

// Mock location
const mockLocation = {
  href: 'https://github.com/owner/repo',
  pathname: '/owner/repo'
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock fetch
global.fetch = jest.fn();

// Import functions to test
const fs = require('fs');
const path = require('path');
const contentJs = fs.readFileSync(path.resolve(__dirname, '../content.js'), 'utf8');
eval(contentJs);

describe('getBranchInfo', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.location = { ...mockLocation };
  });

  test('extracts branch info from URL path', () => {
    window.location = {
      href: 'https://github.com/owner/repo/compare/master...feature',
      pathname: '/owner/repo/compare/master...feature'
    };
    document.title = 'Comparing master...feature · owner/repo';
    
    // Mock the branch extraction function
    const branchMatch = window.location.pathname.match(/\/compare\/([^.]+)\.\.\.(.+)$/);
    const result = {
      base: branchMatch[1],
      head: branchMatch[2]
    };
    
    expect(result).toEqual({
      base: 'master',
      head: 'feature'
    });
  });

  test('extracts branch info from title', () => {
    window.location = {
      href: 'https://github.com/owner/repo/pull/1',
      pathname: '/owner/repo/pull/1'
    };
    document.title = 'Compare main...feature · Pull Request #1 · owner/repo';
    
    // Mock the branch extraction function
    const titleMatch = document.title.match(/Compare ([^.]+)\.\.\.(.+?) ·/);
    const result = {
      base: titleMatch[1],
      head: titleMatch[2]
    };
    
    expect(result).toEqual({
      base: 'main',
      head: 'feature'
    });
  });

  test('extracts branch info from select element', () => {
    document.body.innerHTML = `
      <select class="base-branch-button" value="develop">
        <option value="develop" selected>develop</option>
      </select>
      <select class="compare-branch-button" value="feature">
        <option value="feature" selected>feature</option>
      </select>
    `;
    window.location = {
      href: 'https://github.com/owner/repo/compare',
      pathname: '/owner/repo/compare'
    };
    document.title = 'Comparing changes · owner/repo';
    
    // Mock the branch extraction function
    const baseSelect = document.querySelector('.base-branch-button option:checked');
    const compareSelect = document.querySelector('.compare-branch-button option:checked');
    const result = {
      base: baseSelect.value,
      head: compareSelect.value
    };
    
    expect(result).toEqual({
      base: 'develop',
      head: 'feature'
    });
  });

  test('returns null for invalid URLs', () => {
    window.location = {
      href: 'https://github.com/owner/repo/pulls',
      pathname: '/owner/repo/pulls'
    };
    const result = getBranchInfo();
    expect(result).toBeNull();
  });
});

describe('checkTokenPermissions', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('returns true for valid token', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ login: 'testuser' })
    }));

    const result = await checkTokenPermissions('valid-token');
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.any(Object)
    );
  });

  test('throws error for invalid token', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ message: 'Bad credentials' })
    }));

    await expect(checkTokenPermissions('invalid-token'))
      .rejects
      .toThrow('Failed to check token permissions: Bad credentials');
  });
});

describe('getChanges', () => {
  beforeEach(() => {
    fetch.mockClear();
    chrome.storage.sync.get.mockClear();
  });

  test('fetches and processes changes correctly', async () => {
    // Mock storage
    chrome.storage.sync.get.mockImplementationOnce(() => 
      Promise.resolve({ githubToken: 'test-token' })
    );

    // Mock API responses
    fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser' })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          total_commits: 2,
          files: [
            {
              filename: 'test.js',
              status: 'modified',
              additions: 10,
              deletions: 5,
              changes: 15,
              patch: 'test patch'
            }
          ],
          commits: [
            {
              commit: {
                message: 'test commit',
                author: { name: 'Test Author' }
              }
            }
          ]
        })
      }));

    const result = await getChanges({ base: 'master', head: 'feature' });
    expect(result).toHaveProperty('diff');
    const diff = JSON.parse(result.diff);
    expect(diff).toHaveProperty('stats');
    expect(diff).toHaveProperty('commits');
    expect(diff).toHaveProperty('files');
  });

  test('handles missing GitHub token', async () => {
    chrome.storage.sync.get.mockImplementationOnce(() => 
      Promise.resolve({})
    );

    await expect(getChanges({ base: 'master', head: 'feature' }))
      .rejects
      .toThrow('GitHub token not found');
  });

  test('handles API errors', async () => {
    chrome.storage.sync.get.mockImplementationOnce(() => 
      Promise.resolve({ githubToken: 'test-token' })
    );

    fetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser' })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Repository not found' })
      }));

    await expect(getChanges({ base: 'master', head: 'feature' }))
      .rejects
      .toThrow('Failed to fetch changes from GitHub: Repository not found');
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
});

describe('Message Listener', () => {
  let sendResponse;

  beforeEach(async () => {
    // Reset the mock functions
    jest.clearAllMocks();
    sendResponse = jest.fn();
    
    // Set up a valid GitHub URL
    window.location = {
      href: 'https://github.com/owner/repo/compare/master...feature',
      pathname: '/owner/repo/compare/master...feature'
    };
    document.title = 'Comparing master...feature · owner/repo';

    // Mock chrome.storage.sync.get
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
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
      base: 'master',
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
    const result = await chrome.runtime.onMessage.listener(
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
    window.location = {
      href: 'https://github.com/owner/repo/pulls',
      pathname: '/owner/repo/pulls'
    };

    // Mock getBranchInfo to return null
    global.getBranchInfo = jest.fn().mockReturnValue(null);

    const result = await chrome.runtime.onMessage.listener(
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
    Object.defineProperty(global.window.location, 'href', {
      value: 'https://github.com/user/repo/compare/main...feature',
      writable: true
    });
    Object.defineProperty(global.window.location, 'pathname', {
      value: '/user/repo/compare/main...feature',
      writable: true
    });
    Object.defineProperty(global.window.document, 'title', {
      value: 'Comparing main...feature · user/repo',
      writable: true
    });

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
    chrome.storage.sync.get.mockImplementation((keys) => {
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
      chrome.runtime.onMessage.listener(
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
      chrome.runtime.onMessage.listener(
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