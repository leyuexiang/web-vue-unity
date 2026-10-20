<template>
  <div>
    <!-- 字体候选项与页面分页器共用；未配置时保留原有继承字体。 -->
    <setting-item-box name="标题字体" :alone="true">
      <ScenePropertySelect
        v-model="option.borderTitleFontFamily"
        size="small"
        placeholder="默认字体"
      >
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <!-- 标题区域拆成独立面板，避免一个容器里嵌多个内层标签后发生错位。 -->
    <setting-item-box name="标题">
      <ScenePropertyInput v-model="option.borderTitle" size="small" />
    </setting-item-box>

    <setting-item-box name="标题颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.borderTitleColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="标题大小" :alone="true">
      <ScenePropertyNumberInput v-model="option.borderTitleSize" :min="12" :max="40" size="small" />
    </setting-item-box>

    <setting-item-box name="标题宽度" :alone="true">
      <ScenePropertyNumberInput
        v-model="option.borderTitleWidth"
        :min="80"
        :max="600"
        size="small"
      />
    </setting-item-box>

    <setting-item-box name="标题高度" :alone="true">
      <ScenePropertyNumberInput
        v-model="option.borderTitleHeight"
        :min="20"
        :max="80"
        size="small"
      />
    </setting-item-box>

    <!-- 颜色项同样直接放控件，避免重复的内层“颜色”标签。 -->
    <setting-item-box :name="`颜色-${index + 1}`" v-for="(_, index) in option.colors" :key="index">
      <ScenePropertyColorPicker v-model="option.colors[index]" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="背景" :alone="true">
      <ScenePropertyColorPicker v-model="option.backgroundColor" variant="swatch" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { PropType } from 'vue'
import Config from './config'

defineOptions({ name: 'VBorder04ConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>

<style scoped></style>
