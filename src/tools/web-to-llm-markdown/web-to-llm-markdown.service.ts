export interface WebToMarkdownOptions {
  stripImages: boolean
  stripLinks: boolean
  compactBlankLines: boolean
}

export const DEFAULT_WEB_TO_MD_OPTIONS: WebToMarkdownOptions = {
  stripImages: false,
  stripLinks: false,
  compactBlankLines: true,
};

export interface CleanedMarkdownResult {
  markdown: string
  originalChars: number
  cleanedChars: number
  savedPercent: number
  estimatedSavedTokens: number
}

/**
 * Converts raw HTML into high-density, clean Markdown for LLMs.
 * Removes bloated scripts, styles, SVGs, base64 images, and layout tags.
 */
export function convertHtmlToLlmMarkdown(
  html: string,
  options: Partial<WebToMarkdownOptions> = {},
): CleanedMarkdownResult {
  if (!html || !html.trim()) {
    return {
      markdown: '',
      originalChars: 0,
      cleanedChars: 0,
      savedPercent: 0,
      estimatedSavedTokens: 0,
    };
  }

  const opts = { ...DEFAULT_WEB_TO_MD_OPTIONS, ...options };
  let processed = html;

  // 1. Remove dangerous or non-content tags completely
  processed = processed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  processed = processed.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  processed = processed.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
  processed = processed.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
  processed = processed.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  processed = processed.replace(/<canvas\b[^<]*(?:(?!<\/canvas>)<[^<]*)*<\/canvas>/gi, '');
  processed = processed.replace(/<!--[\s\S]*?-->/g, ''); // Comments

  // 2. Pre-formatted code blocks
  processed = processed.replace(/<pre[^>]*><code[^>]*class="language-([^"]+)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```$1\n$2\n```\n');
  processed = processed.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
  processed = processed.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n');
  processed = processed.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // 3. Headings
  processed = processed.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  processed = processed.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  processed = processed.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  processed = processed.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  processed = processed.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  processed = processed.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

  // 4. Blockquotes
  processed = processed.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');

  // 5. Lists
  processed = processed.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  processed = processed.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  // 6. Emphasis
  processed = processed.replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  processed = processed.replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  // 7. Links
  if (opts.stripLinks) {
    processed = processed.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  }
  else {
    processed = processed.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  }

  // 8. Images
  if (opts.stripImages) {
    processed = processed.replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gi, '[Image: $1]');
    processed = processed.replace(/<img\b[^>]*>/gi, '');
  }
  else {
    // Strip giant base64 data URIs
    processed = processed.replace(/<img\b[^>]*src=["']data:image\/[^"']+["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '[Image: $1]');
    processed = processed.replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/gi, '![$1]($2)');
    processed = processed.replace(/<img\b[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)');
    processed = processed.replace(/<img\b[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)');
  }

  // 9. Paragraphs and Line Breaks
  processed = processed.replace(/<br\s*\/?>/gi, '\n');
  processed = processed.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
  processed = processed.replace(/<hr\s*\/?>/gi, '\n---\n');

  // 10. Strip remaining HTML tags
  processed = processed.replace(/<[^>]+>/g, '');

  // 11. Decode common HTML entities
  processed = processed
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'');

  // 12. Compact whitespace
  if (opts.compactBlankLines) {
    // Remove lines with only spaces
    processed = processed.replace(/[ \t]+$/gm, '');
    // Collapse 3 or more newlines into 2
    processed = processed.replace(/\n{3,}/g, '\n\n');
  }

  const markdown = processed.trim();
  const originalChars = html.length;
  const cleanedChars = markdown.length;
  const savedPercent = originalChars > 0 ? Number((((originalChars - cleanedChars) / originalChars) * 100).toFixed(1)) : 0;
  const estimatedSavedTokens = Math.max(0, Math.round((originalChars - cleanedChars) / 3.6));

  return {
    markdown,
    originalChars,
    cleanedChars,
    savedPercent: Math.max(0, savedPercent),
    estimatedSavedTokens,
  };
}
