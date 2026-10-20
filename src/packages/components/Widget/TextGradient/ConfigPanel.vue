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

    <setting-item-box name="文字粗细" :alone="true">
      <ScenePropertySelect v-model="option.fontWeight" size="small">
        <el-option label="常规" value="normal" />
        <el-option label="加粗" value="bold" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="起始色" :alone="true">
      <!-- 外层配置行已经显示“起始色”，共享颜色控件只保留 44px 色块。 -->
      <ScenePropertyColorPicker v-model="option.fromColor" label="起始色" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="结束色" :alone="true">
      <ScenePropertyColorPicker v-model="option.toColor" label="结束色" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="渐变角度" :alone="true">
      <ScenePropertyNumberInput v-model="option.deg" :min="0" :max="360" size="small" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { PropType } from 'vue'
import Config from './config'
import ScenePropertyColorPicker from
  '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyColorPicker/index.vue'

defineOptions({ name: 'VTextGradientConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
