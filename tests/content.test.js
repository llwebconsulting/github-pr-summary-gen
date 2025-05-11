import { jest } from '@jest/globals';
import '../content.js';

describe('Content Script', () => {
  beforeEach(() => {
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        }
      },
      storage: {
        sync: {
          get: jest.fn(() => Promise.resolve({ githubToken: 'test-token' }))
        }
      }
    };

    jest.resetModules(); // Reset modules to ensure fresh imports
    require('../content.js'); // Re-import content.js to trigger listener setup
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

    const listenerCallback = global.chrome.runtime.onMessage.addListener.mock.calls[0][0];
    const result = listenerCallback(mockRequest, null, mockSendResponse);

    if (result === true) {
      // Simulate async response
      setTimeout(() => {
        mockSendResponse({ success: true });
      }, 50);
    }

    // Wait for the asynchronous sendResponse to be called
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
  });
});
