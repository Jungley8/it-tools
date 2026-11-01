import { Wand } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.web-to-llm-markdown.title'),
  path: '/web-to-llm-markdown',
  description: translate('tools.web-to-llm-markdown.description'),
  keywords: ['html', 'markdown', 'llm', 'clean', 'web', 'converter', 'ai', 'prompt', 'rag', 'scraper'],
  component: () => import('./web-to-llm-markdown.vue'),
  icon: Wand,
  createdAt: new Date('2026-11-01'),
});
