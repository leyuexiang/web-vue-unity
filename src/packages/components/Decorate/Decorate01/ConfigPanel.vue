<template>
  <div>
    <!-- 外层面板已经提供标题，这里直接放控件，避免重复标签导致对齐错位。 -->
    <setting-item-box :name="`颜色-${index + 1}`" v-for="(_, index) in option.colors" :key="index">
      <ScenePropertyColorPicker v-model="option.colors[index]" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="线条高度" :alone="true">
      <ScenePropertyNumberInput v-model="option.lineHeight" :min="1" :max="20" size="small" />
    </setting-item-box>

    <setting-item-box name="末端长度" :alone="true">
      <ScenePropertyNumberInput v-model="option.endWidth" :min="1" :max="50" size="small" />
    </setting-item-box>

    <setting-item-box name="动画速度(s)" :alone="true">
      <!-- 动画速度统一使用共享步进器，数值范围与原配置保持不变。 -->
      <ScenePropertyStepper v-model="option.dur" :step="0.5" :min="0.5" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import Config from './config'

defineOptions({ name: 'VDecorate01ConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
