const { dispatchEvent, flushPromises } = require('./test-utils');

// Mock Chrome API
const mockChrome = {
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  runtime: {
    openOptionsPage: jest.fn()
  }
};

global.chrome = mockChrome;

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

describe('Popup', () => {
  let generateButton;
  let settingsButton;
  let errorElement;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <button id="generate">Generate Summary</button>
      <button id="settings">Settings</button>
      <div id="error" style="display: none;"></div>
    `;

    // Get DOM elements
    generateButton = document.getElementById('generate');
    settingsButton = document.getElementById('settings');
    errorElement = document.getElementById('error');

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('disables generate button on non-GitHub pages', async () => {
      // Arrange
      mockChrome.tabs.query.mockResolvedValue([{
        url: 'https://example.com'
      }]);

      // Act
      require('../popup');
      dispatchEvent('DOMContentLoaded');
      await flushPromises();

      // Assert
      expect(generateButton.disabled).toBe(true);
      expect(errorElement.textContent).toBe('This extension only works on GitHub.');
      expect(errorElement.style.display).toBe('block');
    });

    it('enables generate button on GitHub pages', async () => {
      // Arrange
      mockChrome.tabs.query.mockResolvedValue([{
        url: 'https://github.com/user/repo'
      }]);

      // Act
      require('../popup');
      dispatchEvent('DOMContentLoaded');
      await flushPromises();

      // Assert
      expect(generateButton.disabled).toBe(false);
      expect(errorElement.style.display).toBe('none');
    });
  });

  describe('Generate Button', () => {
    beforeEach(async () => {
      // Setup GitHub environment
      mockChrome.tabs.query.mockResolvedValue([{
        id: 1,
        url: 'https://github.com/user/repo'
      }]);

      require('../popup');
      dispatchEvent('DOMContentLoaded');
      await flushPromises();
    });

    it('prevents multiple simultaneous generations', async () => {
      // Arrange
      mockChrome.tabs.sendMessage.mockImplementation(() => new Promise(() => {})); // Never resolves

      // Act
      generateButton.click();
      generateButton.click();

      // Assert
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('handles successful generation', async () => {
      // Arrange
      mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });
      const closeSpy = jest.spyOn(window, 'close').mockImplementation();

      // Act
      generateButton.click();
      await flushPromises();

      // Assert
      expect(closeSpy).toHaveBeenCalled();
      expect(errorElement.style.display).toBe('none');
    });

    it('handles error response from content script', async () => {
      // Arrange
      mockChrome.tabs.sendMessage.mockResolvedValue({ error: 'Test error' });

      // Act
      generateButton.click();
      await flushPromises();

      // Assert
      expect(generateButton.disabled).toBe(false);
      expect(generateButton.textContent).toBe('Generate Summary');
      expect(errorElement.textContent).toBe('Test error');
      expect(errorElement.style.display).toBe('block');
    });

    it('handles exceptions', async () => {
      // Arrange
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Test exception'));

      // Act
      generateButton.click();
      await flushPromises();

      // Assert
      expect(generateButton.disabled).toBe(false);
      expect(generateButton.textContent).toBe('Generate Summary');
      expect(errorElement.textContent).toBe('Test exception');
      expect(errorElement.style.display).toBe('block');
    });
  });

  describe('Settings Button', () => {
    beforeEach(async () => {
      // Setup GitHub environment
      mockChrome.tabs.query.mockResolvedValue([{
        url: 'https://github.com/user/repo'
      }]);

      require('../popup');
      dispatchEvent('DOMContentLoaded');
      await flushPromises();
    });

    it('opens options page', () => {
      // Act
      settingsButton.click();

      // Assert
      expect(mockChrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });
}); 