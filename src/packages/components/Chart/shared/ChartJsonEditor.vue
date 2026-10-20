<template>
  <div ref="editorContainerRef" class="chart-json-editor"></div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { ElMessage } from 'element-plus'
import { useMonaco } from '@/packages/hooks/useMonaco'

defineOptions({ name: 'ChartJsonEditor' })

const props = defineProps({
  modelValue: { type: Object as PropType<Record<string, unknown>>, required: true },
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void
}>()

const { editorContainerRef, editor } = useMonaco({ language: 'json' })

const syncEditorValue = (value: Record<string, unknown>) => {
  const nextValue = JSON.stringify(value ?? {}, null, 2)
  if (editor.value && editor.value.getValue() !== nextValue) {
    editor.value.setValue(nextValue)
  }
}

watch(
  () => editor.value,
  (editorInstance) => {
    if (!editorInstance) return

    syncEditorValue(props.modelValue)

    editorInstance.onDidBlurEditorText(() => {
      try {
        const nextValue = JSON.parse(editorInstance.getValue() || '{}')
        emit('update:modelValue', nextValue)
      } catch {
        ElMessage.error('图表配置不是合法 JSON，未保存修改')
        syncEditorValue(props.modelValue)
      }
    })
  },
)

watch(
  () => props.modelValue,
  (newValue) => {
    syncEditorValue(newValue)
  },
  { deep: true, immediate: true },
)
</script>

<style scoped lang="scss">
.chart-json-editor {
  height: 260px;
}
</style>
