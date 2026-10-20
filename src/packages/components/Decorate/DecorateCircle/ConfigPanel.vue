<template>
  <!-- 复用纯色色块面板，统一颜色、透明度配置与保存行为。 -->
  <ColorBlockConfigPanel :option="option" />
</template>

<script setup lang="ts">
import ColorBlockConfigPanel from '../DecorateGreenBar/ConfigPanel.vue'
import type Config from './config'

defineOptions({ name: 'VDecorateCircleConfigPanel' })
defineProps<{ option: Config['option'] }>()
</script>

