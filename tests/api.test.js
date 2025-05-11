import { fetchGitHubToken, checkTokenPermissions, fetchBranchComparison, fetchCopilotSummary } from '../content/api.js';

describe('API Module', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn()
        }
      }
    };
  });

  test('fetchGitHubToken retrieves token from storage', async () => {
    global.chrome.storage.sync.get.mockResolvedValue({ githubToken: 'test-token' });

    const token = await fetchGitHubToken();
    expect(token).toBe('test-token');
    expect(global.chrome.storage.sync.get).toHaveBeenCalledWith(['githubToken']);
  });

  test('fetchGitHubToken throws error if token is missing', async () => {
    global.chrome.storage.sync.get.mockResolvedValue({});

    await expect(fetchGitHubToken()).rejects.toThrow('GitHub token not found. Please set it in settings.');
  });

  test('checkTokenPermissions validates token permissions', async () => {
    global.fetch.mockResolvedValue({
      ok: true
    });

    const result = await checkTokenPermissions('test-token');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/user', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'token test-token'
      })
    }));
  });

  test('checkTokenPermissions throws error on invalid token', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'Bad credentials' })
    });

    await expect(checkTokenPermissions('invalid-token')).rejects.toThrow('Failed to check token permissions: Bad credentials');
  });

  test('fetchBranchComparison fetches branch comparison data', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ files: [] })
    });

    const result = await fetchBranchComparison('user/repo', 'main', 'feature', 'test-token');
    expect(result).toEqual({ files: [] });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/user/repo/compare/main...feature',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'token test-token'
        })
      })
    );
  });

  test('fetchCopilotSummary fetches summary from GitHub Copilot API', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ title: 'Test Title', summary: 'Test Summary' })
    });

    const result = await fetchCopilotSummary('test-token', []); // Pass changes array directly
    expect(result).toEqual({ title: 'Test Title', summary: 'Test Summary' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/copilot/generate-summary',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'token test-token'
        }),
        body: JSON.stringify({ changes: [] }) // Match the expected structure
      })
    );
  });

  test('fetchCopilotSummary throws error on API failure', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'Rate limit exceeded' })
    });

    await expect(fetchCopilotSummary('test-token', { changes: [] })).rejects.toThrow('GitHub Copilot API error: Rate limit exceeded');
  });
});
