import { beforeEach, describe, expect, it } from 'vitest';
import { WebMCPRegistry } from './webmcp.service';
import { installWebMCPBridge, isNativeModelContextSupported } from './webmcp-bridge';
import { searchCatalogTools } from './webmcp-catalog';

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

  it('supports multi-word tokenized search queries', () => {
    const costMatches = searchCatalogTools('token cost');
    expect(costMatches.some(t => t.name === 'token_calculator')).toBe(true);

    const portMatches = searchCatalogTools('port generator');
    expect(portMatches.some(t => t.name === 'random_port_generator')).toBe(true);
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

  describe('Direct Execution of Core Tools & Robustness', () => {
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

    it('executes mcp_tool_generator with string or object sampleJson', async () => {
      const resFromString = await registry.callTool('mcp_tool_generator', {
        name: 'query_db',
        description: 'Run SQL query',
        sampleJson: '{"query": "SELECT * FROM users", "limit": 10}',
        format: 'mcp',
      });
      expect(resFromString.ok).toBe(true);
      expect(resFromString.result.definition.name).toBe('query_db');
      expect(resFromString.result.definition.inputSchema.properties.query).toBeDefined();

      const resFromObj = await registry.callTool('mcp_tool_generator', {
        name: 'calc_sum',
        description: 'Sum numbers',
        sampleJson: { a: 1, b: 2 },
        format: 'mcp',
      });
      expect(resFromObj.ok).toBe(true);
      expect(resFromObj.result.definition.inputSchema.properties.a).toBeDefined();
    });

    it('executes codebase_context_packer normalizing file structures', async () => {
      const res = await registry.callTool('codebase_context_packer', {
        files: [
          { filename: 'src/main.ts', code: 'const a = 1;' },
          { name: 'README.md', content: '# Readme' },
        ],
        format: 'xml',
        includeFileTree: true,
      });
      expect(res.ok).toBe(true);
      expect(res.result.packedContent).toContain('<file path="src/main.ts">');
      expect(res.result.packedContent).toContain('Directory Structure:');
      expect(res.result.totalFiles).toBe(2);
    });

    it('executes hash_text with case-insensitive algorithm and encoding', async () => {
      const text = 'hello world';
      const resShaLower = await registry.callTool('hash_text', {
        text,
        algorithm: 'sha256',
        encoding: 'base64',
      });
      expect(resShaLower.ok).toBe(true);
      expect(resShaLower.result.encoding).toBe('Base64');
      expect(resShaLower.result.digest).toBe('uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=');

      const resDashed = await registry.callTool('hash_text', {
        text,
        algorithm: 'sha-1',
        encoding: 'hex',
      });
      expect(resDashed.ok).toBe(true);
      expect(resDashed.result.digest).toBe('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed');
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

    it('executes uuid_generator with quantities, fallback on invalid quantity and nil version', async () => {
      const res = await registry.callTool('uuid_generator', {
        version: 'v4',
        quantity: 5,
      });
      expect(res.ok).toBe(true);
      expect(res.result.uuids.length).toBe(5);

      const resNil = await registry.callTool('uuid_generator', {
        version: 'nil',
        quantity: 'not-a-number',
      });
      expect(resNil.ok).toBe(true);
      expect(resNil.result.uuids.length).toBe(1);
      expect(resNil.result.uuids[0]).toBe('00000000-0000-0000-0000-000000000000');
    });

    it('executes random_port_generator safely with bounds and fallback', async () => {
      const res = await registry.callTool('random_port_generator', {
        quantity: 'invalid',
      });
      expect(res.ok).toBe(true);
      expect(res.result.ports.length).toBe(1);

      const resCapped = await registry.callTool('random_port_generator', {
        quantity: 100,
      });
      expect(resCapped.ok).toBe(true);
      expect(resCapped.result.ports.length).toBe(20);
    });

    it('executes case_converter handling compound format names like snake_case', async () => {
      const caseRes = await registry.callTool('case_converter', {
        text: 'hello world from test',
        targetCase: 'snake_case',
      });
      expect(caseRes.ok).toBe(true);
      expect(caseRes.result.value).toBe('hello_world_from_test');
    });

    it('executes json_minify with raw string or object', async () => {
      const minResStr = await registry.callTool('json_minify', {
        json: '{\n  "a": 1\n}',
      });
      expect(minResStr.ok).toBe(true);
      expect(minResStr.result.minified).toBe('{"a":1}');

      const minResObj = await registry.callTool('json_minify', {
        json: { hello: 'world', count: 42 },
      });
      expect(minResObj.ok).toBe(true);
      expect(minResObj.result.minified).toBe('{"hello":"world","count":42}');
    });

    it('dispatches execution via the meta-tool execute_tool', async () => {
      const res = await registry.callTool('execute_tool', {
        toolName: 'uuid_generator',
        arguments: { quantity: 2, version: 'v4' },
      });
      expect(res.ok).toBe(true);
      expect(res.result.uuids.length).toBe(2);
    });

    it('prevents recursive execution of execute_tool', async () => {
      const res = await registry.callTool('execute_tool', {
        toolName: 'execute_tool',
        arguments: {},
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain('Cannot execute execute_tool recursively');
    });

    it('returns structured error on unknown tool', async () => {
      const res = await registry.callTool('non_existent_tool', {});
      expect(res.ok).toBe(false);
      expect(res.error).toContain('not found');
    });

    it('returns guided error when calling an interactive catalog tool', async () => {
      const res = await registry.callTool('qr_code_generator', {});
      expect(res.ok).toBe(false);
      expect(res.error).toContain('interactive web tool');
      expect(res.error).toContain('directlyExecutableOnly');
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

  describe('WebMCP Bridge, Shim & Window Object', () => {
    it('installs global window.__webmcp__ bridge correctly with searchTools', () => {
      const bridge = installWebMCPBridge();
      expect(bridge).toBeDefined();
      expect(window.__webmcp__).toBeDefined();
      expect(window.__webmcp__?.version).toBe('1.0.0');

      const tools = window.__webmcp__?.listTools();
      expect(tools && tools.length).toBeGreaterThan(0);

      const searchRes = window.__webmcp__?.searchTools('token');
      expect(searchRes && searchRes.length).toBeGreaterThan(0);
    });

    it('accurately identifies shim as non-native modelContext', () => {
      installWebMCPBridge();
      // Even with shim installed, isNativeModelContextSupported must report false
      expect(isNativeModelContextSupported()).toBe(false);
    });

    it('exposes document.modelContext and navigator.modelContext with getTools and callTool', async () => {
      installWebMCPBridge();
      const docMc = (document as any).modelContext;
      expect(docMc).toBeDefined();
      expect(docMc.isShim).toBe(true);

      const tools = await docMc.getTools();
      expect(tools.length).toBeGreaterThan(0);

      const callRes = await docMc.callTool('search_tools', { query: 'uuid' });
      expect(callRes.ok).toBe(true);
      expect(callRes.result.totalMatched).toBeGreaterThan(0);
    });

    it('handles postMessage bridge requests', async () => {
      installWebMCPBridge();

      const responses: any[] = [];
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type?.startsWith('webmcp:')) {
          responses.push(e.data);
        }
      };
      window.addEventListener('message', onMsg);

      // 1. ping
      window.postMessage({ type: 'webmcp:ping', id: 'req-ping' }, '*');
      // 2. list_tools
      window.postMessage({ type: 'webmcp:list_tools', id: 'req-list' }, '*');
      // 3. search_tools
      window.postMessage({ type: 'webmcp:search_tools', id: 'req-search', query: 'uuid' }, '*');
      // 4. call_tool
      window.postMessage({
        type: 'webmcp:call_tool',
        id: 'req-call',
        tool: 'uuid_generator',
        arguments: { quantity: 1 },
      }, '*');
      // 5. get_profiles
      window.postMessage({ type: 'webmcp:get_profiles', id: 'req-prof' }, '*');

      await new Promise(resolve => setTimeout(resolve, 50));
      window.removeEventListener('message', onMsg);

      expect(responses.some(r => r.type === 'webmcp:pong' && r.id === 'req-ping')).toBe(true);
      expect(responses.some(r => r.type === 'webmcp:list_tools_response' && r.id === 'req-list')).toBe(true);
      expect(responses.some(r => r.type === 'webmcp:search_tools_response' && r.id === 'req-search')).toBe(true);
      expect(responses.some(r => r.type === 'webmcp:call_tool_response' && r.id === 'req-call' && r.ok)).toBe(true);
      expect(responses.some(r => r.type === 'webmcp:get_profiles_response' && r.id === 'req-prof')).toBe(true);
    });
  });
});
