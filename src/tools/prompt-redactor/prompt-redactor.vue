<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStorage } from '@vueuse/core';
import { DEFAULT_REDACTOR_OPTIONS, redactText, restoreText } from './prompt-redactor.service';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();

const activeTab = ref<'redact' | 'restore'>('redact');

// Redact State
const rawInput = ref('');
const options = ref({ ...DEFAULT_REDACTOR_OPTIONS });
const customKeywordsInput = ref('');

// Persistent Session Mapping
const savedMappings = useStorage<Record<string, string>>('prompt-redactor:mappings', {});

const redactResult = computed(() => {
  const customKeywords = customKeywordsInput.value
    .split(/[,;\n]/)
    .map(s => s.trim())
    .filter(Boolean);

  return redactText(rawInput.value, {
    ...options.value,
    customKeywords,
  });
});

function applyRedact() {
  if (redactResult.value.mappings && Object.keys(redactResult.value.mappings).length > 0) {
    savedMappings.value = { ...savedMappings.value, ...redactResult.value.mappings };
  }
}

// Restore State
const llmResponseInput = ref('');
const restoredOutput = computed(() => {
  return restoreText(llmResponseInput.value, savedMappings.value);
});

const { copy: copyRedacted } = useCopy({
  source: () => redactResult.value.redactedText,
  text: 'Redacted prompt copied to clipboard',
  createToast: true,
});

const { copy: copyRestored } = useCopy({
  source: () => restoredOutput.value,
  text: 'Restored text copied to clipboard',
  createToast: true,
});

const PRESET_SAMPLE = `Debugging connection failure:
User: admin@company-internal.com (Phone: 13912345678)
Target server: 10.0.4.25
OpenAI API key used: sk-ant-api03-abcdef1234567890abcdef123456
AWS bucket: AKIAIOSFODNN7EXAMPLE
Please write an asynchronous python script to reconnect to the database and retry if authentication fails.`;

function loadSample() {
  rawInput.value = PRESET_SAMPLE;
}
</script>

