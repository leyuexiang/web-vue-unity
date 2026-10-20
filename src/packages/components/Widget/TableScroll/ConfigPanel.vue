<template>
  <TablePlusConfigPanel :option="option" variant="scroll" />
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import Config from './config'
import TablePlusConfigPanel from '../shared/TablePlusConfigPanel.vue'

defineOptions({ name: 'VTableScrollConfigPanel' })
defineProps({ option: { type: Object as PropType<Config['option']>, required: true } })
</script>
