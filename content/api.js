// Handles all API-related logic

export async function fetchGitHubToken() {
  console.log('fetchGitHubToken invoked');
  const settings = await chrome.storage.sync.get(['githubToken']);
  console.log('Value retrieved from chrome.storage.sync.get:', settings);
  console.log('Retrieved GitHub token:', settings.githubToken);
  if (!settings.githubToken) {
    throw new Error('GitHub token not found. Please set it in settings.');
  }
  return settings.githubToken;
}

export async function checkTokenPermissions(token) {
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

export async function fetchBranchComparison(repo, base, head, token) {
  const apiUrl = `https://api.github.com/repos/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to fetch changes from GitHub: ${errorData.message || response.statusText}`);
  }

  return response.json();
}

export async function fetchCopilotSummary(token, changesData) {
  console.log('fetchCopilotSummary invoked with token:', token);

  if (!token || !changesData) {
    throw new Error('Invalid input: token and changesData are required.');
  }

  const response = await fetch('https://api.github.com/copilot/generate-summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${token}`,
      'Accept': 'application/json', // Explicitly set Accept header
    },
    body: JSON.stringify({
      changes: changesData
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`GitHub Copilot API error: ${errorData.message || response.statusText}`);
  }

  return response.json();
}
