import { ApiApp } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.webmcp.title'),
  path: '/webmcp',
  description: translate('tools.webmcp.description'),
  keywords: ['webmcp', 'mcp', 'agent', 'modelcontext', 'ai', 'tools', 'llm', 'claude', 'cursor'],
  component: () => import('./webmcp.vue'),
  icon: ApiApp,
  createdAt: new Date('2026-11-02'),
});
