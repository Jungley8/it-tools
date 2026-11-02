export interface CodeFile {
  path: string
  content: string
  size?: number
}

export interface PackOptions {
  format: 'xml' | 'markdown'
  includeFileTree: boolean
  instructionPrompt?: string
}

export const DEFAULT_PACK_OPTIONS: PackOptions = {
  format: 'xml',
  includeFileTree: true,
  instructionPrompt: 'The following is the codebase context for analysis and implementation.',
};

export const IGNORE_PATTERNS = [
  /(?:^|\/)\.git\//,
  /(?:^|\/)node_modules\//,
  /(?:^|\/)dist\//,
  /(?:^|\/)build\//,
  /(?:^|\/)\.next\//,
  /(?:^|\/)\.nuxt\//,
  /(?:^|\/)package-lock\.json$/,
  /(?:^|\/)pnpm-lock\.yaml$/,
  /(?:^|\/)bun\.lock$/,
  /(?:^|\/)\.DS_Store$/,
  /\.(?:png|jpg|jpeg|gif|ico|webp|mp4|webm|mp3|wav|woff2?|eot|ttf|zip|tar|gz|db|sqlite)$/i,
];

export function isIgnoredFile(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype', '.', '..']);

export function buildFileTreeAscii(paths: string[]): string {
  const tree: Record<string, unknown> = Object.create(null);

  for (const path of paths) {
    const parts = path.replace(/\\/g, '/').split('/').filter(p => Boolean(p) && !DANGEROUS_KEYS.has(p));
    let current = tree;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = Object.create(null);
      }
      current = current[part] as Record<string, unknown>;
    }
  }

  function renderTree(node: Record<string, unknown>, prefix = ''): string[] {
    const keys = Object.keys(node).sort();
    const lines: string[] = [];

    keys.forEach((key, index) => {
      const isLast = index === keys.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${connector}${key}`);

      const child = node[key] as Record<string, unknown>;
      if (child && Object.keys(child).length > 0) {
        lines.push(...renderTree(child, `${prefix}${isLast ? '    ' : '│   '}`));
      }
    });

    return lines;
  }

  return renderTree(tree).join('\n');
}

export function packCodebase(files: CodeFile[], options: Partial<PackOptions> = {}): {
  packedContent: string
  totalFiles: number
  totalChars: number
  estimatedTokens: number
} {
  const opts = { ...DEFAULT_PACK_OPTIONS, ...options };
  const validFiles = files.filter(f => !isIgnoredFile(f.path));

  const lines: string[] = [];

  if (opts.instructionPrompt) {
    lines.push(opts.instructionPrompt);
    lines.push('');
  }

  if (opts.includeFileTree && validFiles.length > 0) {
    lines.push('Directory Structure:');
    lines.push('```');
    lines.push(buildFileTreeAscii(validFiles.map(f => f.path)));
    lines.push('```');
    lines.push('');
  }

  for (const file of validFiles) {
    if (opts.format === 'xml') {
      lines.push(`<file path="${file.path}">`);
      lines.push(file.content);
      lines.push('</file>');
      lines.push('');
    }
    else {
      const ext = file.path.split('.').pop() || '';
      lines.push(`## File: ${file.path}`);
      lines.push(`\`\`\`${ext}`);
      lines.push(file.content);
      lines.push('```');
      lines.push('');
    }
  }

  const packedContent = lines.join('\n').trim();
  const totalChars = packedContent.length;
  const estimatedTokens = Math.ceil(totalChars / 3.4);

  return {
    packedContent,
    totalFiles: validFiles.length,
    totalChars,
    estimatedTokens,
  };
}
