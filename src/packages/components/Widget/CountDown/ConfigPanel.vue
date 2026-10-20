<template>
  <div>
    <!-- 各文字区域复用统一字体选项，分别修改，避免影响同组件的其他文本。 -->
    <setting-item-box name="数字字体" :alone="true">
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
    <setting-item-box name="单位字体" :alone="true">
      <ScenePropertySelect v-model="option.unitFontFamily" placeholder="沿用默认字体" size="small">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>

    <!-- 外层面板已经提供标题，这里直接放控件，避免重复标签导致对齐错位。 -->
    <setting-item-box name="计时(秒)" :alone="true">
      <ScenePropertyNumberInput
        v-model="option.dataset"
        :min="0"
        :disabled="option.useEndDate"
        size="small"
      />
    </setting-item-box>

    <setting-item-box name="结束日期" :alone="true">
      <ScenePropertyDatePicker
        v-model="option.endDate"
        type="datetime"
        value-format="x"
        format="YYYY-MM-DD HH:mm:ss"
        :disabled="!option.useEndDate"
        placeholder="选择结束时间"
      />
    </setting-item-box>

    <setting-item-box name="使用固定结束日期" :alone="true">
      <ScenePropertySwitch v-model="option.useEndDate" />
    </setting-item-box>

    <setting-item-box name="风格" :alone="true">
      <ScenePropertySelect v-model="option.style" size="small">
        <el-option label="时分秒" value="时分秒" />
        <el-option label="冒号" value="冒号" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="显示天" :alone="true">
      <ScenePropertySwitch v-model="option.showDay" />
    </setting-item-box>

    <setting-item-box name="宽度" :alone="true">
      <ScenePropertyNumberInput v-model="option.flipperWidth" :min="1" size="small" />
    </setting-item-box>

    <setting-item-box name="高度" :alone="true">
      <ScenePropertyNumberInput v-model="option.flipperHeight" :min="1" size="small" />
    </setting-item-box>

    <setting-item-box name="间隔" :alone="true">
      <ScenePropertyNumberInput v-model="option.flipperGap" :min="0" size="small" />
    </setting-item-box>

    <setting-item-box name="圆角" :alone="true">
      <ScenePropertyNumberInput v-model="option.flipperRadius" :min="0" size="small" />
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
import ScenePropertyDatePicker from
  '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyDatePicker/index.vue'

defineOptions({ name: 'VCountDownConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
