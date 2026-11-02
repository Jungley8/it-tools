<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  IconCheck,
  IconCopy,
  IconCpu,
  IconFileCode,
  IconListDetails,
  IconPlayerPlay,
  IconRoute,
  IconSearch,
  IconTerminal2,
} from '@tabler/icons-vue';
import { isNativeModelContextSupported } from '@/modules/webmcp/webmcp-bridge';
import { webmcpRegistry } from '@/modules/webmcp/webmcp.service';
import type { WebMCPProfile, WebMCPTool, WebMCPToolSummary } from '@/modules/webmcp/webmcp.types';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();
const message = useMessage();

const isNative = ref(isNativeModelContextSupported());
const activeTools = ref<Array<Omit<WebMCPTool, 'execute'>>>(webmcpRegistry.getActiveTools());
const currentRoute = ref(webmcpRegistry.getCurrentRoute());
const expandedSchemas = ref<Record<string, boolean>>({});

// Tab selection
const currentTab = ref('inspector');

// Unsubscribe tools changed listener
let unsubscribe: (() => void) | null = null;

onMounted(() => {
  isNative.value = isNativeModelContextSupported();
  activeTools.value = webmcpRegistry.getActiveTools();
  currentRoute.value = webmcpRegistry.getCurrentRoute();

  unsubscribe = webmcpRegistry.onToolsChanged((tools) => {
    activeTools.value = tools;
    currentRoute.value = webmcpRegistry.getCurrentRoute();
  });
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

// Route simulation for demonstration
const simulatedRoutes = [
  { label: '/webmcp (Control Center)', value: '/webmcp' },
  { label: '/token-calculator (AI)', value: '/token-calculator' },
  { label: '/prompt-redactor (AI)', value: '/prompt-redactor' },
  { label: '/web-to-llm-markdown (AI)', value: '/web-to-llm-markdown' },
  { label: '/codebase-context-packer (AI)', value: '/codebase-context-packer' },
  { label: '/hash-text (Crypto)', value: '/hash-text' },
  { label: '/uuid-generator (Crypto)', value: '/uuid-generator' },
  { label: '/base64-string-converter (Converter)', value: '/base64-string-converter' },
  { label: '/case-converter (Converter)', value: '/case-converter' },
  { label: '/url-encoder (Web)', value: '/url-encoder' },
  { label: '/ (Home)', value: '/' },
];

function simulateRouteChange(routePath: string) {
  webmcpRegistry.setRoute(routePath);
  currentRoute.value = routePath;
}

function toggleSchema(name: string) {
  expandedSchemas.value[name] = !expandedSchemas.value[name];
}

const { copy: copyText } = useCopy();

function copyToolSchema(tool: Omit<WebMCPTool, 'execute'>) {
  copyText(JSON.stringify(tool.inputSchema, null, 2));
  message.success(t('tools.webmcp.inspector.schemaCopied'));
}

// Playground state
const allExecutableTools = computed(() => {
  const globalList = [
    webmcpRegistry.getTool('search_tools'),
    webmcpRegistry.getTool('execute_tool'),
  ].filter(Boolean) as WebMCPTool[];

  const executables = webmcpRegistry.getAllExecutableTools();
  const seen = new Set<string>();
  const combined: WebMCPTool[] = [];

  for (const t of [...globalList, ...executables]) {
    if (!seen.has(t.name)) {
      seen.add(t.name);
      combined.push(t);
    }
  }
  return combined;
});

const toolOptions = computed(() =>
  allExecutableTools.value.map(tool => ({
    label: `${tool.title} (${tool.name})`,
    value: tool.name,
  })),
);

const selectedPlaygroundToolName = ref('token_calculator');
const inputJson = ref(
  JSON.stringify(
    webmcpRegistry.getTool('token_calculator')?.sampleArgs
      ?? { text: 'Analyze prompt token cost.' },
    null,
    2,
  ),
);

function onSelectToolChange(name: string) {
  selectedPlaygroundToolName.value = name;
  const tool = webmcpRegistry.getTool(name);
  if (tool?.sampleArgs) {
    inputJson.value = JSON.stringify(tool.sampleArgs, null, 2);
  }
  else {
    inputJson.value = '{}';
  }
}

const isExecuting = ref(false);
const executionResult = ref<any>(null);
const executionLatency = ref<number | null>(null);
const executionError = ref<string | null>(null);

async function runPlaygroundTool() {
  executionError.value = null;
  executionResult.value = null;
  executionLatency.value = null;

  let parsedArgs: Record<string, any> = {};
  try {
    parsedArgs = JSON.parse(inputJson.value || '{}');
  }
  catch {
    executionError.value = t('tools.webmcp.playground.invalidJson');
    return;
  }

  isExecuting.value = true;
  try {
    const res = await webmcpRegistry.callTool(selectedPlaygroundToolName.value, parsedArgs);
    executionLatency.value = res.executionTimeMs;
    if (res.ok) {
      executionResult.value = res.result;
    }
    else {
      executionError.value = res.error || 'Execution failed.';
    }
  }
  catch (err: any) {
    executionError.value = err?.message || 'Unexpected execution error.';
  }
  finally {
    isExecuting.value = false;
  }
}

function copyPlaygroundResult() {
  if (executionResult.value) {
    copyText(JSON.stringify(executionResult.value, null, 2));
    message.success(t('tools.webmcp.playground.resultCopied'));
  }
}

// Profiles state
const profiles = computed<WebMCPProfile[]>(() => webmcpRegistry.getProfiles());
const selectedProfileId = ref('ai-engineering');
const selectedFormat = ref<'claudeDesktop' | 'cursor' | 'rawMcp' | 'inBrowserScript'>('claudeDesktop');

const profileExportCode = computed(() => {
  return webmcpRegistry.exportProfileConfig(selectedProfileId.value, selectedFormat.value);
});

function copyProfileConfig() {
  copyText(profileExportCode.value);
  message.success(t('tools.webmcp.profiles.configCopied'));
}

// Directory state
const allCatalogTools = computed<WebMCPToolSummary[]>(() => webmcpRegistry.getAllToolsSummary());
const searchQuery = ref('');
const selectedCategory = ref('ALL');
const executableOnlyFilter = ref(false);

const categoryOptions = computed(() => {
  const set = new Set<string>();
  for (const t of allCatalogTools.value) {
    if (t.category) {
      set.add(t.category);
    }
  }
  return [
    { label: t('tools.webmcp.directory.allCategories'), value: 'ALL' },
    ...Array.from(set).map(c => ({ label: c, value: c })),
  ];
});

const filteredCatalogTools = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const cat = selectedCategory.value;
  const execOnly = executableOnlyFilter.value;

  return allCatalogTools.value.filter((tool) => {
    if (execOnly && !tool.isDirectlyExecutable) {
      return false;
    }
    if (cat !== 'ALL' && tool.category !== cat) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      tool.name.toLowerCase().includes(q)
      || tool.title.toLowerCase().includes(q)
      || tool.description.toLowerCase().includes(q)
      || tool.keywords.some(k => k.toLowerCase().includes(q))
    );
  });
});

