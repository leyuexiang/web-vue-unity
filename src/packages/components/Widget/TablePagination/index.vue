<template>
  <TablePlusTable :option="option" variant="pagination" />
</template>

<script setup lang="ts">
import Config from './config'
import TablePlusTable from '../shared/TablePlusTable.vue'

defineOptions({ name: 'VTablePagination' })
defineProps<{ option: Config['option']; widgetId?: string }>()
</script>
