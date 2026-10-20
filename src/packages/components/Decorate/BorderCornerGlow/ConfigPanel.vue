<template>
  <div>
    <!-- 仅暴露原图绿色部分，深色背景保持固定；颜色值可携带透明度。 -->
    <setting-item-box name="四角及光晕颜色" :alone="true">
      <ScenePropertyColorPicker
        v-model="option.color"
        variant="swatch"
        show-alpha
        color-format="rgb"
      />
    </setting-item-box>
    <setting-item-box name="线框颜色" :alone="true">
      <ScenePropertyColorPicker
        v-model="option.frameColor"
        variant="swatch"
        show-alpha
        color-format="rgb"
      />
    </setting-item-box>
  </div>
</template>
<script setup lang="ts">
import type Config from './config'
defineOptions({ name: 'VBorderCornerGlowConfigPanel' })
defineProps<{ option: Config['option'] }>()
</script>
