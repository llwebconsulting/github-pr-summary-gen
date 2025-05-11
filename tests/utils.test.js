import { processFiles } from '../content/utils.js';

describe('Utils Module', () => {
  test('processFiles processes file data correctly', () => {
    const files = [
      {
        filename: 'file1.js',
        status: 'modified',
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: '+ function test() {}\n- function oldTest() {}'
      },
      {
        filename: 'file2.js',
        status: 'added',
        additions: 20,
        deletions: 0,
        changes: 20,
        patch: '+ const value = 42;'
      }
    ];

    const result = processFiles(files);

    expect(result).toEqual([
      {
        filename: 'file1.js',
        status: 'modified',
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: '+ function test() {}\n- function oldTest() {}'
      },
      {
        filename: 'file2.js',
        status: 'added',
        additions: 20,
        deletions: 0,
        changes: 20,
        patch: '+ const value = 42;'
      }
    ]);
  });

  test('processFiles truncates patches exceeding maxLines', () => {
    const files = [
      {
        filename: 'file1.js',
        status: 'modified',
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: Array(60).fill('+ line').join('\n')
      }
    ];

    const result = processFiles(files);

    expect(result[0].patch.split('\n').length).toBeLessThanOrEqual(50);
    expect(result[0].patch).toContain('...truncated...');
  });
});
