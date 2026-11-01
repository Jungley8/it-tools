<script setup lang="ts">
import { computed, ref } from 'vue';
import { analyzeTextTokens } from './token-calculator.service';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();
const promptText = ref('');

const analysis = computed(() => analyzeTextTokens(promptText.value));

const PRESET_SAMPLES = [
  {
    name: 'English Prompt',
    text: 'You are an expert AI software architect. Analyze the trade-offs of microservices versus modular monoliths for a high-throughput financial system, considering latency, operational overhead, and distributed transactions.',
  },
  {
    name: 'Chinese Prompt',
    text: '你是一位资深分布式系统架构师。请深入分析微服务架构与模块化单体架构在金融高频交易场景下的权衡取舍，重点阐述网络延迟、运维复杂度以及分布式事务一致性保证策略。',
  },
  {
    name: 'Code Snippet',
    text: `async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('Unreachable');
}`,
  },
];

function applyPreset(text: string) {
  promptText.value = text;
}

const { copy } = useCopy({
  source: () => `${analysis.value.stats.baseTokens} tokens (Chars: ${analysis.value.stats.characters}, Words: ${analysis.value.stats.words})`,
  text: 'Token statistics copied to clipboard',
  createToast: true,
});
</script>

<template>
  <div>
    <c-card :title="t('tools.token-calculator.input-title', 'Prompt / Input Text')">
      <div mb-3 flex flex-wrap gap-2>
        <span self-center text-xs op-60>{{ t('tools.token-calculator.samples', 'Presets:') }}</span>
        <c-button
          v-for="sample in PRESET_SAMPLES"
          :key="sample.name"
          size="small"
          @click="applyPreset(sample.text)"
        >
          {{ sample.name }}
        </c-button>
        <c-button
          v-if="promptText"
          size="small"
          @click="promptText = ''"
        >
          {{ t('tools.token-calculator.clear', 'Clear') }}
        </c-button>
      </div>

      <c-input-text
        v-model:value="promptText"
        multiline
        :placeholder="t('tools.token-calculator.placeholder', 'Paste or type your prompt, code, or article here...')"
        rows="7"
        monospace
      />

      <!-- Quick Metrics -->
      <div grid grid-cols-2 mt-4 gap-3 md:grid-cols-4>
        <n-statistic
          :label="t('tools.token-calculator.base-tokens', 'Estimated Tokens')"
          :value="analysis.stats.baseTokens"
        />
        <n-statistic
          :label="t('tools.token-calculator.characters', 'Characters')"
          :value="analysis.stats.characters"
        />
        <n-statistic
          :label="t('tools.token-calculator.words', 'Words')"
          :value="analysis.stats.words"
        />
        <n-statistic
          :label="t('tools.token-calculator.lines', 'Lines')"
          :value="analysis.stats.lines"
        />
      </div>

      <div mt-3 flex items-center justify-between text-xs op-75>
        <span>
          {{ t('tools.token-calculator.ratio', 'Tokens/Word') }}: {{ analysis.stats.tokensPerWord }} |
          {{ t('tools.token-calculator.char-ratio', 'Tokens/Char') }}: {{ analysis.stats.tokensPerChar }} |
          CJK: {{ analysis.stats.cjkCharacters }}
        </span>
        <c-button size="small" :disabled="!promptText" @click="copy()">
          {{ t('tools.token-calculator.copy-stats', 'Copy Stats') }}
        </c-button>
      </div>
    </c-card>

    <!-- Model Comparison Table -->
    <c-card mt-4 :title="t('tools.token-calculator.models-title', 'Model Cost & Context Comparison')">
      <div overflow-x-auto>
        <table w-full border-collapse text-left text-sm>
          <thead>
            <tr border-b border-neutral-200 dark:border-neutral-800>
              <th py-2 pr-4 font-semibold>
                {{ t('tools.token-calculator.model', 'Model') }}
              </th>
              <th px-3 py-2 font-semibold>
                {{ t('tools.token-calculator.provider', 'Provider') }}
              </th>
              <th px-3 py-2 font-semibold>
                {{ t('tools.token-calculator.tokens', 'Est. Tokens') }}
              </th>
              <th px-3 py-2 font-semibold>
                {{ t('tools.token-calculator.context-usage', 'Context %') }}
              </th>
              <th px-3 py-2 font-semibold>
                {{ t('tools.token-calculator.input-cost', 'Input Cost ($)') }}
              </th>
              <th py-2 pl-3 font-semibold>
                {{ t('tools.token-calculator.cached-cost', 'Cached Cost ($)') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in analysis.estimates"
              :key="item.model.id"

              border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900
            >
              <td py-2 pr-4 font-medium font-mono>
                {{ item.model.name }}
              </td>
              <td px-3 py-2 op-80>
                {{ item.model.provider }}
              </td>
              <td px-3 py-2 font-bold font-mono>
                {{ item.estimatedTokens.toLocaleString() }}
              </td>
              <td px-3 py-2 text-xs font-mono>
                <div flex items-center gap-2>
                  <n-progress
                    type="line"
                    :percentage="Math.min(100, Math.max(0.1, item.percentOfContext * 10))"
                    :show-indicator="false"
                    style="width: 60px"
                  />
                  <span>{{ item.percentOfContext }}%</span>
                </div>
              </td>
              <td px-3 py-2 text-green-600 font-mono dark:text-green-400>
                ${{ item.inputCostUSD < 0.000001 && item.inputCostUSD > 0 ? '< $0.000001' : item.inputCostUSD.toFixed(6) }}
              </td>
              <td py-2 pl-3 text-blue-600 font-mono dark:text-blue-400>
                ${{ item.cachedCostUSD < 0.000001 && item.cachedCostUSD > 0 ? '< $0.000001' : item.cachedCostUSD.toFixed(6) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div mt-3 text-xs op-60>
        * Prices based on public 1M tokens standard API pricing. Token multipliers account for BPE tokenizer variations across model architectures.
      </div>
    </c-card>
  </div>
</template>
