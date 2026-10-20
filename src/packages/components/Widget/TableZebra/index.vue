<template>
  <TablePlusTable :option="option" variant="zebra" />
</template>

<script setup lang="ts">
import Config from './config'
import TablePlusTable from '../shared/TablePlusTable.vue'

defineOptions({ name: 'VTableZebra' })
defineProps<{ option: Config['option']; widgetId?: string }>()
</script>