function jumpToPlayground(toolName: string) {
  currentTab.value = 'playground';
  onSelectToolChange(toolName);
}
</script>

<template>
  <div class="webmcp-container">
    <!-- Status Metrics Grid -->
    <div grid grid-cols-1 mb-4 gap-3 lg:grid-cols-4 sm:grid-cols-2>
      <c-card>
        <div flex items-center justify-between>
          <div>
            <div text-xs font-semibold tracking-wider uppercase op-60>
              {{ t('tools.webmcp.status.nativeSupported') }}
            </div>
            <div mt-1 text-sm font-medium>
              <n-tag :type="isNative ? 'success' : 'info'" size="small" round>
                {{ isNative ? t('tools.webmcp.status.nativeActive') : t('tools.webmcp.status.shimActive') }}
              </n-tag>
            </div>
          </div>
          <n-icon size="28" :component="IconCpu" class="text-emerald-500 op-80" />
        </div>
      </c-card>

      <c-card>
        <div flex items-center justify-between>
          <div>
            <div text-xs font-semibold tracking-wider uppercase op-60>
              {{ t('tools.webmcp.status.postMessageActive') }}
            </div>
            <div mt-1 text-sm font-medium>
              <n-tag type="success" size="small" round>
                {{ t('tools.webmcp.status.bridgeActive') }}
              </n-tag>
            </div>
          </div>
          <n-icon size="28" :component="IconTerminal2" class="text-sky-500 op-80" />
        </div>
      </c-card>

      <c-card>
        <div flex items-center justify-between>
          <div>
            <div text-xs font-semibold tracking-wider uppercase op-60>
              {{ t('tools.webmcp.status.routeJitActive') }}
            </div>
            <div mt-1 text-xs font-medium font-mono>
              <n-tag type="warning" size="small" round>
                {{ currentRoute }}
              </n-tag>
            </div>
          </div>
          <n-icon size="28" :component="IconRoute" class="text-amber-500 op-80" />
        </div>
      </c-card>

      <c-card>
        <div flex items-center justify-between>
          <div>
            <div text-xs font-semibold tracking-wider uppercase op-60>
              {{ t('tools.webmcp.status.activeToolsCount') }}
            </div>
            <div mt-1 text-lg font-bold>
              {{ activeTools.length }} <span text-xs font-normal op-60>/ {{ allCatalogTools.length }} total</span>
            </div>
          </div>
          <n-icon size="28" :component="IconListDetails" class="text-purple-500 op-80" />
        </div>
      </c-card>
    </div>

    <!-- Main Navigation Tabs -->
    <c-card>
      <n-tabs v-model:value="currentTab" type="line" animated>
        <!-- Tab 1: Inspector & JIT Status -->
        <n-tab-pane name="inspector" :tab="t('tools.webmcp.tabs.inspector')">
          <div flex flex-col gap-4 py-2>
            <div border border-blue-500:20 rounded-lg bg-blue-500:5 p-3 text-xs leading-relaxed dark:bg-blue-500:10>
              💡 {{ t('tools.webmcp.inspector.jitNotice') }}
            </div>

            <!-- Route switch demo -->
            <div flex flex-wrap items-center gap-2>
              <span text-xs font-semibold op-70>{{ t('tools.webmcp.inspector.simulateRoute') }}:</span>
              <n-button
                v-for="r in simulatedRoutes"
                :key="r.value"
                size="tiny"
                :type="currentRoute === r.value ? 'primary' : 'default'"
                round
                @click="simulateRouteChange(r.value)"
              >
                {{ r.label }}
              </n-button>
            </div>

            <!-- Active Mounted Tools List -->
            <div mt-2 flex flex-col gap-3>
              <div
                v-for="tool in activeTools"
                :key="tool.name"
                border border-neutral-200 rounded-lg p-3 dark:border-neutral-800
              >
                <div flex flex-wrap items-center justify-between gap-2>
                  <div flex items-center gap-2>
                    <span text-sm font-semibold font-mono>{{ tool.name }}</span>
                    <n-tag
                      size="small"
                      :type="tool.scope === 'global' ? 'success' : 'warning'"
                      round
                    >
                      {{ tool.scope === 'global' ? t('tools.webmcp.inspector.scopeGlobal') : t('tools.webmcp.inspector.scopeRoute') }}
                    </n-tag>
                    <span v-if="tool.category" text-xs op-60>[{{ tool.category }}]</span>
                    <span v-if="tool.routePath" text-xs text-sky-500 font-mono op-80>{{ tool.routePath }}</span>
                  </div>

                  <div flex items-center gap-2>
                    <c-button size="tiny" variant="text" @click="toggleSchema(tool.name)">
                      {{ expandedSchemas[tool.name] ? t('tools.webmcp.inspector.hideSchema') : t('tools.webmcp.inspector.viewSchema') }}
                    </c-button>
                    <c-button size="tiny" @click="copyToolSchema(tool)">
                      <n-icon size="14" :component="IconCopy" mr-1 />
                      {{ t('tools.webmcp.inspector.copySchema') }}
                    </c-button>
                  </div>
                </div>

                <div mt-1 text-xs op-80>
                  {{ tool.description }}
                </div>

                <div v-if="expandedSchemas[tool.name]" mt-3>
                  <pre max-h-60 overflow-y-auto rounded bg-neutral-900 p-2 text-xs text-emerald-400 font-mono>{{ JSON.stringify(tool.inputSchema, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- Tab 2: Interactive Playground -->
        <n-tab-pane name="playground" :tab="t('tools.webmcp.tabs.playground')">
          <div flex flex-col gap-4 py-2>
            <div grid grid-cols-1 gap-4 md:grid-cols-2>
              <!-- Input Form -->
              <div flex flex-col gap-3>
                <div>
                  <div mb-1 text-xs font-semibold op-70>
                    {{ t('tools.webmcp.playground.selectTool') }}
                  </div>
                  <n-select
                    :value="selectedPlaygroundToolName"
                    :options="toolOptions"
                    filterable
                    @update:value="onSelectToolChange"
                  />
                </div>

                <div>
                  <div mb-1 text-xs font-semibold op-70>
                    {{ t('tools.webmcp.playground.inputArgs') }}
                  </div>
                  <c-input-text
                    v-model:value="inputJson"
                    multiline
                    rows="10"
                    placeholder="{}"
                    font-mono
                  />
                </div>

                <div>
                  <c-button
                    type="primary"
                    :loading="isExecuting"
                    @click="runPlaygroundTool"
                  >
                    <n-icon size="16" :component="IconPlayerPlay" mr-1 />
                    {{ isExecuting ? t('tools.webmcp.playground.executing') : t('tools.webmcp.playground.runButton') }}
                  </c-button>
                </div>
              </div>

              <!-- Output Box -->
              <div flex flex-col gap-2>
                <div flex items-center justify-between>
                  <div text-xs font-semibold op-70>
                    {{ t('tools.webmcp.playground.executionResult') }}
                  </div>
                  <div v-if="executionLatency !== null" flex items-center gap-2>
                    <n-tag type="info" size="small" round>
                      {{ t('tools.webmcp.playground.latency') }}: {{ executionLatency }} ms
                    </n-tag>
                    <c-button size="tiny" @click="copyPlaygroundResult">
                      <n-icon size="14" :component="IconCopy" mr-1 />
                      {{ t('tools.webmcp.playground.copyResult') }}
                    </c-button>
                  </div>
                </div>

                <div v-if="executionError" border border-red-500:30 rounded-lg bg-red-500:5 p-3 text-xs text-red-500 dark:bg-red-500:10>
                  ✕ {{ executionError }}
                </div>

                <pre
                  v-if="executionResult"
                  max-h-96 min-h-60 overflow-y-auto rounded-lg bg-neutral-900 p-3 text-xs text-emerald-400 font-mono
                >{{ JSON.stringify(executionResult, null, 2) }}</pre>
                <div
                  v-else-if="!executionError"
                  min-h-60 flex items-center justify-center border border-neutral-300 rounded-lg border-dashed p-6 text-xs op-50 dark:border-neutral-800
                >
                  {{ t('tools.webmcp.playground.selectTool') }} &amp; {{ t('tools.webmcp.playground.runButton') }}
                </div>
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- Tab 3: Profiles & Export -->
        <n-tab-pane name="profiles" :tab="t('tools.webmcp.tabs.profiles')">
          <div flex flex-col gap-4 py-2>
            <div>
              <div text-base font-bold>
                {{ t('tools.webmcp.profiles.title') }}
              </div>
              <div text-xs op-70>
                {{ t('tools.webmcp.profiles.subtitle') }}
              </div>
            </div>

            <!-- Profile Cards -->
            <div grid grid-cols-1 gap-3 lg:grid-cols-4 sm:grid-cols-2>
              <div
                v-for="prof in profiles"
                :key="prof.id"
                class="cursor-pointer border rounded-lg p-3 transition"
                :class="selectedProfileId === prof.id ? 'border-primary bg-primary:5' : 'border-neutral-200 dark:border-neutral-800'"
                @click="selectedProfileId = prof.id"
              >
                <div flex items-center justify-between>
                  <span text-sm font-bold>{{ prof.name }}</span>
                  <n-icon v-if="selectedProfileId === prof.id" size="18" :component="IconCheck" class="text-primary" />
                </div>
                <div mt-1 text-xs op-70>
                  {{ prof.description }}
                </div>
                <div mt-2 flex flex-wrap gap-1>
                  <n-tag v-for="tn in prof.toolNames" :key="tn" size="tiny" round>
                    {{ tn }}
                  </n-tag>
                </div>
              </div>
            </div>

            <!-- Platform Selector & Code snippet -->
            <div border border-neutral-200 rounded-lg p-3 dark:border-neutral-800>
              <div mb-3 flex flex-wrap items-center justify-between gap-2>
                <div flex items-center gap-2>
                  <span text-xs font-semibold op-70>{{ t('tools.webmcp.profiles.formatLabel') }}:</span>
                  <n-radio-group v-model:value="selectedFormat" size="small">
                    <n-radio-button value="claudeDesktop">
                      Claude Desktop
                    </n-radio-button>
                    <n-radio-button value="cursor">
                      Cursor
                    </n-radio-button>
                    <n-radio-button value="rawMcp">
                      mcp-config.json
                    </n-radio-button>
                    <n-radio-button value="inBrowserScript">
                      In-Browser Script
                    </n-radio-button>
                  </n-radio-group>
                </div>

                <c-button size="small" type="primary" @click="copyProfileConfig">
                  <n-icon size="14" :component="IconCopy" mr-1 />
                  {{ t('tools.webmcp.profiles.copyConfig') }}
                </c-button>
              </div>

              <pre max-h-72 overflow-y-auto rounded-lg bg-neutral-900 p-3 text-xs text-sky-300 font-mono>{{ profileExportCode }}</pre>
            </div>
          </div>
        </n-tab-pane>

        <!-- Tab 4: Tools Directory -->
        <n-tab-pane name="directory" :tab="t('tools.webmcp.tabs.directory')">
          <div flex flex-col gap-3 py-2>
            <div flex flex-wrap items-center gap-3>
              <c-input-text
                v-model:value="searchQuery"
                :placeholder="t('tools.webmcp.directory.searchPlaceholder')"
                class="min-w-60 flex-1"
              >
                <template #prefix>
                  <n-icon size="16" :component="IconSearch" op-50 />
                </template>
              </c-input-text>

              <n-select
                v-model:value="selectedCategory"
                :options="categoryOptions"
                class="w-44"
              />

              <n-checkbox v-model:checked="executableOnlyFilter">
                {{ t('tools.webmcp.directory.executableOnly') }}
              </n-checkbox>
            </div>

            <!-- Tools Table / Cards -->
            <div max-h-120 flex flex-col gap-2 overflow-y-auto>
              <div
                v-for="tool in filteredCatalogTools"
                :key="tool.name"
                flex flex-wrap items-center justify-between border border-neutral-200 rounded-lg p-2.5 text-xs dark:border-neutral-800
              >
                <div flex flex-col gap-0.5>
                  <div flex items-center gap-2>
                    <span font-bold>{{ tool.title }}</span>
                    <span text-neutral-400 font-mono>({{ tool.name }})</span>
                    <n-tag
                      size="tiny"
                      :type="tool.isDirectlyExecutable ? 'success' : 'default'"
                      round
                    >
                      {{ tool.isDirectlyExecutable ? t('tools.webmcp.directory.executableBadge') : t('tools.webmcp.directory.catalogBadge') }}
                    </n-tag>
                    <span op-60>[{{ tool.category }}]</span>
                  </div>
                  <div op-75>
                    {{ tool.description }}
                  </div>
                </div>

                <div flex items-center gap-2>
                  <c-button
                    v-if="tool.isDirectlyExecutable"
                    size="tiny"
                    type="primary"
                    @click="jumpToPlayground(tool.name)"
                  >
                    <n-icon size="12" :component="IconPlayerPlay" mr-1 />
                    {{ t('tools.webmcp.directory.openPlayground') }}
                  </c-button>
                  <c-button
                    size="tiny"
                    :to="tool.path"
                  >
                    <n-icon size="12" :component="IconFileCode" mr-1 />
                    {{ t('tools.webmcp.directory.openPage') }}
                  </c-button>
                </div>
              </div>
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.webmcp-container {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  flex: 1 1 100% !important;
}

pre {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
