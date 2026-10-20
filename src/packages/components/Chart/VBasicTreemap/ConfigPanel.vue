<template>
  <GenericChartConfigPanel
    :option="option"
    chart-key="VBasicTreemap"
    @update:option="emit('update:option', $event)"
  />
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import GenericChartConfigPanel from '../shared/GenericChartConfigPanel.vue'

defineOptions({ name: 'VBasicTreemapConfigPanel' })

defineProps({
  option: { type: Object as PropType<Record<string, unknown>>, required: true },
})

// 与右侧面板的 v-model:option 契约保持一致，避免属性修改只停留在子组件内部。
const emit = defineEmits<{
  (e: 'update:option', value: Record<string, unknown>): void
}>()
</script>
