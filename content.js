(async () => {
  const branchInfoUrl = chrome.runtime.getURL('content/branchInfo.js');
  const domUrl = chrome.runtime.getURL('content/dom.js');
  const utilsUrl = chrome.runtime.getURL('content/utils.js');
  const apiUrl = chrome.runtime.getURL('content/api.js');

  const { getBranchInfo } = await import(branchInfoUrl);
  const { updatePRForm } = await import(domUrl);
  const { processFiles } = await import(utilsUrl);
  const { fetchCopilotSummary } = await import(apiUrl);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generatePRSummary') {
      // Return true to indicate we'll send a response asynchronously
      (async () => {
        try {
          const branchInfo = getBranchInfo();

          if (!branchInfo) {
            throw new Error('Could not determine branch information');
          }

          const changes = await processFiles(branchInfo);
          const summary = await fetchCopilotSummary(changes);
          updatePRForm(summary);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ error: error.message });
        }
      })();
      return true;
    }
  });
})();