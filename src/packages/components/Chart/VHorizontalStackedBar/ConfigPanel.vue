<template>
  <GenericChartConfigPanel :option="option" chart-key="VHorizontalStackedBar" @update:option="emit('update:option', $event)" />
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import GenericChartConfigPanel from '../shared/GenericChartConfigPanel.vue'

defineOptions({ name: 'VHorizontalStackedBarConfigPanel' })

defineProps({
  option: { type: Object as PropType<Record<string, unknown>>, required: true },
})

const emit = defineEmits<{
  (e: 'update:option', value: Record<string, unknown>): void
}>()
</script>