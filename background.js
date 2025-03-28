// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  // Initialize any necessary storage or state
  chrome.storage.sync.get(['githubToken', 'openaiKey'], (result) => {
    if (!result.githubToken || !result.openaiKey) {
      // Open settings page on first install
      chrome.windows.create({
        url: 'settings.html',
        type: 'popup',
        width: 400,
        height: 300
      });
    }
  });
}); 