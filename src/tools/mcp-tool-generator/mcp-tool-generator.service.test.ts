import { describe, expect, it } from 'vitest';
import {
  generateMcpTool,
  generateOpenAiTool,
  generateTypeScriptZod,
  inferParametersFromJson,
} from './mcp-tool-generator.service';

describe('mcp-tool-generator service', () => {
  it('should infer parameters from sample json', () => {
    const sample = JSON.stringify({
      location: 'San Francisco, CA',
      days: 7,
      includeDetails: true,
      tags: ['weather', 'forecast'],
    });

    const params = inferParametersFromJson(sample);
    expect(params.length).toBe(4);
    expect(params.find(p => p.name === 'location')?.type).toBe('string');
    expect(params.find(p => p.name === 'days')?.type).toBe('number');
    expect(params.find(p => p.name === 'includeDetails')?.type).toBe('boolean');
    expect(params.find(p => p.name === 'tags')?.type).toBe('array');
  });

  it('should generate valid Anthropic MCP tool definition', () => {
    const contract = {
      name: 'get_weather',
      description: 'Fetch weather report for location',
      parameters: [
        { name: 'location', type: 'string' as const, description: 'City name', required: true },
        { name: 'unit', type: 'string' as const, description: 'Temperature unit', required: false, enumVals: ['celsius', 'fahrenheit'] },
      ],
    };

    const jsonStr = generateMcpTool(contract);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.name).toBe('get_weather');
    expect(parsed.inputSchema.type).toBe('object');
    expect(parsed.inputSchema.properties.location.type).toBe('string');
    expect(parsed.inputSchema.properties.unit.enum).toEqual(['celsius', 'fahrenheit']);
    expect(parsed.inputSchema.required).toEqual(['location']);
  });

  it('should generate valid OpenAI function definition', () => {
    const contract = {
      name: 'calculate_tax',
      description: 'Calculate tax for amount',
      parameters: [
        { name: 'amount', type: 'number' as const, description: 'Total price', required: true },
      ],
    };

    const jsonStr = generateOpenAiTool(contract);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.type).toBe('function');
    expect(parsed.function.name).toBe('calculate_tax');
    expect(parsed.function.parameters.properties.amount.type).toBe('number');
  });

  it('should generate TypeScript Zod schema', () => {
    const contract = {
      name: 'search_docs',
      description: 'Search documentation',
      parameters: [
        { name: 'query', type: 'string' as const, description: 'Search term', required: true },
      ],
    };

    const code = generateTypeScriptZod(contract);
    expect(code).toContain('export const search_docsSchema = z.object({');
    expect(code).toContain('query: z.string().describe(\'Search term\'),');
    expect(code).toContain('export type SearchDocsInput = z.infer<typeof search_docsSchema>;');
  });
});
