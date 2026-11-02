import { MD5, RIPEMD160, SHA1, SHA224, SHA256, SHA3, SHA384, SHA512, enc } from 'crypto-js';
import { NIL as nilUuid, v1 as uuidV1, v4 as uuidV4 } from 'uuid';
import { camelCase, constantCase, paramCase, pascalCase, snakeCase } from 'change-case';
import JSON5 from 'json5';
import type { WebMCPTool } from './webmcp.types';
import { analyzeTextTokens } from '@/tools/token-calculator/token-calculator.service';
import { redactText, restoreText } from '@/tools/prompt-redactor/prompt-redactor.service';
import { convertHtmlToLlmMarkdown } from '@/tools/web-to-llm-markdown/web-to-llm-markdown.service';
import {
  generateMcpTool,
  generateOpenAiTool,
  inferParametersFromJson,
} from '@/tools/mcp-tool-generator/mcp-tool-generator.service';
import { packCodebase } from '@/tools/codebase-context-packer/codebase-context-packer.service';
import { convertHexToBin } from '@/tools/hash-text/hash-text.service';
import { base64ToText, textToBase64 } from '@/utils/base64';
import { generatePort } from '@/tools/random-port-generator/random-port-generator.model';

const hashAlgorithms = {
  MD5,
  SHA1,
  SHA256,
  SHA224,
  SHA512,
  SHA384,
  SHA3,
  RIPEMD160,
} as const;

