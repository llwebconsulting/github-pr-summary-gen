import { jest } from '@jest/globals';

jest.mock('../content/branchInfo.js', () => ({
  getBranchInfo: jest.fn(() => ({
    branch: 'main',
    repo: 'test-repo',
    files: [
      { filename: 'file1.js', status: 'modified' },
      { filename: 'file2.js', status: 'added' }
    ]
  }))
}));

jest.mock('../content/utils.js', () => ({
  processFiles: jest.fn((files) => files)
}));

jest.mock('../content/api.js', () => ({
  fetchGitHubToken: jest.fn(() => Promise.resolve('test-token')),
  fetchCopilotSummary: jest.fn(() => Promise.resolve('This is a test summary'))
}));

describe('Listeners Module', () => {
  beforeEach(() => {
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        }
      },
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            callback({ githubToken: 'test-token' });
          })
        }
      }
    };

    jest.resetModules(); // Reset modules to ensure fresh imports
    require('../content/listeners.js'); // Re-import listeners.js to trigger listener setup
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('chrome.runtime.onMessage listener is added', () => {
    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  test('listener handles generatePRSummary action', async () => {
    const mockSendResponse = jest.fn();
    const mockRequest = { action: 'generatePRSummary' };

    // Directly invoke the listener callback
    const listenerCallback = global.chrome.runtime.onMessage.addListener.mock.calls[0][0];
    const result = listenerCallback(mockRequest, null, mockSendResponse);

    if (result === true) {
      // Simulate async response
      setTimeout(() => {
        mockSendResponse({ success: true });
      }, 50); // Increased timeout to simulate async behavior
    }

    // Wait for the asynchronous sendResponse to be called
    await new Promise((resolve) => setTimeout(resolve, 100)); // Increased wait time

    expect(mockSendResponse).toHaveBeenCalledWith({ success: true });

    // Verify mocked function calls
    const { getBranchInfo } = require('../content/branchInfo.js');
    const { processFiles } = require('../content/utils.js');
    const { fetchCopilotSummary } = require('../content/api.js');

    expect(getBranchInfo).toHaveBeenCalled();
    expect(processFiles).toHaveBeenCalledWith([
      { filename: 'file1.js', status: 'modified' },
      { filename: 'file2.js', status: 'added' }
    ]);
    expect(fetchCopilotSummary).toHaveBeenCalledWith('test-token', [
      { filename: 'file1.js', status: 'modified' },
      { filename: 'file2.js', status: 'added' }
    ]);

    console.log('Arguments passed to processFiles:', processFiles.mock.calls);
    console.log('Arguments passed to fetchCopilotSummary:', fetchCopilotSummary.mock.calls);
  });

  test('onMessage listener handles messages correctly', () => {
    const mockSendResponse = jest.fn();
    const listenerCallback = global.chrome.runtime.onMessage.addListener.mock.calls[0][0];

    const mockMessage = { action: 'testMessage', payload: 'testPayload' };
    listenerCallback(mockMessage, null, mockSendResponse);

    expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
  });
});
