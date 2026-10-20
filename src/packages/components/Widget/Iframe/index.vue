<template>
  <iframe class="widget-iframe" :src="option.value" frameborder="0" :style="iframeStyle" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Config from './config'

defineOptions({ name: 'VIframe' })

const props = defineProps<{ option: Config['option'] }>()

/**
 * 旧项目里网页嵌入支持圆角。
 * 当前项目这里把同样的样式参数接回来，保证基础面板里的圆角配置立即生效。
 */
const iframeStyle = computed(() => ({
  borderRadius: `${Number(props.option.borderRadius) || 0}px`,
}))
</script>

<style scoped>
.widget-iframe {
  width: 100%;
  height: 100%;
  background: #08111f;
  border: none;
}
</style>