<template>
  <div>
    <div mb-4 flex justify-center>
      <n-radio-group v-model:value="activeTab" size="medium">
        <n-radio-button value="redact">
          {{ t('tools.prompt-redactor.tab-redact', '1. Redact Secrets (脱敏)') }}
        </n-radio-button>
        <n-radio-button value="restore">
          {{ t('tools.prompt-redactor.tab-restore', '2. Restore in AI Response (还原)') }}
        </n-radio-button>
      </n-radio-group>
    </div>

    <!-- REDACT VIEW -->
    <div v-if="activeTab === 'redact'">
      <c-card :title="t('tools.prompt-redactor.options-title', 'Detection Rules')">
        <div flex flex-wrap gap-4>
          <n-checkbox v-model:checked="options.apiKeys">
            {{ t('tools.prompt-redactor.opt-apikeys', 'API Keys & Tokens') }}
          </n-checkbox>
          <n-checkbox v-model:checked="options.emails">
            {{ t('tools.prompt-redactor.opt-emails', 'Email Addresses') }}
          </n-checkbox>
          <n-checkbox v-model:checked="options.ipAddresses">
            {{ t('tools.prompt-redactor.opt-ips', 'IPv4 Addresses') }}
          </n-checkbox>
          <n-checkbox v-model:checked="options.phoneNumbers">
            {{ t('tools.prompt-redactor.opt-phones', 'Phone Numbers') }}
          </n-checkbox>
          <n-checkbox v-model:checked="options.idCards">
            {{ t('tools.prompt-redactor.opt-idcards', 'ID Cards') }}
          </n-checkbox>
        </div>

        <div mt-3>
          <div mb-1 text-xs op-75>
            {{ t('tools.prompt-redactor.custom-keywords-label', 'Custom Keywords to mask (comma or newline separated):') }}
          </div>
          <c-input-text
            v-model:value="customKeywordsInput"
            placeholder="e.g. MySecretProject, internal.corp.net"
            size="small"
          />
        </div>
      </c-card>

      <div grid grid-cols-1 mt-4 gap-4 lg:grid-cols-2>
        <!-- Raw Input -->
        <c-card :title="t('tools.prompt-redactor.raw-title', 'Original Text / Prompt / Logs')">
          <template #header-extra>
            <c-button size="small" @click="loadSample">
              {{ t('tools.prompt-redactor.sample-btn', 'Load Sample') }}
            </c-button>
          </template>

          <c-input-text
            v-model:value="rawInput"
            multiline
            :placeholder="t('tools.prompt-redactor.raw-placeholder', 'Paste code, logs, or prompt containing sensitive credentials...')"
            rows="10"
            monospace
          />

          <div mt-3 flex items-center justify-between text-xs op-75>
            <span>{{ rawInput.length }} characters</span>
            <c-button size="small" :disabled="!rawInput" @click="rawInput = ''">
              {{ t('tools.prompt-redactor.clear', 'Clear') }}
            </c-button>
          </div>
        </c-card>

        <!-- Redacted Output -->
        <c-card :title="t('tools.prompt-redactor.redacted-title', 'Safe Prompt for AI (Masked)')">
          <template #header-extra>
            <n-tag v-if="redactResult.stats.total > 0" type="success" size="small" round>
              {{ redactResult.stats.total }} secrets masked
            </n-tag>
          </template>

          <c-input-text
            :value="redactResult.redactedText"
            multiline
            readonly
            :placeholder="t('tools.prompt-redactor.redacted-placeholder', 'Masked result will appear here ready to paste into ChatGPT/Claude...')"
            rows="10"
            monospace
          />

          <div mt-3 flex items-center justify-between>
            <div flex flex-wrap gap-2 text-xs op-75>
              <span v-if="redactResult.stats.apiKeys > 0">Keys: {{ redactResult.stats.apiKeys }}</span>
              <span v-if="redactResult.stats.emails > 0">Emails: {{ redactResult.stats.emails }}</span>
              <span v-if="redactResult.stats.ipAddresses > 0">IPs: {{ redactResult.stats.ipAddresses }}</span>
              <span v-if="redactResult.stats.phoneNumbers > 0">Phones: {{ redactResult.stats.phoneNumbers }}</span>
            </div>
            <c-button
              type="primary"
              :disabled="!redactResult.redactedText"
              @click="() => { applyRedact(); copyRedacted(); }"
            >
              {{ t('tools.prompt-redactor.copy-redacted', 'Save & Copy Safe Prompt') }}
            </c-button>
          </div>
        </c-card>
      </div>
    </div>

    <!-- RESTORE VIEW -->
    <div v-else>
      <div grid grid-cols-1 gap-4 lg:grid-cols-2>
        <c-card :title="t('tools.prompt-redactor.ai-response-title', 'Paste AI Response (with {{REDACTED_...}} tags)')">
          <c-input-text
            v-model:value="llmResponseInput"
            multiline
            :placeholder="t('tools.prompt-redactor.ai-response-placeholder', 'Paste the response generated by AI containing {{REDACTED_API_KEY_1}} etc...')"
            rows="12"
            monospace
          />

          <div mt-3 flex items-center justify-between text-xs op-75>
            <span>Active Mappings: {{ Object.keys(savedMappings).length }} placeholders</span>
            <c-button
              size="small"
              :disabled="Object.keys(savedMappings).length === 0"
              @click="savedMappings = {}"
            >
              {{ t('tools.prompt-redactor.clear-mappings', 'Clear Mappings') }}
            </c-button>
          </div>
        </c-card>

        <c-card :title="t('tools.prompt-redactor.restored-title', 'Restored Text (Original Credentials Restored)')">
          <c-input-text
            :value="restoredOutput"
            multiline
            readonly
            :placeholder="t('tools.prompt-redactor.restored-placeholder', 'Restored code and credentials will appear here...')"
            rows="12"
            monospace
          />

          <div mt-3 flex justify-end>
            <c-button
              type="primary"
              :disabled="!restoredOutput"
              @click="copyRestored()"
            >
              {{ t('tools.prompt-redactor.copy-restored', 'Copy Restored Code') }}
            </c-button>
          </div>
        </c-card>
      </div>
    </div>
  </div>
</template>
