<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  type ParamType,
  type ToolContract,
  type ToolParam,
  generateMcpTool,
  generateOpenAiTool,
  generateTypeScriptZod,
  inferParametersFromJson,
} from './mcp-tool-generator.service';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();

const toolName = ref('get_weather_forecast');
const toolDescription = ref('Retrieve real-time weather conditions and multi-day forecast for a given location');

const parameters = ref<ToolParam[]>([
  {
    name: 'location',
    type: 'string',
    description: 'City and state/country, e.g. London, UK or Tokyo, JP',
    required: true,
  },
  {
    name: 'days',
    type: 'number',
    description: 'Number of forecast days (1 to 14)',
    required: false,
  },
  {
    name: 'units',
    type: 'string',
    description: 'Unit of temperature',
    required: false,
    enumVals: ['celsius', 'fahrenheit'],
  },
]);

const sampleJsonInput = ref('');
const outputFormat = ref<'mcp' | 'openai' | 'zod'>('mcp');

const PARAM_TYPES: Array<{ label: string; value: ParamType }> = [
  { label: 'string', value: 'string' },
  { label: 'number', value: 'number' },
  { label: 'boolean', value: 'boolean' },
  { label: 'array', value: 'array' },
  { label: 'object', value: 'object' },
];

function addParameter() {
  parameters.value.push({
    name: '',
    type: 'string',
    description: '',
    required: true,
  });
}

function removeParameter(index: number) {
  parameters.value.splice(index, 1);
}

function inferFromJson() {
  if (!sampleJsonInput.value.trim()) {
    return;
  }
  const inferred = inferParametersFromJson(sampleJsonInput.value);
  if (inferred.length > 0) {
    parameters.value = inferred;
  }
}

const contract = computed<ToolContract>(() => ({
  name: toolName.value.trim(),
  description: toolDescription.value.trim(),
  parameters: parameters.value,
}));

const generatedCode = computed(() => {
  if (outputFormat.value === 'mcp') {
    return generateMcpTool(contract.value);
  }
  if (outputFormat.value === 'openai') {
    return generateOpenAiTool(contract.value);
  }
  return generateTypeScriptZod(contract.value);
});

const { copy } = useCopy({
  source: () => generatedCode.value,
  text: 'Tool specification copied to clipboard',
  createToast: true,
});
</script>

<template>
  <div>
    <!-- Tool Basic Info -->
    <c-card :title="t('tools.mcp-tool-generator.basic-info', 'Tool Identity')">
      <div grid grid-cols-1 gap-4 md:grid-cols-2>
        <div>
          <div mb-1 text-xs font-semibold op-75>
            {{ t('tools.mcp-tool-generator.tool-name', 'Tool Name (snake_case)') }}
          </div>
          <c-input-text
            v-model:value="toolName"
            placeholder="e.g. search_database, send_slack_alert"
            monospace
          />
        </div>

        <div>
          <div mb-1 text-xs font-semibold op-75>
            {{ t('tools.mcp-tool-generator.tool-desc', 'Description (Crucial for Agent decision making)') }}
          </div>
          <c-input-text
            v-model:value="toolDescription"
            placeholder="Explain clearly what the tool does and when to call it..."
          />
        </div>
      </div>
    </c-card>

    <!-- Parameters Builder -->
    <c-card mt-4 :title="t('tools.mcp-tool-generator.params-title', 'Parameters & Schema')">
      <template #header-extra>
        <div flex items-center gap-2>
          <c-button size="small" @click="addParameter">
            + {{ t('tools.mcp-tool-generator.add-param', 'Add Field') }}
          </c-button>
        </div>
      </template>

      <!-- Quick infer box -->
      <div mb-4 rounded bg-neutral-50 p-3 dark:bg-neutral-900>
        <div mb-2 flex items-center justify-between text-xs op-75>
          <span>{{ t('tools.mcp-tool-generator.infer-hint', 'Or paste sample JSON to auto-infer fields:') }}</span>
          <c-button size="tiny" :disabled="!sampleJsonInput" @click="inferFromJson">
            {{ t('tools.mcp-tool-generator.infer-btn', 'Infer Parameters') }}
          </c-button>
        </div>
        <c-input-text
          v-model:value="sampleJsonInput"
          placeholder="{&quot;city&quot;: &quot;Berlin&quot;, &quot;days&quot;: 3, &quot;includeHourly&quot;: true}"
          size="small"
          monospace
        />
      </div>

      <!-- Parameter List -->
      <div flex flex-col gap-3>
        <div
          v-for="(param, index) in parameters"
          :key="index"
          flex flex-wrap items-center gap-2 border border-neutral-200 rounded p-2.5 dark:border-neutral-800
        >
          <div w-36>
            <c-input-text
              v-model:value="param.name"
              placeholder="Field name"
              size="small"
              monospace
            />
          </div>

          <div w-28>
            <c-select
              v-model:value="param.type"
              :options="PARAM_TYPES"
              size="small"
            />
          </div>

          <div min-w-48 flex-1>
            <c-input-text
              v-model:value="param.description"
              placeholder="Description / guidance for model"
              size="small"
            />
          </div>

          <div flex items-center gap-2>
            <n-checkbox v-model:checked="param.required" size="small">
              {{ t('tools.mcp-tool-generator.required', 'Req') }}
            </n-checkbox>

            <c-button size="small" @click="removeParameter(index)">
              ✕
            </c-button>
          </div>
        </div>
      </div>
    </c-card>

    <!-- Code Output -->
    <c-card mt-4 :title="t('tools.mcp-tool-generator.output-title', 'Generated Tool Contract')">
      <template #header-extra>
        <n-radio-group v-model:value="outputFormat" size="small">
          <n-radio-button value="mcp">
            Anthropic MCP Spec
          </n-radio-button>
          <n-radio-button value="openai">
            OpenAI Function
          </n-radio-button>
          <n-radio-button value="zod">
            TypeScript / Zod
          </n-radio-button>
        </n-radio-group>
      </template>

      <c-input-text
        :value="generatedCode"
        multiline
        readonly
        rows="14"
        monospace
      />

      <div mt-3 flex justify-end>
        <c-button type="primary" @click="copy()">
          {{ t('tools.mcp-tool-generator.copy', 'Copy Specification') }}
        </c-button>
      </div>
    </c-card>
  </div>
</template>
