import { Terminal2 } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.mcp-tool-generator.title'),
  path: '/mcp-tool-generator',
  description: translate('tools.mcp-tool-generator.description'),
  keywords: ['mcp', 'tool', 'function calling', 'agent', 'schema', 'anthropic', 'openai', 'zod', 'claude', 'ai'],
  component: () => import('./mcp-tool-generator.vue'),
  icon: Terminal2,
  createdAt: new Date('2026-11-01'),
});
