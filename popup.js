document.addEventListener('DOMContentLoaded', async () => {
  const generateBtn = document.getElementById('generateBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const status = document.getElementById('status');

  // Check if we're on a GitHub PR creation page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('Current tab:', tab);
  
  const isGitHubPRPage = tab.url.includes('github.com') && 
    (tab.url.includes('/compare/') || tab.url.includes('/pull/new'));

  if (isGitHubPRPage) {
    generateBtn.disabled = false;
    status.textContent = 'Ready to generate PR summary';
  } else {
    generateBtn.disabled = true;
    status.textContent = 'Please navigate to a GitHub PR creation page';
    status.classList.add('error');
  }

  generateBtn.addEventListener('click', async () => {
    try {
      status.textContent = 'Generating PR summary...';
      status.classList.remove('error', 'success');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Sending message to tab:', tab.id);
      
      // First, ensure the content script is injected
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      // Then send the message
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'generatePRSummary' });
      console.log('Received response:', response);
      
      if (response && response.error) {
        throw new Error(response.error);
      }
      
      status.textContent = 'PR summary generated successfully!';
      status.classList.add('success');
    } catch (error) {
      console.error('Error in popup:', error);
      status.textContent = 'Error generating PR summary: ' + error.message;
      status.classList.add('error');
    }
  });

  settingsBtn.addEventListener('click', () => {
    chrome.windows.create({
      url: 'settings.html',
      type: 'popup',
      width: 400,
      height: 300
    });
  });
}); 