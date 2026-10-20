<template>
  <!-- 沿用顶栏的图标按钮与提示样式，原生单文件选择框不参与编辑器布局。 -->
  <el-tooltip
    content="上传场景文件"
    placement="bottom"
    :show-after="160"
    popper-class="scene-edit-popover"
  >
    <button
      class="scene-edit-header__action scene-edit-header__action--upload"
      type="button"
      aria-label="上传场景文件"
      :disabled="disabled || !!editorSceneOperation"
      @click="openFilePicker"
    >
      <el-icon :size="20"><Upload /></el-icon>
    </button>
  </el-tooltip>
  <input
    ref="inputRef"
    type="file"
    accept=".json,application/json"
    hidden
    aria-label="选择场景文件"
    @change="handleFile"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCurrentManagementCapabilities } from '@/auth/capabilities'
import { getActiveSceneViewportHost } from '@/integrations/scene/editorScenePlatformHost'
import { editorSceneOperation } from '@/integrations/scene/editorSceneOperationGate'
import { importEditorSceneJsonFile } from '@/integrations/scene/sceneJsonFile'

const props = defineProps<{ disabled: boolean }>()
const emit = defineEmits<{ beforeReplace: []; afterReplace: []; applied: [] }>()
const inputRef = ref<HTMLInputElement>()
let active = true
const importAbortController = new AbortController()
let confirmation: ReturnType<typeof ElMessageBox.confirm> | undefined

/** 在文件选择和读取后都核对能力，租户端即使伪造事件也无法进入覆盖服务。 */
const openFilePicker = () => {
  if (
    !active ||
    props.disabled ||
    editorSceneOperation.value ||
    !getCurrentManagementCapabilities().editor.importSceneJson
  )
    return
  inputRef.value?.click()
}

const handleFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  try {
    if (
      !file ||
      !active ||
      props.disabled ||
      !getCurrentManagementCapabilities().editor.importSceneJson
    )
      return
    const host = getActiveSceneViewportHost()
    if (!host) throw new Error('场景尚未就绪，请稍后重试')
    const scene = await importEditorSceneJsonFile(file, {
      host,
      signal: importAbortController.signal,
      isActive: () => active && !props.disabled && getActiveSceneViewportHost() === host,
      confirm: async () => {
        confirmation = ElMessageBox.confirm(
          '上传场景文件将清空并覆盖当前场景，未保存的内容将丢失，是否确认？',
          '上传场景文件',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
            customClass: 'scene-edit-template-message-box',
          },
        )
        try {
          await confirmation
          return true
        } catch {
          return false
        } finally {
          confirmation = undefined
        }
      },
      beforeReplace: () => emit('beforeReplace'),
      afterReplace: () => emit('afterReplace'),
      onAssetWarning: (message) => {
        if (active) ElMessage.warning(message)
      },
    })
    if (active && scene) {
      emit('applied')
      ElMessage.success('已覆盖，请保存')
    }
  } catch (error) {
    if (active) ElMessage.error(error instanceof Error ? error.message : '上传场景文件失败，请重试')
  } finally {
    // 原生输入框必须清空；同一个文件修正后再次选择仍能派发 change。
    input.value = ''
  }
}

onBeforeUnmount(() => {
  active = false
  importAbortController.abort()
  // 只在本组件持有确认框期间关闭，避免影响编辑器其他消息框。
  if (confirmation) ElMessageBox.close()
})
</script>
