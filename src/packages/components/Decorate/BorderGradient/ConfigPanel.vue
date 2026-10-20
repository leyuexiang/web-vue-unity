<template>
  <div>
    <!-- 两端分别配置颜色及透明度，复用纯色色块取色器，保留渐变层次。 -->
    <setting-item-box name="顶部颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.topColor" variant="swatch" show-alpha color-format="rgb" />
    </setting-item-box>
    <setting-item-box name="底部颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.bottomColor" variant="swatch" show-alpha color-format="rgb" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import type Config from './config'

defineOptions({ name: 'VBorderGradientConfigPanel' })

// 直接修改组件持久化配置，尺寸和位置继续由公共属性管理。
defineProps<{ option: Config['option'] }>()
</script>
