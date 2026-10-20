<template>
  <!-- 复用纯色色块的配置面板，保持颜色、透明度及持久化行为一致。 -->
  <ColorBlockConfigPanel :option="option" />
</template>

<script setup lang="ts">
import ColorBlockConfigPanel from '../DecorateGreenBar/ConfigPanel.vue'
import type Config from './config'

defineOptions({ name: 'VDecorateSlantedLineConfigPanel' })
defineProps<{ option: Config['option'] }>()
</script>
