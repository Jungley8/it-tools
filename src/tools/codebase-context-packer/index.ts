import { FileCode } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.codebase-context-packer.title'),
  path: '/codebase-context-packer',
  description: translate('tools.codebase-context-packer.description'),
  keywords: ['codebase', 'packer', 'context', 'llm', 'repomix', 'files', 'prompt', 'tree', 'ai'],
  component: () => import('./codebase-context-packer.vue'),
  icon: FileCode,
  createdAt: new Date('2026-11-01'),
});
