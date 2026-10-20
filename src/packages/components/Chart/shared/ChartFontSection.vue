<template>
  <!-- 各文字区域直接绑定各自的图表样式字段，未配置时保留主题默认字体。 -->
  <ScenePropertyRow v-for="field in fields" :key="field.key" :label="field.label" control-fill>
    <ScenePropertySelect
      :model-value="field.value"
      placeholder="默认字体"
      @update:model-value="updateFont(field, $event)"
    >
      <el-option
        v-for="font in FONT_FAMILY_OPTIONS"
        :key="font.value"
        :label="font.label"
        :value="font.value"
      />
    </ScenePropertySelect>
  </ScenePropertyRow>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ScenePropertyRow from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyRow/index.vue'
import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'
import {
  collectChartFontFields,
  updateChartFontField,
  type ChartFontField,
} from './chartFontFields'
import type { ChartPanelSchema, PanelChartOption } from './chartConfigTypes'

const props = defineProps<{ option: PanelChartOption; schema: ChartPanelSchema }>()
const emit = defineEmits<{ (event: 'update:option', value: PanelChartOption): void }>()
const fields = computed(() => collectChartFontFields(props.option, props.schema))
/** 下拉只接受字体字符串；更新走父面板的统一保存和画布刷新事件。 */
const updateFont = (field: ChartFontField, value: unknown) => {
  if (typeof value === 'string')
    emit('update:option', updateChartFontField(props.option, field.path, value))
}
</script>
