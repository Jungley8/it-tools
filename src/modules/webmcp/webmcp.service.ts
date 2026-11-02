import type {
  WebMCPCallResult,
  WebMCPProfile,
  WebMCPTool,
  WebMCPToolSummary,
} from './webmcp.types';
import { coreExecutableTools } from './webmcp-tools';
import { getAllCatalogTools, searchCatalogTools } from './webmcp-catalog';
import { predefinedProfiles } from './webmcp-profiles';

export class WebMCPRegistry {
  private globalTools: Map<string, WebMCPTool> = new Map();
  private routeScopedTools: Map<string, WebMCPTool> = new Map();
  private allExecutableTools: Map<string, WebMCPTool> = new Map();
  private activeTools: Map<string, WebMCPTool> = new Map();
  private currentRoute = '/';
  private listeners: Set<(tools: Array<Omit<WebMCPTool, 'execute'>>) => void> = new Set();

  constructor() {
    this.initializeMetaTools();
    this.initializeExecutableTools();
    this.setRoute('/');
  }

  private initializeMetaTools() {
    const searchTool: WebMCPTool = {
      name: 'search_tools',
      title: 'Search Tools Catalog',
      description: 'Search developer tools catalog on IT-Tools by keyword, task, or category. Returns matching tools and schema information.',
      category: 'Global Meta',
      scope: 'global',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Keyword, category, or task description to search',
          },
          category: {
            type: 'string',
            description: 'Filter tools by category name',
          },
          directlyExecutableOnly: {
            type: 'boolean',
            description: 'Only return tools executable directly via execute_tool',
            default: false,
          },
        },
      },
      sampleArgs: {
        query: 'token',
        directlyExecutableOnly: false,
      },
      execute: (args) => {
        const query = String(args.query ?? '');
        const category = args.category ? String(args.category) : undefined;
        const directlyExecutableOnly = Boolean(args.directlyExecutableOnly);

        const matches = searchCatalogTools(query, { category, directlyExecutableOnly });
        return {
          totalMatched: matches.length,
          tools: matches.map(tool => ({
            name: tool.name,
            title: tool.title,
            description: tool.description,
            category: tool.category,
            routePath: tool.path,
            isDirectlyExecutable: tool.isDirectlyExecutable,
          })),
          usageHint: 'Use execute_tool with toolName and arguments to run directly executable tools.',
        };
      },
    };

    const executeTool: WebMCPTool = {
      name: 'execute_tool',
      title: 'Execute Tool',
      description: 'Execute an IT-Tools utility by name and argument payload. Call search_tools first to inspect input parameters.',
      category: 'Global Meta',
      scope: 'global',
      inputSchema: {
        type: 'object',
        properties: {
          toolName: {
            type: 'string',
            description: 'Name of the tool to execute',
          },
          arguments: {
            type: 'object',
            description: 'Input arguments matching the tool schema',
          },
        },
        required: ['toolName'],
      },
      sampleArgs: {
        toolName: 'uuid_generator',
        arguments: { quantity: 2, version: 'v4' },
      },
      execute: async (args) => {
        const toolName = String(args.toolName ?? '');
        if (!toolName) {
          throw new Error('Input parameter toolName must not be empty.');
        }
        const toolArgs = (args.arguments ?? {}) as Record<string, any>;
        const result = await this.callTool(toolName, toolArgs);
        if (!result.ok) {
          throw new Error(result.error ?? 'Execution failed.');
        }
        return result.result;
      },
    };

    this.globalTools.set(searchTool.name, searchTool);
    this.globalTools.set(executeTool.name, executeTool);
  }

  private initializeExecutableTools() {
    for (const tool of coreExecutableTools) {
      this.allExecutableTools.set(tool.name, tool);
      if (tool.routePath) {
        this.routeScopedTools.set(tool.routePath, tool);
      }
    }
  }

  public setRoute(routePath: string) {
    const normalized = routePath ? routePath.split('?')[0].split('#')[0] : '/';
    this.currentRoute = normalized;

    // Start with global meta tools
    const nextActive = new Map<string, WebMCPTool>(this.globalTools);

    // If current route maps to an executable tool, inject it JIT
    const routeTool = this.routeScopedTools.get(normalized);
    if (routeTool) {
      nextActive.set(routeTool.name, routeTool);
    }

    this.activeTools = nextActive;
    this.notifyListeners();
  }

  public getCurrentRoute(): string {
    return this.currentRoute;
  }

  public registerTool(tool: WebMCPTool) {
    if (tool.scope === 'global') {
      this.globalTools.set(tool.name, tool);
    }
    else if (tool.routePath) {
      this.routeScopedTools.set(tool.routePath, tool);
    }
    this.allExecutableTools.set(tool.name, tool);
    this.activeTools.set(tool.name, tool);
    this.notifyListeners();
  }

  public unregisterTool(name: string): boolean {
    const had = this.activeTools.delete(name);
    this.globalTools.delete(name);
    this.allExecutableTools.delete(name);
    if (had) {
      this.notifyListeners();
    }
    return had;
  }

  public getTool(name: string): WebMCPTool | undefined {
    return this.activeTools.get(name) ?? this.allExecutableTools.get(name) ?? this.globalTools.get(name);
  }

  public getActiveTools(): Array<Omit<WebMCPTool, 'execute'>> {
    return Array.from(this.activeTools.values()).map(
      ({ name, title, description, inputSchema, category, scope, routePath, sampleArgs }) => ({
        name,
        title,
        description,
        inputSchema,
        category,
        scope,
        routePath,
        sampleArgs,
      }),
    );
  }

  public getAllExecutableTools(): WebMCPTool[] {
    return Array.from(this.allExecutableTools.values());
  }

  public getAllToolsSummary(): WebMCPToolSummary[] {
    return getAllCatalogTools();
  }

  public async callTool(name: string, args: Record<string, any> = {}): Promise<WebMCPCallResult> {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tool = this.getTool(name);

    if (!tool) {
      const duration = typeof performance !== 'undefined' ? performance.now() - startTime : Date.now() - startTime;
      return {
        tool: name,
        ok: false,
        error: `Tool '${name}' not found. Use search_tools to list available tools.`,
        executionTimeMs: Math.round(duration),
      };
    }

    try {
      const result = await tool.execute(args);
      const duration = typeof performance !== 'undefined' ? performance.now() - startTime : Date.now() - startTime;
      return {
        tool: name,
        ok: true,
        result,
        executionTimeMs: Math.round(duration),
      };
    }
    catch (err: any) {
      const duration = typeof performance !== 'undefined' ? performance.now() - startTime : Date.now() - startTime;
      return {
        tool: name,
        ok: false,
        error: err?.message || 'Unknown execution error occurred.',
        executionTimeMs: Math.round(duration),
      };
    }
  }

  public getProfiles(): WebMCPProfile[] {
    return predefinedProfiles;
  }

  public exportProfileConfig(
    profileId: string,
    format: 'claudeDesktop' | 'cursor' | 'rawMcp' | 'inBrowserScript',
  ): string {
    const profile = predefinedProfiles.find(p => p.id === profileId) ?? predefinedProfiles[0];
    if (format === 'inBrowserScript') {
      return profile.exportConfigs.inBrowserScript;
    }
    const configObj = profile.exportConfigs[format] ?? profile.exportConfigs.claudeDesktop;
    return JSON.stringify(configObj, null, 2);
  }

  public onToolsChanged(listener: (tools: Array<Omit<WebMCPTool, 'execute'>>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const tools = this.getActiveTools();
    for (const listener of this.listeners) {
      try {
        listener(tools);
      }
      catch {
        // ignore listener errors
      }
    }
  }
}

export const webmcpRegistry = new WebMCPRegistry();
