// Moved from `dist/background.js` to the root directory.

chrome.runtime.onInstalled.addListener(() => {
  console.log('GitHub PR Summary extension installed.');
});