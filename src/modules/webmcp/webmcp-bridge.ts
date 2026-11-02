import { webmcpRegistry } from './webmcp.service';
import { searchCatalogTools } from './webmcp-catalog';
import type { WebMCPBridgeRequest, WebMCPGlobalApi, WebMCPTool } from './webmcp.types';

let bridgeInstalled = false;

const nativeAbortControllers = new Map<string, AbortController>();

export function isNativeModelContextSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const navMc = typeof navigator !== 'undefined' ? (navigator as any).modelContext : undefined;
  const docMc = typeof document !== 'undefined' ? (document as any).modelContext : undefined;
  const isNavNative = Boolean(navMc && !navMc.isShim && !navMc[Symbol.for('webmcp.shim')]);
  const isDocNative = Boolean(docMc && !docMc.isShim && !docMc[Symbol.for('webmcp.shim')]);
  return isNavNative || isDocNative;
}

export function syncWithNativeModelContext(_tools?: Array<Omit<WebMCPTool, 'execute'>>) {
  if (typeof window === 'undefined') {
    return;
  }
  const docMc = typeof document !== 'undefined' ? (document as any).modelContext : null;
  const navMc = typeof navigator !== 'undefined' ? (navigator as any).modelContext : null;
  const mcTargets = [docMc, navMc].filter(mc => mc && !mc[Symbol.for('webmcp.shim')] && typeof mc.registerTool === 'function');

  if (mcTargets.length === 0) {
    return;
  }

  // Register all core tools + active tools into native modelContext
  const allExecTools = webmcpRegistry.getAllExecutableTools();
  const activeTools = webmcpRegistry.getActiveTools();
  const toolsToRegister = [...allExecTools, ...activeTools];

  const seen = new Set<string>();
  for (const tool of toolsToRegister) {
    if (seen.has(tool.name)) {
      continue;
    }
    seen.add(tool.name);

    if (nativeAbortControllers.has(tool.name)) {
      continue;
    }

    const fullTool = webmcpRegistry.getTool(tool.name);
    if (!fullTool) {
      continue;
    }

    const controller = new AbortController();
    nativeAbortControllers.set(tool.name, controller);

    for (const mc of mcTargets) {
      try {
        const regPromise = mc.registerTool(
          {
            name: fullTool.name,
            description: fullTool.description,
            inputSchema: fullTool.inputSchema,
            execute: async (args: any) => {
              const res = await fullTool.execute(args ?? {});
              return res.result !== undefined ? res.result : res;
            },
          },
          { signal: controller.signal },
        );
        if (regPromise && typeof regPromise.catch === 'function') {
          regPromise.catch(() => {});
        }
      }
      catch {
        // ignore registration errors from native engine
      }
    }
  }
}

