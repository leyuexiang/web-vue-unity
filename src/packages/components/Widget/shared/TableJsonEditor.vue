<template>
  <div ref="editorContainerRef" class="table-json-editor"></div>
</template>

<script setup lang="ts">
import { watch, type PropType } from 'vue'
import { ElMessage } from 'element-plus'
import { useMonaco } from '@/packages/hooks/useMonaco'

defineOptions({ name: 'TableJsonEditor' })

const props = defineProps({
  modelValue: { type: Object as PropType<Record<string, unknown>>, required: true },
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void
}>()

const { editorContainerRef, editor } = useMonaco({ language: 'json' })

/** 仅在内容确实变化时同步编辑器，避免基础控件更新后重复重置编辑状态。 */
const syncEditorValue = (value: Record<string, unknown>) => {
  const nextValue = JSON.stringify(value ?? {}, null, 2)
  if (editor.value && editor.value.getValue() !== nextValue) editor.value.setValue(nextValue)
}

watch(
  () => editor.value,
  (editorInstance) => {
    if (!editorInstance) return

    syncEditorValue(props.modelValue)
    editorInstance.onDidBlurEditorText(() => {
      try {
        const parsedValue: unknown = JSON.parse(editorInstance.getValue() || '{}')
        if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
          throw new TypeError('表格样式配置必须是对象')
        }
        emit('update:modelValue', parsedValue as Record<string, unknown>)
      } catch {
        ElMessage.error('表格样式配置不是合法的 JSON 对象，未保存修改')
        syncEditorValue(props.modelValue)
      }
    })
  },
)

watch(
  () => props.modelValue,
  (newValue) => syncEditorValue(newValue),
  { deep: true, immediate: true },
)
</script>

<style scoped lang="scss">
.table-json-editor {
  height: 260px;
}
</style>
