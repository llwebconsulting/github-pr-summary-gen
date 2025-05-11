// Manages the chrome.runtime.onMessage listener

import { getBranchInfo } from './branchInfo.js';
import { updatePRForm } from './dom.js';
import { processFiles } from './utils.js';
import { fetchCopilotSummary, fetchGitHubToken } from './api.js';

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Listener triggered with request:', request);
    if (request.action === 'generatePRSummary') {
      console.log('generatePRSummary action triggered');
      (async () => {
        try {
          const branchInfo = getBranchInfo();
          console.log('Branch info:', branchInfo);

          if (!branchInfo) {
            throw new Error('Could not determine branch information');
          }

          console.log('Input to processFiles:', branchInfo.files);
          const changes = processFiles(branchInfo.files);
          console.log('Changes:', changes);

          console.log('Calling fetchGitHubToken to retrieve token');
          const token = await fetchGitHubToken();
          console.log('Retrieved token:', token);

          const summary = await fetchCopilotSummary(token, changes);
          console.log('Summary:', summary);

          updatePRForm(summary);
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error in generatePRSummary:', error);
          sendResponse({ error: error.message });
        }
      })();
      return true;
    } else if (request.action === 'testMessage') {
      sendResponse({ success: true });
      return;
    } else {
      sendResponse({ success: false, error: 'Unhandled action' });
    }
  });
}

// Removed placeholder functions for `getChanges` and `generateSummary`.