export const coreExecutableTools: WebMCPTool[] = [
  {
    name: 'token_calculator',
    title: 'Token Calculator',
    description: 'Estimate token counts and API costs across GPT-4o, Claude 3.5, and DeepSeek.',
    category: 'AI',
    scope: 'route',
    routePath: '/token-calculator',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text string to calculate token counts and costs',
        },
      },
      required: ['text'],
    },
    sampleArgs: {
      text: 'Analyze the system architecture of our microservices and output a complete breakdown.',
    },
    execute(args) {
      const text = String(args.text ?? '');
      if (!text) {
        throw new Error('Input parameter text must not be empty.');
      }
      return analyzeTextTokens(text);
    },
  },

  {
    name: 'prompt_redactor',
    title: 'Prompt Secret Redactor',
    description: 'Mask sensitive credentials in prompts and restore original values from completions.',
    category: 'AI',
    scope: 'route',
    routePath: '/prompt-redactor',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Input text containing secrets to mask or tokens to restore',
        },
        action: {
          type: 'string',
          description: 'Action to execute',
          enum: ['redact', 'restore'],
          default: 'redact',
        },
        mappings: {
          type: 'object',
          description: 'Token mappings dictionary for restore action',
        },
      },
      required: ['text'],
    },
    sampleArgs: {
      action: 'redact',
      text: 'Contact admin@example.com with key sk-abcdef1234567890abcdef1234567890 at 192.168.1.1',
    },
    execute(args) {
      const text = String(args.text ?? '');
      const action = String(args.action ?? 'redact').toLowerCase();
      if (action === 'restore') {
        const mappings = (args.mappings ?? {}) as Record<string, string>;
        const restoredText = restoreText(text, mappings);
        return { restoredText };
      }
      return redactText(text);
    },
  },

  {
    name: 'web_to_llm_markdown',
    title: 'Web to Clean LLM Markdown',
    description: 'Convert HTML source into clean Markdown by removing scripts, styles, and SVG noise.',
    category: 'AI',
    scope: 'route',
    routePath: '/web-to-llm-markdown',
    inputSchema: {
      type: 'object',
      properties: {
        html: {
          type: 'string',
          description: 'Raw HTML source to convert into clean Markdown',
        },
        stripImages: {
          type: 'boolean',
          description: 'Remove image elements',
          default: false,
        },
        stripLinks: {
          type: 'boolean',
          description: 'Remove hyperlinks',
          default: false,
        },
      },
      required: ['html'],
    },
    sampleArgs: {
      html: '<h1>API Guide</h1><p>Send a request with your token.</p><script>console.log("noisy script");</script>',
      stripImages: false,
      stripLinks: false,
    },
    execute(args) {
      const html = String(args.html ?? '');
      if (!html) {
        throw new Error('Input parameter html must not be empty.');
      }
      return convertHtmlToLlmMarkdown(html, {
        stripImages: Boolean(args.stripImages),
        stripLinks: Boolean(args.stripLinks),
      });
    },
  },

  {
    name: 'mcp_tool_generator',
    title: 'MCP Tool Contract Generator',
    description: 'Generate Model Context Protocol definitions and schemas from tool definitions.',
    category: 'AI',
    scope: 'route',
    routePath: '/mcp-tool-generator',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the tool',
        },
        description: {
          type: 'string',
          description: 'Description of the tool',
        },
        sampleJson: {
          type: 'string',
          description: 'Sample JSON payload to infer parameter schemas from',
        },
        format: {
          type: 'string',
          description: 'Target export format',
          enum: ['mcp', 'openai'],
          default: 'mcp',
        },
      },
      required: ['name', 'description'],
    },
    sampleArgs: {
      name: 'fetch_weather',
      description: 'Get weather forecast for a city',
      sampleJson: '{"city": "Tokyo", "days": 5, "units": "metric"}',
      format: 'mcp',
    },
    execute(args) {
      const name = String(args.name ?? 'custom_tool');
      const description = String(args.description ?? '');
      const sampleJson = String(args.sampleJson ?? '{}');
      const format = String(args.format ?? 'mcp').toLowerCase();
      const parameters = inferParametersFromJson(sampleJson);

      const contract = {
        name,
        description,
        parameters,
      };

      if (format === 'openai') {
        return {
          format: 'openai',
          definition: JSON.parse(generateOpenAiTool(contract)),
        };
      }

      return {
        format: 'mcp',
        definition: JSON.parse(generateMcpTool(contract)),
      };
    },
  },

  {
    name: 'codebase_context_packer',
    title: 'Codebase Context Packer',
    description: 'Pack source files and folder structures into XML or Markdown context for LLM ingestion.',
    category: 'AI',
    scope: 'route',
    routePath: '/codebase-context-packer',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: 'List of files with path and content properties',
        },
        format: {
          type: 'string',
          description: 'Context output format',
          enum: ['xml', 'markdown'],
          default: 'xml',
        },
        includeFileTree: {
          type: 'boolean',
          description: 'Include ASCII directory tree in packed output',
          default: true,
        },
      },
      required: ['files'],
    },
    sampleArgs: {
      format: 'xml',
      includeFileTree: true,
      files: [
        { path: 'src/index.ts', content: 'console.log("hello world");' },
        { path: 'package.json', content: '{"name": "demo", "version": "1.0.0"}' },
      ],
    },
    execute(args) {
      const files = Array.isArray(args.files) ? args.files : [];
      if (files.length === 0) {
        throw new Error('Input files array must contain at least one file.');
      }
      return packCodebase(files, {
        format: args.format === 'markdown' ? 'markdown' : 'xml',
        includeFileTree: args.includeFileTree !== false,
      });
    },
  },

  {
    name: 'hash_text',
    title: 'Hash Text',
    description: 'Compute cryptographic hash digest for input string.',
    category: 'Crypto',
    scope: 'route',
    routePath: '/hash-text',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text string to hash',
        },
        algorithm: {
          type: 'string',
          description: 'Cryptographic hash algorithm',
          enum: ['MD5', 'SHA1', 'SHA256', 'SHA512', 'SHA224', 'SHA384', 'SHA3', 'RIPEMD160'],
          default: 'SHA256',
        },
        encoding: {
          type: 'string',
          description: 'Digest output encoding',
          enum: ['Hex', 'Base64', 'Bin'],
          default: 'Hex',
        },
      },
      required: ['text'],
    },
    sampleArgs: {
      text: 'The quick brown fox jumps over the lazy dog',
      algorithm: 'SHA256',
      encoding: 'Hex',
    },
    execute(args) {
      const text = String(args.text ?? '');
      const algoName = (args.algorithm ?? 'SHA256') as keyof typeof hashAlgorithms;
      const encoding = String(args.encoding ?? 'Hex');

      const hasher = hashAlgorithms[algoName];
      if (!hasher) {
        throw new Error(`Unsupported algorithm: ${algoName}`);
      }

      const words = hasher(text);
      let digest = '';
      if (encoding === 'Bin') {
        digest = convertHexToBin(words.toString(enc.Hex));
      }
      else if (encoding === 'Base64') {
        digest = words.toString(enc.Base64);
      }
      else {
        digest = words.toString(enc.Hex);
      }

      return {
        algorithm: algoName,
        encoding,
        digest,
      };
    },
  },

  {
    name: 'base64_string_converter',
    title: 'Base64 String Converter',
    description: 'Encode text into Base64 format or decode Base64 string to original text.',
    category: 'Converter',
    scope: 'route',
    routePath: '/base64-string-converter',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text string to convert',
        },
        action: {
          type: 'string',
          description: 'Convert direction',
          enum: ['encode', 'decode'],
          default: 'encode',
        },
        urlSafe: {
          type: 'boolean',
          description: 'Use URL-safe character substitution',
          default: false,
        },
      },
      required: ['text'],
    },
    sampleArgs: {
      text: 'IT-Tools WebMCP in-browser agent bridge',
      action: 'encode',
      urlSafe: false,
    },
    execute(args) {
      const text = String(args.text ?? '');
      const action = String(args.action ?? 'encode').toLowerCase();
      const urlSafe = Boolean(args.urlSafe);

      if (action === 'decode') {
        const decoded = base64ToText(text.trim(), { makeUrlSafe: urlSafe });
        return { action: 'decode', text: decoded, urlSafe };
      }

      const encoded = textToBase64(text, { makeUrlSafe: urlSafe });
      return { action: 'encode', base64: encoded, urlSafe };
    },
  },

  {
    name: 'uuid_generator',
    title: 'UUID Generator',
    description: 'Generate RFC-compliant UUID identifiers.',
    category: 'Crypto',
    scope: 'route',
    routePath: '/uuid-generator',
    inputSchema: {
      type: 'object',
      properties: {
        version: {
          type: 'string',
          description: 'UUID version',
          enum: ['v4', 'v1', 'NIL'],
          default: 'v4',
        },
        quantity: {
          type: 'number',
          description: 'Quantity of UUIDs to generate (1 to 50)',
          default: 1,
        },
      },
    },
    sampleArgs: {
      version: 'v4',
      quantity: 3,
    },
    execute(args) {
      const version = String(args.version ?? 'v4');
      const quantity = Math.min(Math.max(Number(args.quantity ?? 1), 1), 50);

      const generateOne = (): string => {
        if (version === 'v1') {
          return uuidV1();
        }
        if (version === 'NIL') {
          return nilUuid;
        }
        return uuidV4();
      };

      const uuids = Array.from({ length: quantity }, () => generateOne());
      return {
        version,
        quantity,
        uuids,
      };
    },
  },

  {
    name: 'case_converter',
    title: 'Case Converter',
    description: 'Convert string cases between camelCase, snake_case, kebab-case, and PascalCase.',
    category: 'Converter',
    scope: 'route',
    routePath: '/case-converter',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'String to convert',
        },
        targetCase: {
          type: 'string',
          description: 'Target case format',
          enum: ['camel', 'snake', 'kebab', 'pascal', 'constant', 'all'],
          default: 'all',
        },
      },
      required: ['text'],
    },
    sampleArgs: {
      text: 'web model context protocol',
      targetCase: 'all',
    },
    execute(args) {
      const text = String(args.text ?? '');
      const targetCase = String(args.targetCase ?? 'all').toLowerCase();

      const results = {
        camel: camelCase(text),
        snake: snakeCase(text),
        kebab: paramCase(text),
        pascal: pascalCase(text),
        constant: constantCase(text),
      };

      if (targetCase !== 'all' && targetCase in results) {
        return {
          targetCase,
          value: results[targetCase as keyof typeof results],
        };
      }

      return results;
    },
  },

  {
    name: 'url_encoder',
    title: 'URL Encoder / Decoder',
    description: 'Encode or decode URI components and query strings.',
    category: 'Web',
    scope: 'route',
    routePath: '/url-encoder',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'String to encode or decode',
        },
        action: {
          type: 'string',
          description: 'Action to execute',
          enum: ['encode', 'decode'],
          default: 'encode',
        },
      },
      required: ['text'],
    },
    sampleArgs: {
      text: 'https://example.com/search?q=AI tools & WebMCP',
      action: 'encode',
    },
    execute(args) {
      const text = String(args.text ?? '');
      const action = String(args.action ?? 'encode').toLowerCase();

      if (action === 'decode') {
        return { action: 'decode', text: decodeURIComponent(text) };
      }

      return { action: 'encode', text: encodeURIComponent(text) };
    },
  },

  {
    name: 'json_minify',
    title: 'JSON Minifier',
    description: 'Minify and compress JSON string removing formatting whitespace.',
    category: 'Development',
    scope: 'route',
    routePath: '/json-minify',
    inputSchema: {
      type: 'object',
      properties: {
        json: {
          type: 'string',
          description: 'JSON or JSON5 string to minify',
        },
      },
      required: ['json'],
    },
    sampleArgs: {
      json: '{\n  "title": "IT-Tools",\n  "status": "ready"\n}',
    },
    execute(args) {
      const raw = String(args.json ?? '');
      if (!raw.trim()) {
        throw new Error('Input parameter json must not be empty.');
      }
      const parsed = JSON5.parse(raw);
      const minified = JSON.stringify(parsed, null, 0);
      return {
        minified,
        originalLength: raw.length,
        minifiedLength: minified.length,
        savedBytes: raw.length - minified.length,
      };
    },
  },

  {
    name: 'random_port_generator',
    title: 'Random Port Generator',
    description: 'Generate available random network port numbers in safe user range.',
    category: 'Development',
    scope: 'route',
    routePath: '/random-port-generator',
    inputSchema: {
      type: 'object',
      properties: {
        quantity: {
          type: 'number',
          description: 'Quantity of random ports to generate (1 to 20)',
          default: 1,
        },
      },
    },
    sampleArgs: {
      quantity: 3,
    },
    execute(args) {
      const count = Math.min(Math.max(Number(args.quantity ?? 1), 1), 20);
      const ports = Array.from({ length: count }, () => generatePort());
      return {
        ports,
        quantity: count,
      };
    },
  },
];
