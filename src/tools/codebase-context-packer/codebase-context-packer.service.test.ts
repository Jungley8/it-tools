import { describe, expect, it } from 'vitest';
import {
  buildFileTreeAscii,
  isIgnoredFile,
  packCodebase,
} from './codebase-context-packer.service';

describe('codebase-context-packer service', () => {
  it('should ignore binary files, node_modules, and git directories', () => {
    expect(isIgnoredFile('node_modules/vue/package.json')).toBe(true);
    expect(isIgnoredFile('.git/HEAD')).toBe(true);
    expect(isIgnoredFile('assets/logo.png')).toBe(true);
    expect(isIgnoredFile('pnpm-lock.yaml')).toBe(true);
    expect(isIgnoredFile('src/main.ts')).toBe(false);
  });

  it('should generate ASCII file tree structure', () => {
    const paths = ['src/index.ts', 'src/utils/math.ts', 'README.md'];
    const tree = buildFileTreeAscii(paths);

    expect(tree).toContain('README.md');
    expect(tree).toContain('src');
    expect(tree).toContain('math.ts');
  });

  it('should pack multiple files into XML format', () => {
    const files = [
      { path: 'src/main.ts', content: 'console.log("hello");' },
      { path: 'src/config.ts', content: 'export const env = "prod";' },
    ];

    const result = packCodebase(files, { format: 'xml' });

    expect(result.totalFiles).toBe(2);
    expect(result.packedContent).toContain('<file path="src/main.ts">');
    expect(result.packedContent).toContain('console.log("hello");');
    expect(result.packedContent).toContain('Directory Structure:');
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it('should pack multiple files into Markdown format', () => {
    const files = [
      { path: 'src/app.py', content: 'print("hello")' },
    ];

    const result = packCodebase(files, { format: 'markdown' });

    expect(result.packedContent).toContain('## File: src/app.py');
    expect(result.packedContent).toContain('```py\nprint("hello")\n```');
  });
});
