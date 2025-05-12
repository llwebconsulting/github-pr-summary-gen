// Moved from `dist/popup.js` to the root directory.

document.addEventListener('DOMContentLoaded', async () => {
  const generateButton = document.getElementById('generate');
  const settingsButton = document.getElementById('settingsBtn');
  const errorElement = document.getElementById('error');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('github.com')) {
      generateButton.disabled = true;
      errorElement.textContent = 'This extension only works on GitHub.';
      errorElement.style.display = 'block';
      return;
    }

    generateButton.disabled = false;
    errorElement.style.display = 'none';

    generateButton.addEventListener('click', async () => {
      generateButton.disabled = true;
      generateButton.textContent = 'Generating...';

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'generatePRSummary' });
        if (response.success) {
          window.close();
        } else if (response.error) {
          errorElement.textContent = response.error;
          errorElement.style.display = 'block';
        }
      } catch (error) {
        errorElement.textContent = error.message || 'An error occurred.';
        errorElement.style.display = 'block';
      } finally {
        generateButton.textContent = 'Generate Summary';
        generateButton.disabled = false;
      }
    });

    settingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  } catch (error) {
    errorElement.textContent = error.message || 'Failed to initialize popup.';
    errorElement.style.display = 'block';
  }
});