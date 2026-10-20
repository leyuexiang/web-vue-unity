<template>
  <!-- 复用纯色色块取色器，统一颜色和透明度的编辑与保存方式。 -->
  <ColorBlockConfigPanel :option="option" />
</template>

<script setup lang="ts">
import ColorBlockConfigPanel from '../DecorateGreenBar/ConfigPanel.vue'
import type Config from './config'

defineOptions({ name: 'VCloseIconConfigPanel' })
defineProps<{ option: Config['option'] }>()
</script>
