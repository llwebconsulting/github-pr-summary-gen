const nock = require('nock');
const { fetchCopilotSummary } = require('../content/api');
const { TextEncoder, TextDecoder } = require('util');
const fetch = require('node-fetch');

// Ensure TextEncoder and TextDecoder are globally available
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.fetch = fetch;

describe('Integration Test: fetchCopilotSummary', () => {
  beforeAll(() => {
    nock('https://api.github.com')
      .post('/copilot/summary')
      .reply(200, { summary: 'This is a mocked summary response.' }, { 'Content-Type': 'application/json' });

    // Removed global.fetch mock to allow nock to intercept requests
  });

  beforeEach(() => {
    nock.cleanAll(); // Clear mocks before each test to avoid conflicts
  });

  afterEach(() => {
    nock.cleanAll(); // Clean up after each test
  });

  afterAll(() => {
    nock.cleanAll();
  });

  it('should throw an error for invalid input', async () => {
    await expect(fetchCopilotSummary(null, 'mocked-input')).rejects.toThrow('Invalid input: token and changesData are required.');
    await expect(fetchCopilotSummary('mocked-token', null)).rejects.toThrow('Invalid input: token and changesData are required.');
  });

  // Update the API error handling test to ensure proper interception
  it('should handle API errors gracefully', async () => {
    const scope = nock('https://api.github.com')
      .post('/copilot/generate-summary', { changes: 'mocked-input' })
      .matchHeader('Content-Type', 'application/json')
      .matchHeader('Authorization', 'token mocked-token')
      .reply(500, { message: 'Internal Server Error' });

    try {
      await fetchCopilotSummary('mocked-token', 'mocked-input');
    } catch (error) {
      console.log('Error caught during test:', error.message); // Debugging log
      expect(error.message).toBe('GitHub Copilot API error: Internal Server Error');
    }

    scope.done(); // Ensure the mock was used
  });

  // Update the request validation test to ensure correct headers and body
  it('should include correct headers and body in the request', async () => {
    const scope = nock('https://api.github.com')
      .post('/copilot/generate-summary', { changes: 'mocked-input' })
      .matchHeader('Content-Type', 'application/json')
      .matchHeader('Authorization', 'token mocked-token')
      .reply(200, { summary: 'This is a mocked summary response.' });

    const response = await fetchCopilotSummary('mocked-token', 'mocked-input');
    console.log('Response from mocked API:', response); // Debugging log
    expect(response.summary).toBe('This is a mocked summary response.');
    scope.done(); // Ensure the mock was used
  });

  it('should fetch a summary from the mocked API', async () => {
    const scope = nock('https://api.github.com', {
      reqheaders: {
        'Content-Type': 'application/json',
        'Authorization': 'token mocked-token',
        // Ignore other headers like user-agent and accept-encoding
      },
    })
      .post('/copilot/generate-summary', { changes: 'mocked-input' })
      .reply(200, { summary: 'This is a mocked summary response.' });

    const response = await fetchCopilotSummary('mocked-token', 'mocked-input');
    console.log('Response from mocked API:', response); // Debugging log
    expect(response.summary).toBe('This is a mocked summary response.');
    scope.done(); // Ensure the mock was used
  });
});
