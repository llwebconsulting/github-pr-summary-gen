// Handles logic for extracting branch information

export function getBranchInfo() {
  const url = window.location.href;
  const pathParts = window.location.pathname.split('/');
  const compareIndex = pathParts.indexOf('compare');

  if (compareIndex === -1) {
    return null;
  }

  const branchParts = pathParts.slice(compareIndex + 1).join('/').split('...');
  if (branchParts.length !== 2) {
    return null;
  }

  const [, head] = branchParts;
  const title = document.title;

  // Try to get base branch from title first
  const titleMatch = title.match(/Comparing ([^.]+)\.\.\./);

  if (titleMatch) {
    return { base: titleMatch[1], head };
  }

  // If title is not available, try to get base branch from URL
  const urlMatch = url.match(/compare\/([^.]+)\.\.\./);
  if (urlMatch) {
    return { base: urlMatch[1], head };
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
    return { base: baseBranchSelect.value, head };
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
