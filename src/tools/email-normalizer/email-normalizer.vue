<script setup lang="ts">
import { normalizeEmail } from 'email-normalizer';
import { withDefaultOnError } from '@/utils/defaults';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();
const emails = ref('');
const normalizedEmails = computed(() => {
  if (!emails.value) {
    return '';
  }

  return emails.value
    .split('\n')
    .map((email) => {
      return withDefaultOnError(() => normalizeEmail({ email }), `Unable to parse email: ${email}`);
    })
    .join('\n');
});

const { copy } = useCopy({ source: normalizedEmails, text: 'Normalized emails copied to the clipboard', createToast: true });
</script>

<template>
  <div>
    <div class="mb-2">
      {{ $t('tools.email-normalizer.raw') }}:
    </div>
    <c-input-text
      v-model:value="emails"
      :placeholder="t('tools.email-normalizer.raw-placeholder')"
      rows="3"
      multiline
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      autofocus
      monospace
    />

    <div class="mb-2 mt-4">
      {{ $t('tools.email-normalizer.normalized') }}:
    </div>
    <c-input-text
      :value="normalizedEmails"
      :placeholder="t('tools.email-normalizer.normalized-placeholder')"
      rows="3"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      multiline
      readonly
      monospace
    />
    <div class="mt-4 flex justify-center gap-2">
      <c-button @click="emails = ''">
        {{ $t('tools.email-normalizer.clear') }}
      </c-button>
      <c-button :disabled="!normalizedEmails" @click="copy()">
        {{ $t('tools.email-normalizer.copy') }}
      </c-button>
    </div>
  </div>
</template>
