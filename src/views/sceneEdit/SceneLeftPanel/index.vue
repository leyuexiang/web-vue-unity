<template>
  <div class="scene-edit-left-panel scene-edit-panel-surface h-full" @click="handlePanelBlankClick">
    <el-tabs v-model="activeTab" type="card" size="small" class="h-full scene-edit-left-tabs">
      <el-tab-pane label="系统资源" :name="SCENE_PANEL_ENUM.Resource">
        <ResourcePanel scope="system" />
      </el-tab-pane>
      <el-tab-pane label="我的资源" :name="SCENE_PANEL_ENUM.MyResource">
        <ResourcePanel scope="mine" />
      </el-tab-pane>
      <el-tab-pane label="结构" :name="SCENE_PANEL_ENUM.Structure">
        <StructurePanel />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { ResourcePanel, StructurePanel } from './components'
import { SCENE_PANEL_ENUM } from '../enum'
import { useSceneStore } from '@/stores/sceneEditStore'

const store = useSceneStore()
const activeTab = defineModel<SCENE_PANEL_ENUM>('activePanel', {
  default: SCENE_PANEL_ENUM.Resource,
})

watch(
  activeTab,
  (value) => {
    if (value === SCENE_PANEL_ENUM.Data) {
      activeTab.value = SCENE_PANEL_ENUM.Resource
    }
  },
  { immediate: true },
)

const handlePanelBlankClick = (event: MouseEvent) => {
  if (activeTab.value !== SCENE_PANEL_ENUM.Structure) return

  const target = event.target as HTMLElement | null
  if (!target) return

  if (
    target.closest('[data-structure-item]') ||
    target.closest('.el-input') ||
    target.closest('.el-icon') ||
    target.closest('.el-tabs__header')
  ) {
    return
  }

  store.sceneApi?.transformControlsModules.clearCurrentSelection()
}
</script>

<style scoped lang="scss">
.scene-edit-left-panel {
  overflow: hidden;
}
.scene-edit-left-tabs {
  height: 100%;
  overflow: hidden;
  :deep(> .el-tabs__header) {
    display: none;
  }
  :deep(> .el-tabs__content) {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }
  :deep(> .el-tabs__content > .el-tab-pane) {
    height: 100%;
    overflow: hidden;
  }
}
</style>
