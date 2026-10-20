<template>
  <TablePlusTable :option="option" variant="scroll" />
</template>

<script setup lang="ts">
import Config from './config'
import TablePlusTable from '../shared/TablePlusTable.vue'

defineOptions({ name: 'VTableScroll' })
defineProps<{ option: Config['option']; widgetId?: string }>()
</script>
