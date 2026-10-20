<template>
  <div>
    <!-- 启用透明度滑条，以包含透明度的色值保存，画布背景色直接消费，无需额外透明度状态。 -->
    <setting-item-box name="颜色" :alone="true">
      <ScenePropertyColorPicker
        v-model="option.color"
        variant="swatch"
        show-alpha
        color-format="rgb"
      />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VDecorateGreenBarConfigPanel' })

// 尺寸仍由公共属性管理，此面板仅负责色块颜色。
defineProps<{ option: Config['option'] }>()
</script>
