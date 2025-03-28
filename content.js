// Export functions for testing
exports.getBranchInfo = getBranchInfo;
exports.getChanges = getChanges;
exports.generateSummary = generateSummary;
exports.updatePRForm = updatePRForm;

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'generatePRSummary') {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const branchInfo = getBranchInfo();
      
      if (!branchInfo) {
        throw new Error('Could not determine branch information');
      }

      const changes = await getChanges(branchInfo);
      const summary = await generateSummary(changes);
      updatePRForm(summary);
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
});

function getBranchInfo() {
  const url = window.location.href;
  const pathParts = window.location.pathname.split('/');
  const compareIndex = pathParts.indexOf('compare');
  
  if (compareIndex === -1) {
    return null;
  }
  
  const head = pathParts.slice(compareIndex + 1).join('/');
  const title = document.title;
  
  const titleMatch = title.match(/Comparing ([^\.]+)\.\.\./);
  if (titleMatch) {
    const base = titleMatch[1];
    return { base, head };
  }

  const baseSelectors = [
    'select[name="pull_request[base]"]',
    'select[name="base"]',
    'select[aria-label="Base branch"]',
    'select[aria-label="base branch"]',
    'select[data-testid="base-branch-select"]',
    'select[data-testid="base-branch"]'
  ];

  let baseBranchSelect = null;
  for (const selector of baseSelectors) {
    baseBranchSelect = document.querySelector(selector);
    if (baseBranchSelect) break;
  }
  
  if (baseBranchSelect) {
    const base = baseBranchSelect.value;
    return { base, head };
  }

  const baseBranchMatch = url.match(/[?&]base=([^&]+)/);
  if (baseBranchMatch) {
    return {
      base: baseBranchMatch[1],
      head
    };
  }
  
  return null;
}

async function getChanges(branchInfo) {
  const settings = await chrome.storage.sync.get(['githubToken']);
  if (!settings.githubToken) {
    throw new Error('GitHub token not found. Please set it in settings.');
  }

  const repo = window.location.pathname.split('/')[1] + '/' + window.location.pathname.split('/')[2];
  
  try {
    // Get the commit SHA from the page source
    const commitSha = document.querySelector('meta[name="octolytics-commit-sha"]')?.content;
    if (!commitSha) {
      throw new Error('Could not find commit SHA in page source');
    }

    // Get the diff for that commit
    const diffResponse = await fetch(`https://api.github.com/repos/${repo}/commits/${commitSha}`, {
      headers: {
        'Authorization': `token ${settings.githubToken}`,
        'Accept': 'application/vnd.github.v3.diff'
      }
    });

    if (!diffResponse.ok) {
      const errorData = await diffResponse.json().catch(() => ({}));
      throw new Error(`Failed to fetch diff from GitHub: ${errorData.message || diffResponse.statusText}`);
    }

    const diff = await diffResponse.text();
    return { diff };
  } catch (error) {
    throw error;
  }
}

async function generateSummary(changes) {
  const settings = await chrome.storage.sync.get(['openaiKey']);
  if (!settings.openaiKey) {
    throw new Error('OpenAI API key not found. Please set it in settings.');
  }

  const prompt = `Generate a detailed and comprehensive title and summary for a GitHub pull request based on the following diff.

The title should be concise but descriptive, following conventional PR title best practices.
The summary should be thorough and include:
1. A high-level overview of the changes
2. Key technical details and implementation notes
3. Any important considerations or potential impacts
4. Testing notes if applicable
5. Any breaking changes or dependencies that need attention

Diff:
${changes.diff}

Please provide the response in JSON format with "title" and "summary" fields. The summary should be well-structured and easy to read.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate summary using OpenAI');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

function updatePRForm(summary) {
  const titleSelectors = [
    'input[name="pull_request[title]"]',
    '#pull_request_title',
    'input[aria-label="Title"]'
  ];
  
  let titleInput = null;
  for (const selector of titleSelectors) {
    titleInput = document.querySelector(selector);
    if (titleInput) break;
  }
  
  if (titleInput) {
    titleInput.value = summary.title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const descriptionSelectors = [
    'textarea[name="pull_request[body]"]',
    '#pull_request_body',
    'textarea[aria-label="Description"]'
  ];
  
  let descriptionInput = null;
  for (const selector of descriptionSelectors) {
    descriptionInput = document.querySelector(selector);
    if (descriptionInput) break;
  }
  
  if (descriptionInput) {
    descriptionInput.value = summary.summary;
    descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
    descriptionInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
} 