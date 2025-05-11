// Includes utility functions

export function processFiles(files) {
  const truncatePatch = (patch, maxLines = 50) => {
    if (!patch) return '';
    const lines = patch.split('\n');
    if (lines.length <= maxLines) return patch;

    const importantLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('function ') ||
             trimmed.startsWith('class ') ||
             trimmed.startsWith('export ') ||
             trimmed.startsWith('import ') ||
             trimmed.startsWith('+ ') ||
             trimmed.startsWith('- ');
    });

    if (importantLines.length > 0) {
      const halfMax = Math.floor((maxLines - 1) / 2); // Adjust to account for the "...truncated..." line
      return [...importantLines.slice(0, halfMax), '...truncated...', ...importantLines.slice(-halfMax)].join('\n');
    }

    if (lines.length > maxLines) {
      const halfMax = Math.floor((maxLines - 1) / 2); // Adjust to account for the "...truncated..." line
      return [
        ...lines.slice(0, halfMax),
        '...truncated...',
        ...lines.slice(-halfMax)
      ].join('\n');
    }

    const halfMax = Math.floor((maxLines - 1) / 2); // Adjust to account for the "...truncated..." line
    return [...lines.slice(0, halfMax), '...truncated...', ...lines.slice(-halfMax)].join('\n');
  };

  return files.map(file => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: truncatePatch(file.patch)
  }));
}
