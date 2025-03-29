document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const url = new URL(tab.url);
  const allowedHosts = ['github.com', 'www.github.com'];
  if (!allowedHosts.includes(url.host)) {
    document.getElementById('error').textContent = 'This extension only works on GitHub.';
    document.getElementById('error').style.display = 'block';
    document.getElementById('generate').disabled = true;
    return;
  }

  const generateButton = document.getElementById('generate');
  const settingsButton = document.getElementById('settings');
  let isGenerating = false;

  generateButton.addEventListener('click', async () => {
    if (isGenerating) {
      console.warn('Generation already in progress');
      return;
    }

    try {
      isGenerating = true;
      generateButton.disabled = true;
      generateButton.textContent = 'Generating...';
      document.getElementById('error').style.display = 'none';

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'generatePRSummary' });

      if (response.error) {
        throw new Error(response.error);
      }

      window.close();
    } catch (error) {
      console.error('Error in popup:', error);
      document.getElementById('error').textContent = error.message;
      document.getElementById('error').style.display = 'block';
    } finally {
      isGenerating = false;
      generateButton.disabled = false;
      generateButton.textContent = 'Generate Summary';
    }
  });

  settingsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}); 