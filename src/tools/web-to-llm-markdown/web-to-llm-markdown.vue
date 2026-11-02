<script setup lang="ts">
import { computed, ref } from 'vue';
import { DEFAULT_WEB_TO_MD_OPTIONS, convertHtmlToLlmMarkdown } from './web-to-llm-markdown.service';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();

const rawHtml = ref('');
const options = ref({ ...DEFAULT_WEB_TO_MD_OPTIONS });

const result = computed(() => {
  return convertHtmlToLlmMarkdown(rawHtml.value, options.value);
});

const { copy } = useCopy({
  source: () => result.value.markdown,
  text: t('tools.web-to-llm-markdown.copied'),
  createToast: true,
});

const SAMPLE_HTML = `<div class="article-container" data-v-12345>
  <header class="post-header">
    <h1 class="title">Building Resilient Distributed Systems</h1>
    <div class="meta">By Alex · Published Oct 2026 · <span class="views">12k views</span></div>
  </header>

  <style>.banner-ad { display: block; background: #eee; }<\/style>
  <div class="banner-ad"><p>Special discount for developers! Click here.</p></div>

  <article class="content">
    <p>Modern applications require <strong>zero-downtime</strong> reliability and graceful degradation.</p>
    <h2>Key Architectural Patterns</h2>
    <ul>
      <li><strong>Circuit Breakers:</strong> Prevent cascading service failure.</li>
      <li><strong>Idempotency Keys:</strong> Ensure safe message retries.</li>
      <li><strong>Backpressure:</strong> Limit unbounded queues.</li>
    </ul>

    <pre><code class="language-typescript">interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
}</code></pre>

    <p>Read the official specification at <a href="https://example.com/spec">System Spec</a>.</p>
  </article>

  <script>console.log("analytics tracking loaded");<\/script>
</div>`;

function loadSample() {
  rawHtml.value = SAMPLE_HTML;
}
</script>

<template>
  <div>
    <c-card :title="t('tools.web-to-llm-markdown.options-title')">
      <div flex flex-wrap gap-4>
        <n-checkbox v-model:checked="options.stripImages">
          {{ t('tools.web-to-llm-markdown.opt-strip-images') }}
        </n-checkbox>
        <n-checkbox v-model:checked="options.stripLinks">
          {{ t('tools.web-to-llm-markdown.opt-strip-links') }}
        </n-checkbox>
        <n-checkbox v-model:checked="options.compactBlankLines">
          {{ t('tools.web-to-llm-markdown.opt-compact') }}
        </n-checkbox>
      </div>
    </c-card>

    <div grid grid-cols-1 mt-4 gap-4 lg:grid-cols-2>
      <!-- HTML Input -->
      <c-card :title="t('tools.web-to-llm-markdown.input-title')">
        <template #header-extra>
          <c-button size="small" @click="loadSample">
            {{ t('tools.web-to-llm-markdown.load-sample') }}
          </c-button>
        </template>

        <c-input-text
          v-model:value="rawHtml"
          multiline
          :placeholder="t('tools.web-to-llm-markdown.placeholder')"
          rows="12"
          monospace
        />

        <div mt-3 flex items-center justify-between text-xs op-75>
          <span>{{ result.originalChars.toLocaleString() }} {{ t('tools.web-to-llm-markdown.characters') }}</span>
          <c-button size="small" :disabled="!rawHtml" @click="rawHtml = ''">
            {{ t('tools.web-to-llm-markdown.clear') }}
          </c-button>
        </div>
      </c-card>

      <!-- Cleaned Markdown Output -->
      <c-card :title="t('tools.web-to-llm-markdown.output-title')">
        <template #header-extra>
          <n-tag v-if="result.savedPercent > 0" type="success" size="small" round>
            {{ t('tools.web-to-llm-markdown.saved-context', { percent: result.savedPercent, tokens: result.estimatedSavedTokens }) }}
          </n-tag>
        </template>

        <c-input-text
          :value="result.markdown"
          multiline
          readonly
          :placeholder="t('tools.web-to-llm-markdown.output-placeholder')"
          rows="12"
          monospace
        />

        <div mt-3 flex items-center justify-between>
          <span text-xs op-75>
            {{ result.cleanedChars.toLocaleString() }} {{ t('tools.web-to-llm-markdown.characters') }}
          </span>
          <c-button
            type="primary"
            :disabled="!result.markdown"
            @click="copy()"
          >
            {{ t('tools.web-to-llm-markdown.copy') }}
          </c-button>
        </div>
      </c-card>
    </div>
  </div>
</template>
