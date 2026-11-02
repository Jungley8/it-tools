export type JsonSchemaPropertyType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface WebMCPToolParameter {
  type: JsonSchemaPropertyType
  description: string
  enum?: string[]
  default?: unknown
  items?: {
    type: JsonSchemaPropertyType
    description?: string
  }
}

export interface WebMCPToolSchema {
  type: 'object'
  properties: Record<string, WebMCPToolParameter>
  required?: string[]
}

export interface WebMCPTool {
  name: string
  title: string
  description: string
  inputSchema: WebMCPToolSchema
  execute: (args: Record<string, any>) => Promise<any> | any
  category?: string
  scope: 'global' | 'route'
  routePath?: string
  sampleArgs?: Record<string, any>
}

export interface WebMCPToolSummary {
  name: string
  title: string
  description: string
  category: string
  path: string
  keywords: string[]
  isDirectlyExecutable: boolean
  scope: 'global' | 'route' | 'catalog'
}

export interface WebMCPCallResult {
  tool: string
  ok: boolean
  result?: any
  error?: string
  executionTimeMs: number
}

export interface WebMCPProfile {
  id: string
  name: string
  description: string
  toolNames: string[]
  exportConfigs: {
    claudeDesktop: Record<string, any>
    cursor: Record<string, any>
    rawMcp: Record<string, any>
    inBrowserScript: string
  }
}

export interface WebMCPBridgeRequest {
  type:
  | 'webmcp:ping'
  | 'webmcp:list_tools'
  | 'webmcp:call_tool'
  | 'webmcp:get_profiles'
  | 'webmcp:search_tools'
  id?: string
  tool?: string
  arguments?: Record<string, any>
  query?: string
}

export interface WebMCPBridgeResponse {
  type:
  | 'webmcp:pong'
  | 'webmcp:list_tools_response'
  | 'webmcp:call_tool_response'
  | 'webmcp:get_profiles_response'
  | 'webmcp:search_tools_response'
  | 'webmcp:tools_changed'
  id?: string
  ok?: boolean
  tools?: Array<Omit<WebMCPTool, 'execute'>>
  result?: any
  error?: string
  executionTimeMs?: number
  profiles?: WebMCPProfile[]
}

export interface WebMCPGlobalApi {
  version: string
  isNativeSupported: boolean
  listTools: () => Array<Omit<WebMCPTool, 'execute'>>
  searchTools: (
    query: string,
    options?: { category?: string; directlyExecutableOnly?: boolean },
  ) => WebMCPToolSummary[]
  getAllToolsSummary: () => WebMCPToolSummary[]
  getTool: (name: string) => WebMCPTool | undefined
  callTool: (name: string, args?: Record<string, any>) => Promise<WebMCPCallResult>
  registerTool: (tool: WebMCPTool) => void
  unregisterTool: (name: string) => boolean
  setRoute: (path: string) => void
  getProfiles: () => WebMCPProfile[]
  exportProfileConfig: (
    profileId: string,
    format: 'claudeDesktop' | 'cursor' | 'rawMcp' | 'inBrowserScript',
  ) => string
}

declare global {
  interface Window {
    __webmcp__?: WebMCPGlobalApi
  }
}
