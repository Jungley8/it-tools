import { ShieldLock } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.prompt-redactor.title'),
  path: '/prompt-redactor',
  description: translate('tools.prompt-redactor.description'),
  keywords: ['prompt', 'redactor', 'pii', 'privacy', 'secret', 'mask', 'restore', 'security', 'ai', 'anonymizer'],
  component: () => import('./prompt-redactor.vue'),
  icon: ShieldLock,
  createdAt: new Date('2026-11-01'),
});
