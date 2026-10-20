<template>
  <div>
    <!-- 各文字区域复用统一字体选项，分别修改，避免影响同组件的其他文本。 -->
    <setting-item-box name="前缀字体" :alone="true">
      <ScenePropertySelect
        v-model="option.prefixFontFamily"
        placeholder="沿用默认字体"
        size="small"
      >
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <setting-item-box name="数值字体" :alone="true">
      <ScenePropertySelect
        v-model="option.numberFontFamily"
        placeholder="沿用默认字体"
        size="small"
      >
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <setting-item-box name="后缀字体" :alone="true">
      <ScenePropertySelect
        v-model="option.suffixFontFamily"
        placeholder="沿用默认字体"
        size="small"
      >
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>

    <!-- 外层面板已经提供标题，这里直接放控件，避免重复标签导致对齐错位。 -->
    <setting-item-box name="终点值" :alone="true">
      <ScenePropertyNumberInput v-model="option.dataset" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="大小" :alone="true">
      <ScenePropertyNumberInput v-model="option.numberSize" :min="1" size="small" />
    </setting-item-box>

    <setting-item-box name="精度" :alone="true">
      <ScenePropertyNumberInput v-model="option.precision" :min="0" :max="6" size="small" />
    </setting-item-box>

    <setting-item-box name="展示分割符" :alone="true">
      <ScenePropertySwitch v-model="option.showSeparator" />
    </setting-item-box>

    <setting-item-box name="文本" :alone="true">
      <ScenePropertyInput v-model="option.prefixText" placeholder="前缀" />
    </setting-item-box>

    <setting-item-box name="前缀颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.prefixColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="后缀文本" :alone="true">
      <ScenePropertyInput v-model="option.suffixText" placeholder="后缀" />
    </setting-item-box>

    <setting-item-box name="后缀颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.suffixColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="数值颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.numberColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="动画持续时间(s)" :alone="true">
      <!-- 动画持续时间使用共享纯数字输入框，保持与其他普通数字属性一致且不显示加减按钮。 -->
      <ScenePropertyNumberInput v-model="option.dur" :min="0.5" :step="0.5" size="small" />
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import type { PropType } from 'vue'
import Config from './config'

defineOptions({ name: 'VNumberConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
