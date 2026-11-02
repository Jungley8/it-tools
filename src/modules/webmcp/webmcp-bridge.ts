import { webmcpRegistry } from './webmcp.service';
import type { WebMCPBridgeRequest, WebMCPGlobalApi, WebMCPTool } from './webmcp.types';

let bridgeInstalled = false;

export function isNativeModelContextSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const hasNav = typeof navigator !== 'undefined' && 'modelContext' in navigator;
  const hasDoc = typeof document !== 'undefined' && 'modelContext' in document;
  return Boolean(hasNav || hasDoc);
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
  const modelContextShim = {
    registerTool: (tool: any) => webmcpRegistry.registerTool(tool),
    unregisterTool: (name: string) => webmcpRegistry.unregisterTool(name),
    listTools: () => webmcpRegistry.getActiveTools(),
    callTool: (name: string, args: any) => webmcpRegistry.callTool(name, args),
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

    const target = event.source as Window | null;
    const origin = event.origin || '*';

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

  // Broadcast tools change to both postMessage and DOM CustomEvent
  webmcpRegistry.onToolsChanged((tools) => {
    try {
      window.dispatchEvent(new CustomEvent('webmcp:tools_changed', { detail: { tools } }));
      window.postMessage({ type: 'webmcp:tools_changed', tools }, '*');
    }
    catch {
      // ignore dispatch issues
    }
  });

  bridgeInstalled = true;
  return api;
}
