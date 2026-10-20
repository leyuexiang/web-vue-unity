<template>
  <CommonChart :option="filter" />
</template>

<script setup lang="ts">
import { executeDynamicCode } from '@/utils/dynamicCode'

defineOptions({ name: 'VBar' })

const props = defineProps({
  option: Object,
})

const filter = computed(() => {
  /**
   * 旧图表入口保留“按 chartOption 透传配置”的兼容语义。
   * 这里走统一动态执行入口，后续图表配置解析异常都能集中处理。
   */
  return executeDynamicCode('chart-option', { option: props.option?.chartOption }, 'return option', {})
})
</script>

<style scoped></style>
