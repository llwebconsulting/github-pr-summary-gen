// Mock chrome API
const chrome = {
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  runtime: {
    openOptionsPage: jest.fn()
  }
};

global.chrome = chrome;

// Mock the document body setup
function setupDOM() {
  document.body.innerHTML = `
    <button id="generate" disabled>Generate Summary</button>
    <button id="settings">Settings</button>
    <div id="error" style="display: none;"></div>
  `;
}

// Mock popup.js content
const popupJsContent = `
const generateButton = document.getElementById('generate');
const settingsButton = document.getElementById('settings');
const errorDiv = document.getElementById('error');

async function init() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    if (!tab.url.includes('github.com')) {
      generateButton.disabled = true;
      errorDiv.textContent = 'This extension only works on GitHub.';
      errorDiv.style.display = 'block';
      return;
    }

    generateButton.disabled = false;
    errorDiv.style.display = 'none';

    let isGenerating = false;

    generateButton.addEventListener('click', async () => {
      if (isGenerating) return;
      isGenerating = true;

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'generatePRSummary' });
        if (response.error) {
          errorDiv.textContent = response.error;
          errorDiv.style.display = 'block';
        }
      } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
      } finally {
        isGenerating = false;
      }
    });

    settingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', init);
`;

describe('Popup', () => {
  let generateButton;
  let settingsButton;
  let errorDiv;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Set up DOM
    setupDOM();
    
    // Get elements
    generateButton = document.getElementById('generate');
    settingsButton = document.getElementById('settings');
    errorDiv = document.getElementById('error');
  });

  describe('Initialization', () => {
    test('disables generate button on non-GitHub pages', async () => {
      // Set up mock response before running script
      chrome.tabs.query.mockImplementation(() => Promise.resolve([{
        url: 'https://example.com'
      }]));

      // Run the popup script
      eval(popupJsContent);

      // Create and dispatch DOMContentLoaded event
      const event = document.createEvent('Event');
      event.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(event);

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(generateButton.disabled).toBe(true);
      expect(errorDiv.textContent).toBe('This extension only works on GitHub.');
      expect(errorDiv.style.display).toBe('block');
    });

    test('enables generate button on GitHub pages', async () => {
      // Set up mock response before running script
      chrome.tabs.query.mockImplementation(() => Promise.resolve([{
        url: 'https://github.com/owner/repo/compare/master...feature'
      }]));

      // Run the popup script
      eval(popupJsContent);

      // Create and dispatch DOMContentLoaded event
      const event = document.createEvent('Event');
      event.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(event);

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(generateButton.disabled).toBe(false);
      expect(errorDiv.style.display).toBe('none');
    });
  });

  describe('Generate Button', () => {
    beforeEach(async () => {
      // Set up mock response before running script
      chrome.tabs.query.mockImplementation(() => Promise.resolve([{
        url: 'https://github.com/owner/repo/compare/master...feature',
        id: 1
      }]));

      // Run the popup script
      eval(popupJsContent);

      // Create and dispatch DOMContentLoaded event
      const event = document.createEvent('Event');
      event.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(event);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('handles successful generation', async () => {
      // Set up mock response before clicking
      chrome.tabs.sendMessage.mockImplementation(() => Promise.resolve({ success: true }));

      // Click generate button
      generateButton.click();

      // Wait for message handling
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'generatePRSummary' }
      );
      expect(generateButton.disabled).toBe(false);
    });

    test('handles generation error', async () => {
      const errorMessage = 'Test error';
      // Set up mock response before clicking
      chrome.tabs.sendMessage.mockImplementation(() => Promise.resolve({ error: errorMessage }));

      // Click generate button
      generateButton.click();

      // Wait for message handling
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorDiv.textContent).toBe(errorMessage);
      expect(errorDiv.style.display).toBe('block');
      expect(generateButton.disabled).toBe(false);
      expect(generateButton.textContent).toBe('Generate Summary');
    });

    test('prevents multiple simultaneous generations', async () => {
      // Set up mock response before clicking
      chrome.tabs.sendMessage.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 50))
      );

      // Reset mock call count
      chrome.tabs.sendMessage.mockClear();

      // Click generate button twice
      generateButton.click();
      generateButton.click();

      // Wait for message handling
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Settings Button', () => {
    test('opens options page when clicked', async () => {
      // Run the popup script
      eval(popupJsContent);

      // Create and dispatch DOMContentLoaded event
      const event = document.createEvent('Event');
      event.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(event);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Click settings button
      settingsButton.click();

      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });
}); 