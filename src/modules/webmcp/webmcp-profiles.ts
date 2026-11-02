import type { WebMCPProfile } from './webmcp.types';

export const predefinedProfiles: WebMCPProfile[] = [
  {
    id: 'ai-engineering',
    name: 'AI Prompt Engineering Pack',
    description: 'Tools for prompt optimization, token estimation, privacy redaction, and code context packing.',
    toolNames: [
      'token_calculator',
      'prompt_redactor',
      'web_to_llm_markdown',
      'mcp_tool_generator',
      'codebase_context_packer',
    ],
    exportConfigs: {
      claudeDesktop: {
        mcpServers: {
          'it-tools-ai': {
            transport: 'browser-bridge',
            profile: 'ai-engineering',
            bridgeProtocol: 'webmcp',
            tools: [
              'token_calculator',
              'prompt_redactor',
              'web_to_llm_markdown',
              'mcp_tool_generator',
              'codebase_context_packer',
            ],
          },
        },
      },
      cursor: {
        mcpServers: {
          'it-tools-ai': {
            transport: 'browser-bridge',
            profile: 'ai-engineering',
            bridgeProtocol: 'webmcp',
            tools: [
              'token_calculator',
              'prompt_redactor',
              'web_to_llm_markdown',
              'mcp_tool_generator',
              'codebase_context_packer',
            ],
          },
        },
      },
      rawMcp: {
        version: '1.0.0',
        profile: 'ai-engineering',
        description: 'AI prompt and context optimization utilities',
        tools: [
          'token_calculator',
          'prompt_redactor',
          'web_to_llm_markdown',
          'mcp_tool_generator',
          'codebase_context_packer',
        ],
      },
      inBrowserScript: `// WebMCP Browser Bridge Connector
(async () => {
  if (!window.__webmcp__) {
    console.error('WebMCP runtime not detected on page.');
    return;
  }
  const tools = window.__webmcp__.listTools();
  console.log('Active WebMCP Tools:', tools.map(t => t.name));
  const result = await window.__webmcp__.callTool('token_calculator', {
    text: 'Hello WebMCP in browser!'
  });
  console.log('Execution result:', result);
})();`,
    },
  },

  {
    id: 'crypto-security',
    name: 'Security & Cryptography Pack',
    description: 'Cryptographic hashing, UUID generation, token creation, and Base64 encoding utilities.',
    toolNames: [
      'hash_text',
      'base64_string_converter',
      'uuid_generator',
    ],
    exportConfigs: {
      claudeDesktop: {
        mcpServers: {
          'it-tools-crypto': {
            transport: 'browser-bridge',
            profile: 'crypto-security',
            bridgeProtocol: 'webmcp',
            tools: ['hash_text', 'base64_string_converter', 'uuid_generator'],
          },
        },
      },
      cursor: {
        mcpServers: {
          'it-tools-crypto': {
            transport: 'browser-bridge',
            profile: 'crypto-security',
            bridgeProtocol: 'webmcp',
            tools: ['hash_text', 'base64_string_converter', 'uuid_generator'],
          },
        },
      },
      rawMcp: {
        version: '1.0.0',
        profile: 'crypto-security',
        description: 'Security, hashing, and identifier generation utilities',
        tools: ['hash_text', 'base64_string_converter', 'uuid_generator'],
      },
      inBrowserScript: `// WebMCP Cryptography Quick Call
(async () => {
  const hash = await window.__webmcp__?.callTool('hash_text', {
    text: 'Secure string',
    algorithm: 'SHA256'
  });
  console.log('SHA256:', hash?.result?.digest);
})();`,
    },
  },

  {
    id: 'web-developer',
    name: 'Frontend & Web Utility Pack',
    description: 'Web encoding, case converting, JSON minifying, and random port utilities.',
    toolNames: [
      'url_encoder',
      'case_converter',
      'json_minify',
      'random_port_generator',
      'base64_string_converter',
    ],
    exportConfigs: {
      claudeDesktop: {
        mcpServers: {
          'it-tools-web': {
            transport: 'browser-bridge',
            profile: 'web-developer',
            bridgeProtocol: 'webmcp',
            tools: [
              'url_encoder',
              'case_converter',
              'json_minify',
              'random_port_generator',
              'base64_string_converter',
            ],
          },
        },
      },
      cursor: {
        mcpServers: {
          'it-tools-web': {
            transport: 'browser-bridge',
            profile: 'web-developer',
            bridgeProtocol: 'webmcp',
            tools: [
              'url_encoder',
              'case_converter',
              'json_minify',
              'random_port_generator',
              'base64_string_converter',
            ],
          },
        },
      },
      rawMcp: {
        version: '1.0.0',
        profile: 'web-developer',
        description: 'Web string and development utilities',
        tools: [
          'url_encoder',
          'case_converter',
          'json_minify',
          'random_port_generator',
          'base64_string_converter',
        ],
      },
      inBrowserScript: `// WebMCP Web Formatting Quick Call
(async () => {
  const res = await window.__webmcp__?.callTool('case_converter', {
    text: 'hello world from browser',
    targetCase: 'camel'
  });
  console.log('CamelCase:', res?.result?.value);
})();`,
    },
  },

  {
    id: 'all-tools',
    name: 'All-in-One Catalog Pack',
    description: 'Complete utility collection with two-stage discovery meta-tools.',
    toolNames: [
      'search_tools',
      'execute_tool',
      'token_calculator',
      'prompt_redactor',
      'web_to_llm_markdown',
      'mcp_tool_generator',
      'codebase_context_packer',
      'hash_text',
      'base64_string_converter',
      'uuid_generator',
      'case_converter',
      'url_encoder',
      'json_minify',
      'random_port_generator',
    ],
    exportConfigs: {
      claudeDesktop: {
        mcpServers: {
          'it-tools-all': {
            transport: 'browser-bridge',
            profile: 'all-tools',
            bridgeProtocol: 'webmcp',
            tools: [
              'search_tools',
              'execute_tool',
              'token_calculator',
              'prompt_redactor',
              'web_to_llm_markdown',
              'mcp_tool_generator',
              'codebase_context_packer',
              'hash_text',
              'base64_string_converter',
              'uuid_generator',
              'case_converter',
              'url_encoder',
              'json_minify',
              'random_port_generator',
            ],
          },
        },
      },
      cursor: {
        mcpServers: {
          'it-tools-all': {
            transport: 'browser-bridge',
            profile: 'all-tools',
            bridgeProtocol: 'webmcp',
            tools: [
              'search_tools',
              'execute_tool',
              'token_calculator',
              'prompt_redactor',
              'web_to_llm_markdown',
              'mcp_tool_generator',
              'codebase_context_packer',
              'hash_text',
              'base64_string_converter',
              'uuid_generator',
              'case_converter',
              'url_encoder',
              'json_minify',
              'random_port_generator',
            ],
          },
        },
      },
      rawMcp: {
        version: '1.0.0',
        profile: 'all-tools',
        description: 'Full developer suite with meta-tool discovery',
        tools: [
          'search_tools',
          'execute_tool',
          'token_calculator',
          'prompt_redactor',
          'web_to_llm_markdown',
          'mcp_tool_generator',
          'codebase_context_packer',
          'hash_text',
          'base64_string_converter',
          'uuid_generator',
          'case_converter',
          'url_encoder',
          'json_minify',
          'random_port_generator',
        ],
      },
      inBrowserScript: `// WebMCP Two-Stage Discovery Demo
(async () => {
  const searchResult = await window.__webmcp__?.callTool('search_tools', {
    query: 'token'
  });
  console.log('Search matches:', searchResult?.result?.tools);
})();`,
    },
  },
];
