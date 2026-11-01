<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { config } from '@/config';

withDefaults(
  defineProps<{
    slotId?: string
    adFormat?: string
    fullWidthResponsive?: boolean
  }>(),
  {
    slotId: '',
    adFormat: 'auto',
    fullWidthResponsive: true,
  },
);

const route = useRoute();
const adRef = ref<HTMLElement | null>(null);
const client = config.googleAds.client;
const isEnabled = config.googleAds.enabled && Boolean(client);

function pushAd() {
  if (!isEnabled) {
    return;
  }
  nextTick(() => {
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle?: Array<Record<string, unknown>> }).adsbygoogle || [];
      adsbygoogle.push({});
    }
    catch {
      // Ignore if ads already pushed or blocked
    }
  });
}

onMounted(() => {
  pushAd();
});

watch(
  () => route.path,
  () => {
    pushAd();
  },
);
</script>

<template>
  <div v-if="isEnabled" ref="adRef" class="google-ad-wrapper">
    <ins
      class="adsbygoogle"
      style="display: block; text-align: center"
      :data-ad-client="client"
      :data-ad-slot="slotId || undefined"
      :data-ad-format="adFormat"
      :data-full-width-responsive="fullWidthResponsive ? 'true' : 'false'"
    />
  </div>
</template>

<style scoped lang="less">
.google-ad-wrapper {
  margin: 32px auto 16px;
  width: 100%;
  max-width: 960px;
  min-height: 90px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  text-align: center;
}
</style>
