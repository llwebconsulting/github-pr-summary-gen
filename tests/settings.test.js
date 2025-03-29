const { dispatchEvent, flushPromises } = require('./test-utils');

// Mock chrome API
const chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

global.chrome = chrome;

describe('Settings', () => {
  beforeEach(() => {
    // Reset the DOM
    document.body.innerHTML = `
      <input type="text" id="githubToken" />
      <input type="text" id="openaiKey" />
      <button id="saveBtn">Save</button>
      <button id="backBtn">Back</button>
      <div id="status"></div>
    `;

    // Reset mocks
    jest.clearAllMocks();
    
    // Mock window.close
    window.close = jest.fn();

    // Default mock implementations
    chrome.storage.sync.get.mockResolvedValue({});
    chrome.storage.sync.set.mockResolvedValue();
  });

  describe('Initialization', () => {
    it('loads saved settings', async () => {
      // Setup
      const savedSettings = {
        githubToken: 'test-token',
        openaiKey: 'test-key'
      };
      chrome.storage.sync.get.mockResolvedValueOnce(savedSettings);

      // Initialize settings
      require('../settings.js');
      dispatchEvent('DOMContentLoaded');
      await flushPromises();

      // Assert
      expect(document.getElementById('githubToken').value).toBe(savedSettings.githubToken);
      expect(document.getElementById('openaiKey').value).toBe(savedSettings.openaiKey);
    });

    it('handles missing settings', async () => {
      // Setup
      chrome.storage.sync.get.mockResolvedValueOnce({});

      // Initialize settings
      require('../settings.js');
      dispatchEvent('DOMContentLoaded');
      await flushPromises();

      // Assert
      expect(document.getElementById('githubToken').value).toBe('');
      expect(document.getElementById('openaiKey').value).toBe('');
    });
  });

  describe('Save Button', () => {
    beforeEach(async () => {
      // Initialize settings
      require('../settings.js');
      dispatchEvent('DOMContentLoaded');
      await flushPromises();
    });

    it('saves settings when clicked', async () => {
      // Setup
      const testToken = 'new-test-token';
      const testKey = 'new-test-key';
      document.getElementById('githubToken').value = testToken;
      document.getElementById('openaiKey').value = testKey;

      // Act
      document.getElementById('saveBtn').click();
      await flushPromises();

      // Assert
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        githubToken: testToken,
        openaiKey: testKey
      });

      const statusDiv = document.getElementById('status');
      expect(statusDiv.textContent).toBe('Settings saved successfully!');
      expect(statusDiv.classList.contains('success')).toBe(true);
      expect(statusDiv.classList.contains('error')).toBe(false);
    });

    it('handles validation error', async () => {
      // Setup
      document.getElementById('githubToken').value = '';
      document.getElementById('openaiKey').value = '';

      // Act
      document.getElementById('saveBtn').click();
      await flushPromises();

      // Assert
      const statusDiv = document.getElementById('status');
      expect(statusDiv.textContent).toBe('Error saving settings: Please fill in all fields');
      expect(statusDiv.classList.contains('error')).toBe(true);
      expect(statusDiv.classList.contains('success')).toBe(false);
      expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    });

    it('handles save error', async () => {
      // Setup
      const testToken = 'new-test-token';
      const testKey = 'new-test-key';
      document.getElementById('githubToken').value = testToken;
      document.getElementById('openaiKey').value = testKey;
      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Save failed'));

      // Act
      document.getElementById('saveBtn').click();
      await flushPromises();

      // Assert
      const statusDiv = document.getElementById('status');
      expect(statusDiv.textContent).toBe('Error saving settings: Save failed');
      expect(statusDiv.classList.contains('error')).toBe(true);
      expect(statusDiv.classList.contains('success')).toBe(false);
    });
  });

  describe('Back Button', () => {
    it('closes window when clicked', async () => {
      // Setup
      require('../settings.js');
      dispatchEvent('DOMContentLoaded');
      await flushPromises();

      // Act
      document.getElementById('backBtn').click();

      // Assert
      expect(window.close).toHaveBeenCalled();
    });
  });
}); 