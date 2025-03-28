chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generatePRSummary') {
    // Return true to indicate we'll send a response asynchronously
    (async () => {
      try {
        const branchInfo = getBranchInfo();
        
        if (!branchInfo) {
          throw new Error('Could not determine branch information');
        }

        const changes = await getChanges(branchInfo);
        const summary = await generateSummary(changes);
        updatePRForm(summary);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
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
  
  // Try to get base branch from title first
  const titleMatch = title.match(/Comparing ([^.]+)\.\.\./);
  
  if (titleMatch) {
    const base = titleMatch[1];
    return { base, head };
  }

  // If title is not available, try to get base branch from URL
  const urlMatch = url.match(/compare\/([^.]+)\.\.\./);
  if (urlMatch) {
    const base = urlMatch[1];
    return { base, head };
  }

  // Try to get base branch from select element
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

  // Try to get base branch from URL parameters
  const baseBranchMatch = url.match(/[?&]base=([^&]+)/);
  
  if (baseBranchMatch) {
    return {
      base: baseBranchMatch[1],
      head
    };
  }
  
  return null;
}

async function checkTokenPermissions(token) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to check token permissions: ${errorData.message || response.statusText}`);
  }

  return true;
}

async function getChanges(branchInfo) {
  const settings = await chrome.storage.sync.get(['githubToken']);
  if (!settings.githubToken) {
    throw new Error('GitHub token not found. Please set it in settings.');
  }

  await checkTokenPermissions(settings.githubToken);

  const repo = window.location.pathname.split('/')[1] + '/' + window.location.pathname.split('/')[2];
  
  const encodedBase = encodeURIComponent(branchInfo.base);
  const encodedHead = encodeURIComponent(branchInfo.head);
  const apiUrl = `https://api.github.com/repos/${repo}/compare/${encodedBase}...${encodedHead}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `token ${settings.githubToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to fetch changes from GitHub: ${errorData.message || response.statusText}`);
  }

  const data = await response.json();
  
  // Helper function to truncate patches intelligently
  const truncatePatch = (patch, maxLines = 50) => {
    if (!patch) return '';
    const lines = patch.split('\n');
    
    // If patch is small enough, return as is
    if (lines.length <= maxLines) return patch;
    
    // Extract function/class definitions and important changes
    const importantLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('function ') ||
             trimmed.startsWith('class ') ||
             trimmed.startsWith('export ') ||
             trimmed.startsWith('import ') ||
             trimmed.startsWith('+ ') ||  // Added lines
             trimmed.startsWith('- ');     // Removed lines
    });
    
    // If we have important lines, prioritize them
    if (importantLines.length > 0) {
      if (importantLines.length <= maxLines) {
        return importantLines.join('\n');
      }
      // Take most important lines, prioritizing the beginning and end
      const halfMax = Math.floor(maxLines / 2);
      return [...importantLines.slice(0, halfMax), 
        '...truncated...',
        ...importantLines.slice(-halfMax)].join('\n');
    }
    
    // If no important lines found, take beginning and end of patch
    const halfMax = Math.floor(maxLines / 2);
    return [...lines.slice(0, halfMax),
      '...truncated...',
      ...lines.slice(-halfMax)].join('\n');
  };

  // Sort files by significance
  const sortedFiles = [...data.files].sort((a, b) => {
    // Prioritize files with more changes
    const aChanges = a.additions + a.deletions;
    const bChanges = b.additions + b.deletions;
    if (bChanges !== aChanges) return bChanges - aChanges;
    
    // For files with equal changes, prioritize source code files
    const isSourceFile = f => /\.(js|ts|jsx|tsx|py|java|cpp|go|rs|php)$/i.test(f.filename);
    return isSourceFile(b) - isSourceFile(a);
  });

  // Take top 15 most significant files
  const significantFiles = sortedFiles.slice(0, 15);
  
  // Create a structured summary of the changes
  const summary = {
    stats: {
      total_commits: data.total_commits,
      total_changes: data.files.length,
      additions: data.files.reduce((sum, file) => sum + file.additions, 0),
      deletions: data.files.reduce((sum, file) => sum + file.deletions, 0),
      changed_files: data.files.length,
      files_shown: 'Showing top 15 most significant files'
    },
    commits: data.commits
      .filter(commit => {
        const message = commit.commit.message.toLowerCase();
        // Filter out merge and rebase commits
        return !message.startsWith('merge') && 
               !message.includes('merge branch') &&
               !message.includes('merge pull request') &&
               !message.includes('merge remote-tracking branch') &&
               !message.startsWith('rebase') &&
               !message.includes('rebase branch');
      })
      .slice(-7)  // Take last 7 non-merge commits
      .map(commit => ({
        message: commit.commit.message,
        author: commit.commit.author.name
      })),
    files: significantFiles.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: truncatePatch(file.patch)
    }))
  };

  // Add note about truncated files if any
  if (data.files.length > 15) {
    summary.stats.note = `${data.files.length - 15} additional files not shown`;
  }

  return { diff: JSON.stringify(summary, null, 2) };
}

