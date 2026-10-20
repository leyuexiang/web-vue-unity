<template>
  <!-- 菜单项与事件处理器双重检查权限；请求中禁用，失败后可继续重试。 -->
  <el-dropdown-item v-if="canDownload" :disabled="downloading" @click.stop="handleDownload">
    {{ downloading ? '下载中…' : '下载场景文件' }}
  </el-dropdown-item>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getCurrentManagementCapabilities } from '@/auth/capabilities'

const props = defineProps<{ sceneId: string; sceneName: string }>()
const canDownload = getCurrentManagementCapabilities().scene.canDownloadJson
const downloading = ref(false)
let active = true

/** 按点击懒加载场景文件服务，管理列表首屏不为下载功能加载编辑器恢复链路。 */
const handleDownload = async () => {
  if (!getCurrentManagementCapabilities().scene.canDownloadJson || downloading.value) return
  downloading.value = true
  try {
    const { loadSceneJsonForDownload, downloadSceneJsonFile } = await import(
      '@/integrations/scene/sceneJsonFile'
    )
    if (!active) return
    const payload = await loadSceneJsonForDownload(props.sceneId)
    if (active) downloadSceneJsonFile(payload, props.sceneName)
  } catch (error) {
    if (active) ElMessage.error(error instanceof Error ? error.message : '下载场景文件失败，请重试')
  } finally {
    downloading.value = false
  }
}

onBeforeUnmount(() => {
  active = false
})
</script>
