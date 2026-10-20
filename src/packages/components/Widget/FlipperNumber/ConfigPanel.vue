<template>
  <div>
    <!-- 各文字区域复用统一字体选项，分别修改，避免影响同组件的其他文本。 -->
    <setting-item-box name="数字字体" :alone="true">
      <ScenePropertySelect v-model="option.fontFamily" placeholder="沿用默认字体" size="small">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>

    <!-- 外层面板已经提供标题，这里直接放控件，避免重复标签导致对齐错位。 -->
    <setting-item-box name="初始值" :alone="true">
      <ScenePropertyNumberInput v-model="option.dataset" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="翻牌个数" :alone="true">
      <ScenePropertyNumberInput v-model="option.flipperLength" :min="1" size="small" />
    </setting-item-box>

    <setting-item-box name="宽度" :alone="true">
      <ScenePropertyNumberInput v-model="option.flipperWidth" :min="1" size="small" />
    </setting-item-box>

    <setting-item-box name="高度" :alone="true">
      <ScenePropertyNumberInput v-model="option.flipperHeight" :min="1" size="small" />
    </setting-item-box>

    <setting-item-box name="边框" :alone="true">
      <ScenePropertyNumberInput
        v-model="option.flipperBorderWidth"
        :min="0"
        :max="10"
        size="small"
      />
    </setting-item-box>

    <setting-item-box name="圆角" :alone="true">
      <ScenePropertyNumberInput v-model="option.flipperRadius" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="翻牌间隔" :alone="true">
      <ScenePropertyNumberInput v-model="option.flipperGap" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="背景色" :alone="true">
      <ScenePropertyColorPicker v-model="option.flipperBgColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="字体色" :alone="true">
      <ScenePropertyColorPicker v-model="option.flipperTextColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="动画" :alone="true">
      <ScenePropertySelect v-model="option.flipperType" size="small">
        <el-option label="下翻" value="down" />
        <el-option label="上翻" value="up" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="翻牌速度(毫秒)" :alone="true">
      <ScenePropertyNumberInput
        v-model="option.flipperSpeed"
        :min="100"
        :max="900"
        :step="100"
        size="small"
      />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { PropType } from 'vue'
import Config from './config'

defineOptions({ name: 'VFlipperNumberConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
