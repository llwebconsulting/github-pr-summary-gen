require('./setup.js');
const { getBranchInfo, getChanges, generateSummary, updatePRForm } = require('../content.js');

describe('getBranchInfo', () => {
  beforeEach(() => {
    // Reset window.location and document.title
    delete window.location;
    window.location = {
      href: '',
      pathname: ''
    };
    document.title = '';
  });

  it('should extract branch info from URL and title', () => {
    window.location.href = 'https://github.com/user/repo/compare/main...feature';
    window.location.pathname = '/user/repo/compare/main/feature';
    document.title = 'Comparing main...feature · user/repo';

    const result = getBranchInfo();
    expect(result).toEqual({
      base: 'main',
      head: 'main/feature'
    });
  });

  it('should handle branch names with slashes', () => {
    window.location.href = 'https://github.com/user/repo/compare/main...feature/new-branch';
    window.location.pathname = '/user/repo/compare/main/feature/new-branch';
    document.title = 'Comparing main...feature/new-branch · user/repo';

    const result = getBranchInfo();
    expect(result).toEqual({
      base: 'main',
      head: 'main/feature/new-branch'
    });
  });

  it('should return null when no branch info is found', () => {
    window.location.href = 'https://github.com/user/repo';
    window.location.pathname = '/user/repo';
    document.title = 'user/repo';

    const result = getBranchInfo();
    expect(result).toBeNull();
  });
});

describe('getChanges', () => {
  beforeEach(() => {
    global.fetch.mockClear();
    chrome.storage.sync.get.mockClear();
    document.body.innerHTML = '';
  });

  it('should fetch changes from GitHub API', async () => {
    const mockToken = 'mock-token';
    const mockDiff = 'mock diff content';
    const mockSha = 'mock-sha';
    
    // Add commit SHA meta tag
    const metaTag = document.createElement('meta');
    metaTag.setAttribute('name', 'octolytics-commit-sha');
    metaTag.setAttribute('content', mockSha);
    document.head.appendChild(metaTag);
    
    chrome.storage.sync.get.mockResolvedValue({ githubToken: mockToken });
    global.fetch.mockResolvedValueOnce({ 
      ok: true, 
      text: () => Promise.resolve(mockDiff)
    });

    const branchInfo = { base: 'main', head: 'feature' };
    const result = await getChanges(branchInfo);

    expect(result).toEqual({ diff: mockDiff });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw error when GitHub token is missing', async () => {
    chrome.storage.sync.get.mockResolvedValue({ githubToken: null });

    const branchInfo = { base: 'main', head: 'feature' };
    await expect(getChanges(branchInfo)).rejects.toThrow('GitHub token not found');
  });

  it('should throw error when API request fails', async () => {
    const mockSha = 'mock-sha';
    
    // Add commit SHA meta tag
    const metaTag = document.createElement('meta');
    metaTag.setAttribute('name', 'octolytics-commit-sha');
    metaTag.setAttribute('content', mockSha);
    document.head.appendChild(metaTag);
    
    chrome.storage.sync.get.mockResolvedValue({ githubToken: 'mock-token' });
    global.fetch.mockResolvedValueOnce({ 
      ok: false, 
      statusText: 'Not Found',
      text: () => Promise.resolve('Not Found'),
      json: () => Promise.resolve({ message: 'Not Found' })
    });

    const branchInfo = { base: 'main', head: 'feature' };
    await expect(getChanges(branchInfo)).rejects.toThrow('Failed to fetch diff from GitHub');
  });
});

describe('generateSummary', () => {
  beforeEach(() => {
    global.fetch.mockClear();
    chrome.storage.sync.get.mockClear();
  });

  it('should generate summary using OpenAI', async () => {
    const mockKey = 'mock-key';
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            title: 'Test Title',
            summary: 'Test Summary'
          })
        }
      }]
    };

    chrome.storage.sync.get.mockResolvedValue({ openaiKey: mockKey });
    global.fetch.mockResolvedValueOnce({ 
      ok: true, 
      json: () => Promise.resolve(mockResponse)
    });

    const changes = { diff: 'mock diff' };
    const result = await generateSummary(changes);

    expect(result).toEqual({
      title: 'Test Title',
      summary: 'Test Summary'
    });
  });

  it('should throw error when OpenAI key is missing', async () => {
    chrome.storage.sync.get.mockResolvedValue({ openaiKey: null });

    const changes = { diff: 'mock diff' };
    await expect(generateSummary(changes)).rejects.toThrow('OpenAI API key not found');
  });

  it('should handle malformed JSON response', async () => {
    chrome.storage.sync.get.mockResolvedValue({ openaiKey: 'mock-key' });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: 'Invalid JSON'
          }
        }]
      })
    });

    const changes = { diff: 'mock diff' };
    await expect(generateSummary(changes)).rejects.toThrow('Unexpected token \'I\', "Invalid JSON" is not valid JSON');
  });
});

describe('updatePRForm', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should update title and description fields', () => {
    // Create mock form elements
    const titleInput = document.createElement('input');
    titleInput.setAttribute('name', 'pull_request[title]');
    document.body.appendChild(titleInput);

    const descriptionInput = document.createElement('textarea');
    descriptionInput.setAttribute('name', 'pull_request[body]');
    document.body.appendChild(descriptionInput);

    const summary = {
      title: 'New Title',
      summary: 'New Description'
    };

    updatePRForm(summary);

    expect(titleInput.value).toBe('New Title');
    expect(descriptionInput.value).toBe('New Description');
  });

  it('should handle missing form elements gracefully', () => {
    const summary = {
      title: 'New Title',
      summary: 'New Description'
    };

    // Should not throw error when elements don't exist
    expect(() => updatePRForm(summary)).not.toThrow();
  });
}); 