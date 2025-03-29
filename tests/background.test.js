const { flushPromises } = require('./test-utils');

// Mock Chrome API
const mockChrome = {
  runtime: {
    onInstalled: {
      addListener: jest.fn()
    }
  },
  storage: {
    sync: {
      get: jest.fn()
    }
  },
  windows: {
    create: jest.fn()
  }
};

global.chrome = mockChrome;

describe('Background Script', () => {
  let onInstalledCallback;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Load background script
    jest.isolateModules(() => {
      require('../background');
      onInstalledCallback = mockChrome.runtime.onInstalled.addListener.mock.calls[0][0];
    });
  });

  describe('Installation', () => {
    it('opens settings page when tokens are missing', async () => {
      // Arrange
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({});
      });

      // Act
      await onInstalledCallback();
      await flushPromises();

      // Assert
      expect(mockChrome.windows.create).toHaveBeenCalledWith({
        url: 'settings.html',
        type: 'popup',
        width: 400,
        height: 300
      });
    });

    it('does not open settings page when tokens exist', async () => {
      // Arrange
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({
          githubToken: 'test-token',
          openaiKey: 'test-key'
        });
      });

      // Act
      await onInstalledCallback();
      await flushPromises();

      // Assert
      expect(mockChrome.windows.create).not.toHaveBeenCalled();
    });

    it('opens settings page when only GitHub token is missing', async () => {
      // Arrange
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({
          openaiKey: 'test-key'
        });
      });

      // Act
      await onInstalledCallback();
      await flushPromises();

      // Assert
      expect(mockChrome.windows.create).toHaveBeenCalled();
    });

    it('opens settings page when only OpenAI key is missing', async () => {
      // Arrange
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({
          githubToken: 'test-token'
        });
      });

      // Act
      await onInstalledCallback();
      await flushPromises();

      // Assert
      expect(mockChrome.windows.create).toHaveBeenCalled();
    });
  });
}); 