<template>
  <div>
    <setting-item-box name="毛玻璃颜色" :alone="true">
      <ScenePropertyColorPicker
        v-model="option.glassColor"
        variant="swatch"
        show-alpha
        color-format="rgb"
      />
    </setting-item-box>
    <setting-item-box name="边框颜色" :alone="true">
      <ScenePropertyColorPicker
        v-model="option.borderColor"
        variant="swatch"
        show-alpha
        color-format="rgb"
      />
    </setting-item-box>
    <setting-item-box name="分割线颜色" :alone="true">
      <ScenePropertyColorPicker
        v-model="option.lineColor"
        variant="swatch"
        show-alpha
        color-format="rgb"
      />
    </setting-item-box>
    <setting-item-box name="强调色" :alone="true">
      <ScenePropertyColorPicker
        v-model="option.accentColor"
        variant="swatch"
        show-alpha
        color-format="rgb"
      />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VBorderDividerGlassConfigPanel' })

defineProps<{ option: Config['option'] }>()
</script>
