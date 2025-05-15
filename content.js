(async () => {
  const branchInfoUrl = chrome.runtime.getURL('content/branchInfo.js');
  const domUrl = chrome.runtime.getURL('content/dom.js');
  const utilsUrl = chrome.runtime.getURL('content/utils.js');
  const apiUrl = chrome.runtime.getURL('content/api.js');

  const { getBranchInfo } = await import(branchInfoUrl);
  const { updatePRForm } = await import(domUrl);
  const { processFiles } = await import(utilsUrl);
  const { fetchCopilotSummary, fetchGitHubToken, fetchBranchComparison } = await import(apiUrl);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generatePRSummary') {
      // Return true to indicate we'll send a response asynchronously
      (async () => {
        try {
          const branchInfo = getBranchInfo();

          if (!branchInfo) {
            throw new Error('Could not determine branch information');
          }

          // Get repo name from URL
          const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)/);
          if (!match) {
            throw new Error('Could not determine repository name from URL');
          }
          const repo = `${match[1]}/${match[2]}`;

          // Get token
          const token = await fetchGitHubToken();

          // Fetch changed files from GitHub API
          const comparison = await fetchBranchComparison(repo, branchInfo.base, branchInfo.head, token);
          if (!comparison.files) {
            throw new Error('No changed files found in branch comparison');
          }

          // Process files and get summary
          const changes = processFiles(comparison.files);
          const summary = await fetchCopilotSummary(token, changes);
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