import { Cpu } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.token-calculator.title'),
  path: '/token-calculator',
  description: translate('tools.token-calculator.description'),
  keywords: ['token', 'calculator', 'llm', 'gpt', 'claude', 'deepseek', 'pricing', 'tokenizer', 'ai', 'cost'],
  component: () => import('./token-calculator.vue'),
  icon: Cpu,
  createdAt: new Date('2026-11-01'),
});
