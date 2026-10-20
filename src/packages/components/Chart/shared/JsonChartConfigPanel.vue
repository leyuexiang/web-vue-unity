<template>
  <div>
    <setting-item-box name="标签" :alone="true">
      <setting-item>
        <ScenePropertyInput v-model="option.label" placeholder="请输入名称" />
      </setting-item>
    </setting-item-box>

    <setting-item-box name="图表配置(JSON)" :alone="true">
      <setting-item>
        <div ref="editorContainerRef" style="height: 240px"></div>
      </setting-item>
    </setting-item-box>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useMonaco } from '@/packages/hooks/useMonaco'

type ChartOptionModel = {
  label: string
  chartOption: unknown
  [key: string]: unknown
}

defineOptions({ name: 'JsonChartConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<ChartOptionModel>, required: true },
})

const emit = defineEmits(['update:option'])

const { editorContainerRef, editor } = useMonaco({ language: 'json' })

const syncEditorValue = (value: ChartOptionModel['chartOption']) => {
  const nextValue = JSON.stringify(value, null, 2)
  if (editor.value && editor.value.getValue() !== nextValue) {
    editor.value.setValue(nextValue)
  }
}

watch(
  () => editor.value,
  (editorInstance) => {
    if (!editorInstance) return
    syncEditorValue(props.option.chartOption)

    editorInstance.onDidBlurEditorText(() => {
      try {
        emit('update:option', {
          ...props.option,
          chartOption: JSON.parse(editorInstance.getValue() || '{}'),
        })
      } catch {
        ElMessage.error('图表配置不是合法 JSON，未保存修改')
        syncEditorValue(props.option.chartOption)
      }
    })
  },
)

watch(
  () => props.option.chartOption,
  (newVal) => {
    syncEditorValue(newVal)
  },
  { deep: true, immediate: true },
)
</script>
