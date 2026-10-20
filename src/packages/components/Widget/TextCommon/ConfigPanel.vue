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

    <setting-item-box name="行高（0 为默认）" :alone="true">
      <ScenePropertyNumberInput v-model="option.lineHeight" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="文字颜色" :alone="true">
      <!-- 颜色字段复用右侧共享色块；外层 setting-item-box 已提供标签，因此使用 swatch 变体避免重复文字。 -->
      <ScenePropertyColorPicker v-model="option.fontColor" label="文字颜色" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="左右内边距" :alone="true">
      <ScenePropertyNumberInput v-model="option.paddingX" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="上下内边距" :alone="true">
      <ScenePropertyNumberInput v-model="option.paddingY" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="水平对齐" :alone="true">
      <ScenePropertySelect v-model="option.textAlign" size="small">
        <el-option label="左对齐" value="left" />
        <el-option label="居中" value="center" />
        <el-option label="右对齐" value="right" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="换行方式" :alone="true">
      <ScenePropertySelect v-model="option.whiteSpace" size="small">
        <el-option label="自动换行" value="pre-wrap" />
        <el-option label="单行" value="nowrap" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="背景色" :alone="true">
      <ScenePropertyColorPicker v-model="option.backgroundColor" label="背景色" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="文字粗细" :alone="true">
      <ScenePropertySelect v-model="option.fontWeight" size="small">
        <el-option label="常规" value="normal" />
        <el-option label="加粗" value="bold" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="边框宽度" :alone="true">
      <ScenePropertyNumberInput v-model="option.borderWidth" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="边框颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.borderColor" label="边框颜色" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="圆角" :alone="true">
      <ScenePropertyNumberInput v-model="option.borderRadius" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="字间距" :alone="true">
      <ScenePropertyNumberInput v-model="option.letterSpacing" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="排版方向" :alone="true">
      <ScenePropertySelect v-model="option.writingMode" size="small">
        <el-option label="水平" value="horizontal-tb" />
        <el-option label="垂直" value="vertical-rl" />
      </ScenePropertySelect>
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { PropType } from 'vue'
import Config from './config'
import ScenePropertyColorPicker from
  '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyColorPicker/index.vue'

defineOptions({ name: 'VTextCommonConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
