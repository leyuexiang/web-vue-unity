<template>
  <GenericChartConfigPanel :option="option" chart-key="VRadarHexagon" @update:option="emit('update:option', $event)" />
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import GenericChartConfigPanel from '../shared/GenericChartConfigPanel.vue'

defineOptions({ name: 'VRadarHexagonConfigPanel' })

defineProps({
  option: { type: Object as PropType<Record<string, unknown>>, required: true },
})

const emit = defineEmits<{
  (e: 'update:option', value: Record<string, unknown>): void
}>()
</script>