import { getBranchInfo } from './content/branchInfo.js';
import { updatePRForm } from './content/dom.js';
import { processFiles } from './content/utils.js';
import { fetchCopilotSummary } from './content/api.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generatePRSummary') {
    // Return true to indicate we'll send a response asynchronously
    (async () => {
      try {
        const branchInfo = getBranchInfo();

        if (!branchInfo) {
          throw new Error('Could not determine branch information');
        }

        const changes = processFiles(branchInfo.files);
        const summary = await fetchCopilotSummary(branchInfo.token, changes);
        updatePRForm(summary);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }
});