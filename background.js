// Moved from `dist/background.js` to the root directory.

chrome.runtime.onInstalled.addListener(() => {
  console.log('GitHub PR Summary extension installed.');

  chrome.storage.sync.get(['githubToken', 'openaiKey'], (settings) => {
    const { githubToken, openaiKey } = settings;

    if (!githubToken || !openaiKey) {
      chrome.windows.create({
        url: 'settings.html',
        type: 'popup',
        width: 400,
        height: 300
      });
    }
  });
});