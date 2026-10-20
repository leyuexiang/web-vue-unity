<template>
  <div>
    <!-- 各文字区域复用统一字体选项，分别修改，避免影响同组件的其他文本。 -->
    <setting-item-box name="文字字体" :alone="true">
      <ScenePropertySelect v-model="option.fontFamily" placeholder="沿用默认字体" size="small">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="文本" :alone="true">
      <ScenePropertyInput v-model="option.value" />
    </setting-item-box>

    <setting-item-box name="字号" :alone="true">
      <ScenePropertyNumberInput v-model="option.fontSize" :min="5" size="small" />
    </setting-item-box>

    <setting-item-box name="文字颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.fontColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="文字粗细" :alone="true">
      <ScenePropertySelect v-model="option.fontWeight" size="small">
        <el-option label="常规" value="normal" />
        <el-option label="加粗" value="bold" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="字间距" :alone="true">
      <ScenePropertyNumberInput v-model="option.letterSpacing" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="显示阴影" :alone="true">
      <ScenePropertySwitch v-model="option.showShadow" />
    </setting-item-box>

    <setting-item-box name="阴影颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.shadowColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="阴影水平偏移" :alone="true">
      <ScenePropertyNumberInput v-model="option.hShadow" size="small" />
    </setting-item-box>

    <setting-item-box name="阴影垂直偏移" :alone="true">
      <ScenePropertyNumberInput v-model="option.vShadow" size="small" />
    </setting-item-box>

    <setting-item-box name="阴影模糊" :alone="true">
      <ScenePropertyNumberInput v-model="option.blurShadow" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="动画时长(s)" :alone="true">
      <ScenePropertyNumberInput v-model="option.duration" :min="1" size="small" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { PropType } from 'vue'
import Config from './config'

defineOptions({ name: 'VTextBarrageConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
