<template>
  <GenericChartConfigPanel :option="option" chart-key="VGaugeNeon" @update:option="emit('update:option', $event)" />
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import GenericChartConfigPanel from '../shared/GenericChartConfigPanel.vue'

defineOptions({ name: 'VGaugeNeonConfigPanel' })

defineProps({
  option: { type: Object as PropType<Record<string, unknown>>, required: true },
})

const emit = defineEmits<{
  (e: 'update:option', value: Record<string, unknown>): void
}>()
</script>