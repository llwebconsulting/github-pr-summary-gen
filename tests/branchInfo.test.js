import { getBranchInfo } from '../content/branchInfo.js';

// Mock window.location
const originalLocation = window.location;
delete window.location;
window.location = {
  href: '',
  pathname: '',
};

describe('BranchInfo Module', () => {
  beforeEach(() => {
    document.title = '';
    window.location.href = '';
    window.location.pathname = '';
  });

  afterAll(() => {
    window.location = originalLocation; // Restore original location
  });

  test('getBranchInfo extracts branch info from compare URL', () => {
    document.title = 'Comparing main...feature · user/repo';
    window.location.href = 'https://github.com/user/repo/compare/main...feature';
    window.location.pathname = '/user/repo/compare/main...feature';

    const branchInfo = getBranchInfo();
    expect(branchInfo).toEqual({ base: 'main', head: 'feature' });
  });

  test('getBranchInfo returns null if compare URL is invalid', () => {
    window.location.pathname = '/user/repo/compare/invalid';

    const branchInfo = getBranchInfo();
    expect(branchInfo).toBeNull();
  });

  test('getBranchInfo extracts base branch from title if available', () => {
    document.title = 'Comparing develop...feature · user/repo';
    window.location.pathname = '/user/repo/compare/main...feature';

    const branchInfo = getBranchInfo();
    expect(branchInfo).toEqual({ base: 'develop', head: 'feature' });
  });

  test('getBranchInfo extracts base branch from URL if title is unavailable', () => {
    window.location.href = 'https://github.com/user/repo/compare/main...feature';
    window.location.pathname = '/user/repo/compare/main...feature';

    const branchInfo = getBranchInfo();
    expect(branchInfo).toEqual({ base: 'main', head: 'feature' });
  });

  test('getBranchInfo returns null if no valid branch info is found', () => {
    window.location.pathname = '/user/repo/invalid-path';

    const branchInfo = getBranchInfo();
    expect(branchInfo).toBeNull();
  });
});
