<template>
  <div>
    <setting-item-box name="当前进度（%）" :alone="true">
      <ScenePropertyNumberInput
        v-model="option.percentage"
        :min="0"
        :max="100"
        :step="1"
        size="small"
      />
    </setting-item-box>

    <setting-item-box name="填充颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.fillColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="底轨颜色" :alone="true">
      <ScenePropertyColorPicker v-model="option.trackColor" variant="swatch" />
    </setting-item-box>

    <setting-item-box name="轨道高度（px）" :alone="true">
      <ScenePropertyNumberInput
        v-model="option.trackHeight"
        :min="1"
        :max="120"
        :step="1"
        size="small"
      />
    </setting-item-box>

    <setting-item-box name="圆角（px）" :alone="true">
      <ScenePropertyNumberInput
        v-model="option.borderRadius"
        :min="0"
        :max="120"
        :step="1"
        size="small"
      />
    </setting-item-box>

    <setting-item-box name="显示百分比" :alone="true">
      <ScenePropertySwitch v-model="option.showPercentage" />
    </setting-item-box>

    <template v-if="option.showPercentage">
      <setting-item-box name="文字位置" :alone="true">
        <ScenePropertySelect v-model="option.textPosition" size="small">
          <el-option label="轨道内" value="inside" />
          <el-option label="轨道右侧" value="right" />
        </ScenePropertySelect>
      </setting-item-box>

      <setting-item-box name="文字颜色" :alone="true">
        <ScenePropertyColorPicker v-model="option.textColor" variant="swatch" />
      </setting-item-box>

      <setting-item-box name="文字大小（px）" :alone="true">
        <ScenePropertyNumberInput
          v-model="option.textSize"
          :min="8"
          :max="48"
          :step="1"
          size="small"
        />
      </setting-item-box>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import Config from './config'

defineOptions({ name: 'VProgressBarConfigPanel' })

defineProps({
  /** 属性面板直接编辑场景保存的 option，所有外观值随组件实例持久化。 */
  option: { type: Object as PropType<Config['option']>, required: true },
})
</script>
