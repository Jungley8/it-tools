import { beforeEach, describe, expect, it } from 'vitest';
import { WebMCPRegistry } from './webmcp.service';
import { installWebMCPBridge } from './webmcp-bridge';

describe('WebMCPRegistry & Two-Stage Discovery', () => {
  let registry: WebMCPRegistry;

  beforeEach(() => {
    registry = new WebMCPRegistry();
  });

  it('initializes with global meta-tools on root route', () => {
    registry.setRoute('/');
    const active = registry.getActiveTools();
    const names = active.map(t => t.name);

    expect(names).toContain('search_tools');
    expect(names).toContain('execute_tool');
    expect(active.length).toBe(2);
  });

  it('performs progressive discovery via search_tools', async () => {
    const res = await registry.callTool('search_tools', { query: 'token' });
    expect(res.ok).toBe(true);
    expect(res.result.totalMatched).toBeGreaterThan(0);

    const matchNames = res.result.tools.map((t: any) => t.name);
    expect(matchNames).toContain('token_calculator');
  });

  it('filters catalog tools by category and directly-executable flag', async () => {
    const res = await registry.callTool('search_tools', {
      category: 'Crypto',
      directlyExecutableOnly: true,
    });
    expect(res.ok).toBe(true);
    const tools = res.result.tools;
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((t: any) => t.category === 'Crypto' && t.isDirectlyExecutable)).toBe(true);
  });

  describe('Route-Scoped Just-In-Time Injection', () => {
    it('injects tool when navigating to its route and unmounts on leaving', () => {
      registry.setRoute('/');
      expect(registry.getActiveTools().map(t => t.name)).not.toContain('token_calculator');

      registry.setRoute('/token-calculator');
      const activeOnCalculator = registry.getActiveTools().map(t => t.name);
      expect(activeOnCalculator).toContain('token_calculator');
      expect(activeOnCalculator).toContain('search_tools');

      registry.setRoute('/hash-text');
      const activeOnHash = registry.getActiveTools().map(t => t.name);
      expect(activeOnHash).not.toContain('token_calculator');
      expect(activeOnHash).toContain('hash_text');

      registry.setRoute('/about');
      const activeOnAbout = registry.getActiveTools().map(t => t.name);
      expect(activeOnAbout).not.toContain('hash_text');
      expect(activeOnAbout.length).toBe(2);
    });
  });

  describe('Direct Execution of Core Tools', () => {
    it('executes token_calculator with cost estimation', async () => {
      const res = await registry.callTool('token_calculator', {
        text: 'Analyze the system architecture of our microservices.',
      });
      expect(res.ok).toBe(true);
      expect(res.result.stats.characters).toBeGreaterThan(0);
      expect(res.result.stats.baseTokens).toBeGreaterThan(0);
      expect(res.result.estimates.length).toBeGreaterThan(0);
    });

    it('executes prompt_redactor and restores tokens', async () => {
      const prompt = 'Secret API key: sk-abcdef1234567890abcdef1234567890 for test.';
      const redactRes = await registry.callTool('prompt_redactor', {
        text: prompt,
        action: 'redact',
      });
      expect(redactRes.ok).toBe(true);
      expect(redactRes.result.redactedText).toContain('{{REDACTED_API_KEY_1}}');
      expect(redactRes.result.stats.apiKeys).toBe(1);

      const restoreRes = await registry.callTool('prompt_redactor', {
        text: redactRes.result.redactedText,
        action: 'restore',
        mappings: redactRes.result.mappings,
      });
      expect(restoreRes.ok).toBe(true);
      expect(restoreRes.result.restoredText).toBe(prompt);
    });

    it('executes web_to_llm_markdown stripping noise', async () => {
      const html = '<h1>Doc Title</h1><p>Clean text</p><script>alert("ignore");</script>';
      const res = await registry.callTool('web_to_llm_markdown', { html });
      expect(res.ok).toBe(true);
      expect(res.result.markdown).toContain('# Doc Title');
      expect(res.result.markdown).toContain('Clean text');
      expect(res.result.markdown).not.toContain('alert');
    });

    it('executes mcp_tool_generator to create schemas', async () => {
      const res = await registry.callTool('mcp_tool_generator', {
        name: 'query_db',
        description: 'Run SQL query',
        sampleJson: '{"query": "SELECT * FROM users", "limit": 10}',
        format: 'mcp',
      });
      expect(res.ok).toBe(true);
      expect(res.result.definition.name).toBe('query_db');
      expect(res.result.definition.inputSchema.properties.query).toBeDefined();
    });

    it('executes codebase_context_packer to build XML context', async () => {
      const res = await registry.callTool('codebase_context_packer', {
        files: [
          { path: 'src/main.ts', content: 'const a = 1;' },
          { path: 'README.md', content: '# Readme' },
        ],
        format: 'xml',
        includeFileTree: true,
      });
      expect(res.ok).toBe(true);
      expect(res.result.packedContent).toContain('<file path="src/main.ts">');
      expect(res.result.packedContent).toContain('Directory Structure:');
      expect(res.result.totalFiles).toBe(2);
    });

    it('executes hash_text with various algorithms and encodings', async () => {
      const text = 'hello world';
      const resSha = await registry.callTool('hash_text', {
        text,
        algorithm: 'SHA256',
        encoding: 'Hex',
      });
      expect(resSha.ok).toBe(true);
      expect(resSha.result.digest).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');

      const resMd5 = await registry.callTool('hash_text', {
        text,
        algorithm: 'MD5',
        encoding: 'Hex',
      });
      expect(resMd5.ok).toBe(true);
      expect(resMd5.result.digest).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
    });

    it('executes base64_string_converter for encoding and decoding', async () => {
      const original = 'Hello WebMCP!';
      const encRes = await registry.callTool('base64_string_converter', {
        text: original,
        action: 'encode',
      });
      expect(encRes.ok).toBe(true);

      const decRes = await registry.callTool('base64_string_converter', {
        text: encRes.result.base64,
        action: 'decode',
      });
      expect(decRes.ok).toBe(true);
      expect(decRes.result.text).toBe(original);
    });

    it('executes uuid_generator with quantities', async () => {
      const res = await registry.callTool('uuid_generator', {
        version: 'v4',
        quantity: 5,
      });
      expect(res.ok).toBe(true);
      expect(res.result.uuids.length).toBe(5);
      expect(res.result.uuids[0]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('executes case_converter and url_encoder and json_minify', async () => {
      const caseRes = await registry.callTool('case_converter', {
        text: 'hello world from test',
        targetCase: 'camel',
      });
      expect(caseRes.ok).toBe(true);
      expect(caseRes.result.value).toBe('helloWorldFromTest');

      const urlRes = await registry.callTool('url_encoder', {
        text: 'test value=1',
        action: 'encode',
      });
      expect(urlRes.ok).toBe(true);
      expect(urlRes.result.text).toBe('test%20value%3D1');

      const minRes = await registry.callTool('json_minify', {
        json: '{\n  "a": 1\n}',
      });
      expect(minRes.ok).toBe(true);
      expect(minRes.result.minified).toBe('{"a":1}');
    });

    it('dispatches execution via the meta-tool execute_tool', async () => {
      const res = await registry.callTool('execute_tool', {
        toolName: 'uuid_generator',
        arguments: { quantity: 2, version: 'v4' },
      });
      expect(res.ok).toBe(true);
      expect(res.result.uuids.length).toBe(2);
    });

    it('returns structured error on unknown tool', async () => {
      const res = await registry.callTool('non_existent_tool', {});
      expect(res.ok).toBe(false);
      expect(res.error).toContain('not found');
    });
  });

  describe('Profile Packs Export', () => {
    it('returns predefined profiles including ai-engineering and crypto-security', () => {
      const profiles = registry.getProfiles();
      const ids = profiles.map(p => p.id);
      expect(ids).toContain('ai-engineering');
      expect(ids).toContain('crypto-security');
      expect(ids).toContain('web-developer');
      expect(ids).toContain('all-tools');
    });

    it('exports valid Claude Desktop and Cursor configurations', () => {
      const claudeCfg = registry.exportProfileConfig('ai-engineering', 'claudeDesktop');
      const parsedClaude = JSON.parse(claudeCfg);
      expect(parsedClaude.mcpServers['it-tools-ai']).toBeDefined();

      const cursorCfg = registry.exportProfileConfig('ai-engineering', 'cursor');
      const parsedCursor = JSON.parse(cursorCfg);
      expect(parsedCursor.mcpServers['it-tools-ai']).toBeDefined();

      const script = registry.exportProfileConfig('ai-engineering', 'inBrowserScript');
      expect(script).toContain('window.__webmcp__');
    });
  });

  describe('WebMCP Bridge & Window Object', () => {
    it('installs global window.__webmcp__ bridge correctly', () => {
      const bridge = installWebMCPBridge();
      expect(bridge).toBeDefined();
      expect(window.__webmcp__).toBeDefined();
      expect(window.__webmcp__?.version).toBe('1.0.0');

      const tools = window.__webmcp__?.listTools();
      expect(tools && tools.length).toBeGreaterThan(0);
    });
  });
});
