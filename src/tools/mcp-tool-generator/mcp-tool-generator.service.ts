export type ParamType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface ToolParam {
  name: string
  type: ParamType
  description: string
  required: boolean
  enumVals?: string[]
}

export interface ToolContract {
  name: string
  description: string
  parameters: ToolParam[]
}

export function inferParametersFromJson(jsonStr: string): ToolParam[] {
  if (!jsonStr || !jsonStr.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return [];
    }

    const params: ToolParam[] = [];

    for (const [key, val] of Object.entries(parsed)) {
      let type: ParamType = 'string';
      if (typeof val === 'number') {
        type = 'number';
      }
      else if (typeof val === 'boolean') {
        type = 'boolean';
      }
      else if (Array.isArray(val)) {
        type = 'array';
      }
      else if (typeof val === 'object' && val !== null) {
        type = 'object';
      }

      params.push({
        name: key,
        type,
        description: `The ${key} parameter`,
        required: true,
      });
    }

    return params;
  }
  catch {
    return [];
  }
}

export function generateMcpTool(tool: ToolContract): string {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const param of tool.parameters) {
    if (!param.name) {
      continue;
    }

    const prop: Record<string, unknown> = {
      type: param.type,
      description: param.description || `Parameter ${param.name}`,
    };

    if (param.enumVals && param.enumVals.length > 0) {
      prop.enum = param.enumVals;
    }

    properties[param.name] = prop;

    if (param.required) {
      required.push(param.name);
    }
  }

  const mcpDefinition = {
    name: tool.name || 'custom_tool',
    description: tool.description || 'Description of custom tool',
    inputSchema: {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    },
  };

  return JSON.stringify(mcpDefinition, null, 2);
}

export function generateOpenAiTool(tool: ToolContract): string {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const param of tool.parameters) {
    if (!param.name) {
      continue;
    }

    const prop: Record<string, unknown> = {
      type: param.type,
      description: param.description || `Parameter ${param.name}`,
    };

    if (param.enumVals && param.enumVals.length > 0) {
      prop.enum = param.enumVals;
    }

    properties[param.name] = prop;

    if (param.required) {
      required.push(param.name);
    }
  }

  const openAiDefinition = {
    type: 'function',
    function: {
      name: tool.name || 'custom_tool',
      description: tool.description || 'Description of custom tool',
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };

  return JSON.stringify(openAiDefinition, null, 2);
}

export function generateTypeScriptZod(tool: ToolContract): string {
  const lines: string[] = [];
  const interfaceName = tool.name
    ? `${tool.name.replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase())}Input`
    : 'ToolInput';

  lines.push('import { z } from \'zod\';\n');
  lines.push(`export const ${tool.name || 'customTool'}Schema = z.object({`);

  for (const param of tool.parameters) {
    if (!param.name) {
      continue;
    }

    let zodType = 'z.string()';
    if (param.type === 'number') {
      zodType = 'z.number()';
    }
    else if (param.type === 'boolean') {
      zodType = 'z.boolean()';
    }
    else if (param.type === 'array') {
      zodType = 'z.array(z.any())';
    }
    else if (param.type === 'object') {
      zodType = 'z.record(z.any())';
    }

    if (param.enumVals && param.enumVals.length > 0) {
      const enumStr = param.enumVals.map(v => `'${v}'`).join(', ');
      zodType = `z.enum([${enumStr}])`;
    }

    if (param.description) {
      zodType += `.describe('${param.description}')`;
    }

    if (!param.required) {
      zodType += '.optional()';
    }

    lines.push(`  ${param.name}: ${zodType},`);
  }

  lines.push('});\n');
  lines.push(`export type ${interfaceName} = z.infer<typeof ${tool.name || 'customTool'}Schema>;`);

  return lines.join('\n');
}
