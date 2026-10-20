<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <ScenePropertyDialog
    v-model="dialogVisible"
    title="JSON配置"
    :width="760"
    align-center
    @close="handleClose"
  >
    <div>
      <CodeEditor
        v-model:value="code"
        language="javascript"
        theme="vs-dark"
        :height="400"
        :options="editorOptions"
      />
    </div>
    <template #footer>
      <ScenePropertyButton type="primary" @click="handleConfirm">应用</ScenePropertyButton>
    </template>
  </ScenePropertyDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CodeEditor } from 'monaco-editor-vue3'
import ScenePropertyDialog from '@/components/ScenePropertyDialog/index.vue'

const emit = defineEmits<{
  (e: 'confirm', value: string): void
}>()

const code = ref('')

const editorOptions = {
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
}

const dialogVisible = ref(false)

const showDialog = (initialValue = '') => {
  code.value = initialValue
  dialogVisible.value = true
}

const handleClose = () => {
  dialogVisible.value = false
}

const handleConfirm = () => {
  emit('confirm', code.value)
  dialogVisible.value = false
}

defineExpose({
  showDialog,
})
</script>
