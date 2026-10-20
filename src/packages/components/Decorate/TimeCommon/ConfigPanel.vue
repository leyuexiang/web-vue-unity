<template>
  <div>
    <!-- 字体候选项与页面分页器共用；未配置时保留原有继承字体。 -->
    <setting-item-box name="时间字体" :alone="true">
      <ScenePropertySelect v-model="option.fontFamily" size="small" placeholder="默认字体">
        <el-option
          v-for="font in FONT_FAMILY_OPTIONS"
          :key="font.value"
          :label="font.label"
          :value="font.value"
        />
      </ScenePropertySelect>
    </setting-item-box>
    <!-- 外层面板已经提供标题，这里直接放控件，避免重复标签导致对齐错位。 -->
    <setting-item-box name="字体大小" :alone="true">
      <ScenePropertyNumberInput v-model="option.timeSize" :min="12" :max="72" size="small" />
    </setting-item-box>

    <setting-item-box name="字体粗细" :alone="true">
      <ScenePropertySelect v-model="option.fontWeight" size="small">
        <el-option label="正常" value="normal" />
        <el-option label="粗体" value="bold" />
      </ScenePropertySelect>
    </setting-item-box>

    <setting-item-box name="行高" :alone="true">
      <ScenePropertyNumberInput v-model="option.timeLineHeight" :min="20" :max="100" size="small" />
    </setting-item-box>

    <setting-item-box name="字距" :alone="true">
      <ScenePropertyNumberInput v-model="option.timeTextIndent" :min="0" :max="20" size="small" />
    </setting-item-box>

    <setting-item-box name="时间颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.timeColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="展示阴影" :alone="true">
      <ScenePropertySwitch v-model="option.showShadow" />
    </setting-item-box>

    <template v-if="option.showShadow">
      <setting-item-box name="阴影 X" :alone="true">
        <ScenePropertyNumberInput v-model="option.hShadow" :min="-20" :max="20" size="small" />
      </setting-item-box>

      <setting-item-box name="阴影 Y" :alone="true">
        <ScenePropertyNumberInput v-model="option.vShadow" :min="-20" :max="20" size="small" />
      </setting-item-box>

      <setting-item-box name="模糊" :alone="true">
        <ScenePropertyNumberInput v-model="option.blurShadow" :min="0" :max="50" size="small" />
      </setting-item-box>

      <setting-item-box name="阴影颜色" :alone="true">
        <ScenePropertyColorPicker v-model="option.colorShadow" variant="swatch" />
      </setting-item-box>
    </template>
  </div>
</template>

<script setup lang="ts">
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import Config from './config'

defineOptions({ name: 'VTimeCommonConfigPanel' })

defineProps({
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
