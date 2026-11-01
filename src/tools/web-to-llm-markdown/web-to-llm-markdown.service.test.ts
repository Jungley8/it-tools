import { describe, expect, it } from 'vitest';
import { convertHtmlToLlmMarkdown } from './web-to-llm-markdown.service';

describe('web-to-llm-markdown service', () => {
  it('should clean scripts, styles and convert headings and links', () => {
    const html = `
      <html>
        <head>
          <style>.ad { color: red; }</style>
          <script>console.log("tracker");</script>
        </head>
        <body>
          <h1>Documentation Title</h1>
          <p>Welcome to the <strong>API</strong> guide. Read the <a href="https://example.com/docs">docs</a>.</p>
          <pre><code class="language-ts">const a = 1;</code></pre>
        </body>
      </html>
    `;

    const result = convertHtmlToLlmMarkdown(html);

    expect(result.markdown).toContain('# Documentation Title');
    expect(result.markdown).toContain('**API**');
    expect(result.markdown).toContain('[docs](https://example.com/docs)');
    expect(result.markdown).toContain('```ts\nconst a = 1;\n```');
    expect(result.markdown).not.toContain('console.log');
    expect(result.markdown).not.toContain('<style>');
    expect(result.savedPercent).toBeGreaterThan(0);
  });

  it('should strip giant base64 data URLs in images', () => {
    const html = '<p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="Tiny Pixel" /></p>';
    const result = convertHtmlToLlmMarkdown(html);

    expect(result.markdown).toContain('[Image: Tiny Pixel]');
    expect(result.markdown).not.toContain('data:image/png');
  });
});
