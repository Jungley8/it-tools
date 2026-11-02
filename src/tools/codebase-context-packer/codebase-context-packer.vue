<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  type CodeFile,
  type PackOptions,
  packCodebase,
} from './codebase-context-packer.service';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();

const files = ref<CodeFile[]>([
  {
    path: 'src/main.ts',
    content: `import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.mount('#app');`,
  },
  {
    path: 'src/services/api.ts',
    content: `export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch('/api/health');
  return res.json();
}`,
  },
  {
    path: 'README.md',
    content: `# Minimal Project
Fast, lightweight Vue 3 application built for speed.`,
  },
]);

const newFilePath = ref('');
const newFileContent = ref('');

const options = ref<PackOptions>({
  format: 'xml',
  includeFileTree: true,
  instructionPrompt: 'The following is the codebase context for your reference. Please analyze the code and fulfill the request.',
});

function addFile() {
  if (!newFilePath.value.trim() || !newFileContent.value.trim()) {
    return;
  }
  files.value.push({
    path: newFilePath.value.trim(),
    content: newFileContent.value,
  });
  newFilePath.value = '';
  newFileContent.value = '';
}

function removeFile(index: number) {
  files.value.splice(index, 1);
}

// File drop / input handling
async function handleFilesUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files) {
    return;
  }

  const uploadedFiles: FileList = target.files;
  for (let i = 0; i < uploadedFiles.length; i++) {
    const file = uploadedFiles[i];
    // Check if text file (skip obvious huge/binary)
    if (file.size > 1024 * 1024) {
      continue;
    } // max 1MB per file for safety

    try {
      const text = await file.text();
      // Relative path if supported by webkitRelativePath
      const path = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
      files.value.push({ path, content: text });
    }
    catch {
      // skip unreadable
    }
  }

  // Reset input
  target.value = '';
}

const packedResult = computed(() => {
  return packCodebase(files.value, options.value);
});

const { copy } = useCopy({
  source: () => packedResult.value.packedContent,
  text: t('tools.codebase-context-packer.copied'),
  createToast: true,
});

function downloadContext() {
  const blob = new Blob([packedResult.value.packedContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'llm-codebase-context.txt';
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div>
    <!-- Options & Batch Actions -->
    <c-card :title="t('tools.codebase-context-packer.options-title')">
      <div flex flex-wrap items-center justify-between gap-4>
        <div flex flex-wrap items-center gap-4>
          <n-radio-group v-model:value="options.format" size="small">
            <n-radio-button value="xml">
              {{ t('tools.codebase-context-packer.format-xml') }}
            </n-radio-button>
            <n-radio-button value="markdown">
              {{ t('tools.codebase-context-packer.format-markdown') }}
            </n-radio-button>
          </n-radio-group>

          <n-checkbox v-model:checked="options.includeFileTree">
            {{ t('tools.codebase-context-packer.include-tree') }}
          </n-checkbox>
        </div>

        <div flex items-center gap-2>
          <label class="n-button n-button--default-type n-button--small-type cursor-pointer">
            📁 {{ t('tools.codebase-context-packer.upload-btn') }}
            <input
              type="file"
              multiple
              style="display: none"
              @change="handleFilesUpload"
            >
          </label>

          <c-button size="small" :disabled="files.length === 0" @click="files = []">
            {{ t('tools.codebase-context-packer.clear-all') }}
          </c-button>
        </div>
      </div>

      <div mt-3>
        <div mb-1 text-xs op-75>
          {{ t('tools.codebase-context-packer.instruction-label') }}
        </div>
        <c-input-text
          v-model:value="options.instructionPrompt"
          :placeholder="t('tools.codebase-context-packer.instruction-placeholder')"
          size="small"
        />
      </div>
    </c-card>

    <div grid grid-cols-1 mt-4 gap-4 lg:grid-cols-2>
      <!-- Files Management -->
      <div flex flex-col gap-4>
        <!-- Existing Files List -->
        <c-card :title="t('tools.codebase-context-packer.batch-card', { count: files.length, tokens: packedResult.estimatedTokens.toLocaleString() })">
          <div max-h-72 flex flex-col gap-2 overflow-y-auto>
            <div
              v-for="(f, idx) in files"
              :key="idx"
              flex items-center justify-between border border-neutral-200 rounded p-2 text-xs dark:border-neutral-800
            >
              <div mr-2 truncate font-mono>
                📄 {{ f.path }}
              </div>
              <div flex items-center gap-2>
                <span op-60>{{ f.content.length.toLocaleString() }} chars</span>
                <c-button size="tiny" :title="t('tools.codebase-context-packer.remove-file')" @click="removeFile(idx)">
                  ✕
                </c-button>
              </div>
            </div>

            <div v-if="files.length === 0" py-6 text-center text-xs op-60>
              {{ t('tools.codebase-context-packer.no-files') }}
            </div>
          </div>
        </c-card>

        <!-- Manual Add File -->
        <c-card :title="t('tools.codebase-context-packer.add-file-title')">
          <div mb-2>
            <c-input-text
              v-model:value="newFilePath"
              :placeholder="t('tools.codebase-context-packer.file-path-placeholder')"
              size="small"
              monospace
            />
          </div>
          <div>
            <c-input-text
              v-model:value="newFileContent"
              multiline
              rows="4"
              :placeholder="t('tools.codebase-context-packer.file-content-placeholder')"
              monospace
            />
          </div>
          <div mt-2 flex justify-end>
            <c-button size="small" :disabled="!newFilePath || !newFileContent" @click="addFile">
              + {{ t('tools.codebase-context-packer.add-file-btn') }}
            </c-button>
          </div>
        </c-card>
      </div>

      <!-- Packed Result Output -->
      <c-card :title="t('tools.codebase-context-packer.output-title')">
        <template #header-extra>
          <div flex gap-2>
            <n-tag type="info" size="small" round>
              {{ packedResult.totalFiles }} files
            </n-tag>
            <n-tag type="success" size="small" round>
              ~{{ packedResult.estimatedTokens.toLocaleString() }} tokens
            </n-tag>
          </div>
        </template>

        <c-input-text
          :value="packedResult.packedContent"
          multiline
          readonly
          rows="16"
          monospace
        />

        <div mt-3 flex items-center justify-between>
          <span text-xs op-75>
            {{ packedResult.totalChars.toLocaleString() }} characters
          </span>
          <div flex gap-2>
            <c-button size="small" :disabled="!packedResult.packedContent" @click="downloadContext">
              💾 {{ t('tools.codebase-context-packer.download-txt') }}
            </c-button>
            <c-button type="primary" :disabled="!packedResult.packedContent" @click="copy()">
              {{ t('tools.codebase-context-packer.copy-context') }}
            </c-button>
          </div>
        </div>
      </c-card>
    </div>
  </div>
</template>