export function installWebMCPBridge(): WebMCPGlobalApi | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (bridgeInstalled && window.__webmcp__) {
    return window.__webmcp__;
  }

  const isNative = isNativeModelContextSupported();

  const api: WebMCPGlobalApi = {
    version: '1.0.0',
    isNativeSupported: isNative,
    listTools: () => webmcpRegistry.getActiveTools(),
    searchTools: (query, options) => searchCatalogTools(query, options),
    getAllToolsSummary: () => webmcpRegistry.getAllToolsSummary(),
    getTool: (name: string) => webmcpRegistry.getTool(name),
    callTool: (name: string, args?: Record<string, any>) => webmcpRegistry.callTool(name, args ?? {}),
    registerTool: (tool: WebMCPTool) => webmcpRegistry.registerTool(tool),
    unregisterTool: (name: string) => webmcpRegistry.unregisterTool(name),
    setRoute: (path: string) => webmcpRegistry.setRoute(path),
    getProfiles: () => webmcpRegistry.getProfiles(),
    exportProfileConfig: (profileId, format) => webmcpRegistry.exportProfileConfig(profileId, format),
  };

  window.__webmcp__ = api;

  // Polyfill navigator.modelContext & document.modelContext if not present
  const toolsStore = new Map<string, any>();

  const getShimTools = () => {
    const list = [...webmcpRegistry.getAllExecutableTools(), ...webmcpRegistry.getActiveTools()];
    const unique = new Map<string, any>();
    for (const t of list) {
      if (!unique.has(t.name)) {
        unique.set(t.name, {
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          execute: async (args: any) => {
            const res = await webmcpRegistry.callTool(t.name, args ?? {});
            return res.result !== undefined ? res.result : res;
          },
        });
      }
    }
    for (const [k, v] of toolsStore) {
      unique.set(k, v);
    }
    return Array.from(unique.values());
  };

  const modelContextShim = {
    isShim: true,
    [Symbol.for('webmcp.shim')]: true,
    get tools() {
      return getShimTools();
    },
    registerTool: async (tool: any, options?: { signal?: AbortSignal }) => {
      toolsStore.set(tool.name, tool);
      webmcpRegistry.registerTool(tool);
      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          toolsStore.delete(tool.name);
          webmcpRegistry.unregisterTool(tool.name);
        });
      }
    },
    unregisterTool: async (name: string) => {
      toolsStore.delete(name);
      return webmcpRegistry.unregisterTool(name);
    },
    getTools: async () => getShimTools(),
    listTools: async () => getShimTools(),
    callTool: async (name: string, args?: any) => webmcpRegistry.callTool(name, args),
    executeTool: async (name: string, args?: any) => webmcpRegistry.callTool(name, args),
    getTool: (name: string) => webmcpRegistry.getTool(name),
    addEventListener: (event: string, cb: any) => window.addEventListener(`webmcp:${event}`, cb),
    removeEventListener: (event: string, cb: any) => window.removeEventListener(`webmcp:${event}`, cb),
  };

  try {
    if (typeof navigator !== 'undefined' && !('modelContext' in navigator)) {
      Object.defineProperty(navigator, 'modelContext', {
        value: modelContextShim,
        configurable: true,
        writable: true,
      });
    }
    if (typeof document !== 'undefined' && !('modelContext' in document)) {
      Object.defineProperty(document, 'modelContext', {
        value: modelContextShim,
        configurable: true,
        writable: true,
      });
    }
  }
  catch {
    // In restricted iframe or strict environments, silently catch assignment issues
  }

  // Set up PostMessage communication
  const handlePostMessage = async (event: MessageEvent) => {
    const data = event.data as WebMCPBridgeRequest;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string' || !data.type.startsWith('webmcp:')) {
      return;
    }

    const target = (event.source as Window | null) ?? (typeof window !== 'undefined' ? window : null);
    const origin = (event.origin && event.origin !== 'null')
      ? event.origin
      : ((typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') ? window.location.origin : '*');

    switch (data.type) {
      case 'webmcp:ping': {
        target?.postMessage({ type: 'webmcp:pong', id: data.id, timestamp: Date.now() }, origin);
        break;
      }

      case 'webmcp:list_tools': {
        const tools = webmcpRegistry.getActiveTools();
        target?.postMessage({ type: 'webmcp:list_tools_response', id: data.id, tools }, origin);
        break;
      }

      case 'webmcp:search_tools': {
        const query = data.query ?? '';
        const searchRes = await webmcpRegistry.callTool('search_tools', { query, ...(data.arguments ?? {}) });
        target?.postMessage(
          {
            type: 'webmcp:search_tools_response',
            id: data.id,
            ok: searchRes.ok,
            result: searchRes.result,
            error: searchRes.error,
          },
          origin,
        );
        break;
      }

      case 'webmcp:call_tool': {
        const toolName = data.tool ?? '';
        const args = data.arguments ?? {};
        const callRes = await webmcpRegistry.callTool(toolName, args);
        target?.postMessage(
          {
            type: 'webmcp:call_tool_response',
            id: data.id,
            ok: callRes.ok,
            result: callRes.result,
            error: callRes.error,
            executionTimeMs: callRes.executionTimeMs,
          },
          origin,
        );
        break;
      }

      case 'webmcp:get_profiles': {
        const profiles = webmcpRegistry.getProfiles();
        target?.postMessage({ type: 'webmcp:get_profiles_response', id: data.id, profiles }, origin);
        break;
      }
    }
  };

  window.addEventListener('message', handlePostMessage);

  // Sync to native modelContext if supported
  webmcpRegistry.onToolsChanged(syncWithNativeModelContext);
  syncWithNativeModelContext(webmcpRegistry.getActiveTools());

  // Broadcast tools change to both postMessage and DOM CustomEvent
  webmcpRegistry.onToolsChanged((tools) => {
    try {
      window.dispatchEvent(new CustomEvent('webmcp:tools_changed', { detail: { tools } }));
      const targetOrigin = (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null')
        ? window.location.origin
        : '*';
      window.postMessage({ type: 'webmcp:tools_changed', tools }, targetOrigin);
    }
    catch {
      // ignore dispatch issues
    }
  });

  bridgeInstalled = true;
  return api;
}