function generatePrompt(changesData) {
  return `You are a PR summary generator. Your task is to analyze the provided GitHub comparison data and generate a title and summary. Note that this is a curated selection of the most significant changes.

IMPORTANT: Your response MUST be valid JSON in the following format:
{
  "title": "Brief, descriptive title of the changes",
  "summary": "Detailed markdown summary of the changes"
}

Do not include any other text or formatting outside of this JSON structure.

The title should be concise but descriptive, following conventional PR title best practices.
The summary should include:
1. A high-level overview of the changes
2. Key technical details and implementation notes
3. Any important considerations or potential impacts
4. Testing notes if applicable
5. Any breaking changes or dependencies that need attention

Here is the structured comparison data to analyze:

Stats:
- Total commits: ${changesData.stats.total_commits}
- Files changed: ${changesData.stats.changed_files}
- Additions: ${changesData.stats.additions}
- Deletions: ${changesData.stats.deletions}
${changesData.stats.note ? `- Note: ${changesData.stats.note}` : ''}

Recent Commits:
${changesData.commits.map(commit => `- ${commit.message} (by ${commit.author})`).join('\n')}

Most Significant Files Changed:
${changesData.files.map(file => `
File: ${file.filename}
Status: ${file.status}
Changes: +${file.additions} -${file.deletions}
${file.patch ? '\nChanges:\n' + file.patch : ''}`).join('\n')}`;
}

async function generateSummary(changes) {
  const settings = await chrome.storage.sync.get(['openaiKey', 'model']);
  if (!settings.openaiKey) {
    throw new Error('OpenAI API key not found. Please set it in settings.');
  }

  const changesData = JSON.parse(changes.diff);
  const model = settings.model || 'chatgpt-4o-latest';

  const requestBody = {
    model,
    messages: [{
      role: 'user',
      content: generatePrompt(changesData)
    }],
    temperature: 0.7
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openaiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('OpenAI API Error:', {
      status: response.status,
      statusText: response.statusText,
      error
    });
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  try {
    const content = data.choices[0].message.content;
    const summary = JSON.parse(content);
    return summary;
  } catch (error) {
    console.error('Failed to parse summary:', error);
    console.error('Raw content:', data.choices[0].message.content);
    throw new Error('Failed to parse summary from OpenAI response');
  }
}

function updatePRForm(summary) {
  const titleSelectors = [
    'input[name="pull_request[title]"]',
    '#pull_request_title',
    'input[aria-label="Title"]'
  ];

  const descriptionSelectors = [
    'textarea[name="pull_request[body]"]',
    '#pull_request_body',
    'textarea[aria-label="Description"]'
  ];

  // Update title
  let titleInput = null;
  for (const selector of titleSelectors) {
    titleInput = document.querySelector(selector);
    if (titleInput) break;
  }

  if (titleInput) {
    titleInput.value = summary.title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    console.warn('No title input found');
  }

  // Update description
  let descriptionInput = null;
  for (const selector of descriptionSelectors) {
    descriptionInput = document.querySelector(selector);
    if (descriptionInput) break;
  }

  if (descriptionInput) {
    descriptionInput.value = summary.summary;
    descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    console.warn('No description input found');
  }
}