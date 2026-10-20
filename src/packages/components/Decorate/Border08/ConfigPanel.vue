<template>
  <div>
    <setting-item-box :name="`颜色-${index + 1}`" v-for="(_, index) in option.colors" :key="index">
      <!-- 颜色项只保留一个控制器，避免外层标题和内层标签叠加后出现错位。 -->
      <ScenePropertyColorPicker v-model="option.colors[index]" variant="swatch" />
    </setting-item-box>

    <!-- 动画相关项拆成独立行，和其它装饰配置保持同一套对齐规则。 -->
    <setting-item-box name="速度(s)" :alone="true">
      <!-- 同语义速度字段复用共享步进器，避免此装饰单独恢复数字输入调节按钮。 -->
      <ScenePropertyStepper v-model="option.dur" :step="0.5" :min="0.5" />
    </setting-item-box>

    <setting-item-box name="反向" :alone="true">
      <ScenePropertySwitch v-model="option.reverse" />
    </setting-item-box>

    <setting-item-box name="背景" :alone="true">
      <ScenePropertyColorPicker v-model="option.backgroundColor" variant="swatch" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import Config from './config'

defineOptions({ name: 'VBorder08ConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>

<style scoped></style>
