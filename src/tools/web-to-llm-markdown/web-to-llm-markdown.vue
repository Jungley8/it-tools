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
  text: 'Cleaned Markdown copied to clipboard',
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
    <c-card :title="t('tools.web-to-llm-markdown.options-title', 'Conversion Options')">
      <div flex flex-wrap gap-4>
        <n-checkbox v-model:checked="options.stripImages">
          {{ t('tools.web-to-llm-markdown.opt-strip-images', 'Strip Image URLs (keep placeholder/alt only)') }}
        </n-checkbox>
        <n-checkbox v-model:checked="options.stripLinks">
          {{ t('tools.web-to-llm-markdown.opt-strip-links', 'Strip Link URLs (keep link text only)') }}
        </n-checkbox>
        <n-checkbox v-model:checked="options.compactBlankLines">
          {{ t('tools.web-to-llm-markdown.opt-compact', 'Compact excessive blank lines') }}
        </n-checkbox>
      </div>
    </c-card>

    <div grid grid-cols-1 mt-4 gap-4 lg:grid-cols-2>
      <!-- HTML Input -->
      <c-card :title="t('tools.web-to-llm-markdown.input-title', 'Raw HTML / Web Content')">
        <template #header-extra>
          <c-button size="small" @click="loadSample">
            {{ t('tools.web-to-llm-markdown.load-sample', 'Load Sample') }}
          </c-button>
        </template>

        <c-input-text
          v-model:value="rawHtml"
          multiline
          :placeholder="t('tools.web-to-llm-markdown.placeholder', 'Paste raw HTML, webpage source, or article markup here...')"
          rows="12"
          monospace
        />

        <div mt-3 flex items-center justify-between text-xs op-75>
          <span>{{ result.originalChars.toLocaleString() }} characters</span>
          <c-button size="small" :disabled="!rawHtml" @click="rawHtml = ''">
            {{ t('tools.web-to-llm-markdown.clear', 'Clear') }}
          </c-button>
        </div>
      </c-card>

      <!-- Cleaned Markdown Output -->
      <c-card :title="t('tools.web-to-llm-markdown.output-title', 'Clean LLM-Ready Markdown')">
        <template #header-extra>
          <n-tag v-if="result.savedPercent > 0" type="success" size="small" round>
            Saved {{ result.savedPercent }}% context (~{{ result.estimatedSavedTokens }} tokens)
          </n-tag>
        </template>

        <c-input-text
          :value="result.markdown"
          multiline
          readonly
          :placeholder="t('tools.web-to-llm-markdown.output-placeholder', 'Cleaned GFM Markdown will appear here...')"
          rows="12"
          monospace
        />

        <div mt-3 flex items-center justify-between>
          <span text-xs op-75>
            {{ result.cleanedChars.toLocaleString() }} characters
          </span>
          <c-button
            type="primary"
            :disabled="!result.markdown"
            @click="copy()"
          >
            {{ t('tools.web-to-llm-markdown.copy', 'Copy Clean Markdown') }}
          </c-button>
        </div>
      </c-card>
    </div>
  </div>
</template>
