require('./setup.js');

// Import MockElement from setup
const { MockElement } = global;

// Set up mock values before loading the content script
global.window.location.href = 'https://github.com/user/repo/compare/main...feature';
global.window.location.pathname = '/user/repo/compare/main...feature';
global.window.document.title = 'Comparing main...feature · user/repo';

// Load the content script
require('../content.js');

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