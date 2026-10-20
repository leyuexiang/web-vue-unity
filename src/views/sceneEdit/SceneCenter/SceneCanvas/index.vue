<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import LayerDOM from './LayerDOM/index.vue'
import Loading from '@/components/Loading/index.vue'
import { useSceneStore, useSceneWidgetStore } from '@/stores/sceneEditStore'
import { createSceneDefinition, createViewportHost, type ViewportHost } from '@/scene-platform'
import { MITT_ON_KEY_ENUM, DRAG_MODEL_ENUM } from '@/enums'
import type { WidgetModel } from '@/types/threeScene'
import { calculateSceneStageLayout } from '@/utils/sceneStage'
import { loadEditorSceneDefinition, loadEditorSceneDefinitionIntoHost } from '@/integrations/scene/editorSceneLoadAdapter'
import { setActiveSceneViewportHost, clearActiveSceneViewportHost } from '@/integrations/scene/editorScenePlatformHost'
import { createEditorSceneDataPollingController, type EditorSceneDataPollingController } from '@/integrations/scene/editorSceneDataPollingController'
import { createCommandBusWidgetCommandPort, createSceneApiWidgetRuntimePort,
  createSceneApiWidgetOverlayHostPort, setWidgetCommandPort, setWidgetRuntimePort,
  setWidgetOverlayHostPort, resetWidgetRuntimePorts, isWidgetPreview } from '@/integrations/scene/widgetRuntime'
import { applyEditorDim3dTemplate, type ApplyEditorDim3dTemplateInput } from '@/integrations/scene/editorDim3dTemplateApplyService'
import { releaseOriginalScenePackages, retainOriginalScenePackages } from '@/integrations/scene/twoDPackagePreservation'
import { serializeSceneDefinitionToFourPackages } from '@/integrations/scene/sceneFourPackage'
import { appLogger } from '@/utils/logger'
import { beginEditorSceneOperation } from '@/integrations/scene/editorSceneOperationGate'

/** 画布只承担二维宿主编排。来源叠加层保留拖拽、层级、配置和子项全部交互。 */
const emit = defineEmits<{ sceneLoadStateChange: [state: 'loading' | 'ready' | 'failed'] }>()
const route = useRoute()
const widgetStore = useSceneWidgetStore()
const sceneStore = useSceneStore()
const eventBus = getCurrentInstance()?.proxy?.$eventBus
const viewport = ref<HTMLElement>()
const stage = ref<HTMLElement>()
const dimensions = ref({ width: 0, height: 0 })
const loading = ref(true)
let host: ViewportHost | null = null
let polling: EditorSceneDataPollingController | null = null
let disposed = false
let layoutFrame = 0
let drag: WidgetModel | null = null
let template: ApplyEditorDim3dTemplateInput | null = null
let observer: ResizeObserver | null = null
// 模板覆盖期间沿用共享操作门禁；卸载时立即释放，迟到任务不能阻塞下一编辑页。
let releaseTemplateOperation: (() => void) | null = null
const sceneId = String(route.query.id ?? '')
const layout = computed(() => calculateSceneStageLayout(dimensions.value.width, dimensions.value.height, widgetStore.getWidgetCanvasConfig()))
const stageStyle = computed(() => ({ width: `${layout.value.width}px`, height: `${layout.value.height}px`,
  left: `${layout.value.left}px`, top: `${layout.value.top}px`, transform: `scale(${layout.value.scale})`, transformOrigin: 'top left' }))

/** 尺寸与坐标更新按帧合并，分栏变化和预览容器移动共用同一条坐标换算链。 */
const refreshLayout = () => {
  if (layoutFrame || disposed) return
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0
    const bounds = viewport.value?.getBoundingClientRect()
    if (bounds) dimensions.value = { width: bounds.width, height: bounds.height }
    void nextTick(() => { if (stage.value && !disposed) widgetStore.setBoundingClientRect(stage.value.getBoundingClientRect()) })
  })
}
const stopSceneDataPolling = () => { polling?.dispose(); polling = null }
const restartSceneDataPolling = async () => {
  if (disposed || !host) return
  if (!polling) polling = createEditorSceneDataPollingController({ getViewportHost: () => host })
  await polling.start()
}

/** 事件总线保留来源资源卡片载荷，三维资源不得误创建为空白二维节点。 */
const startDrag = (value: unknown) => { drag = value as WidgetModel; template = null }
const cancelDrag = () => { drag = null; template = null }
const startTemplateDrag = (value: unknown) => { template = value as ApplyEditorDim3dTemplateInput; drag = null }
const drop = async (event: DragEvent) => {
  event.preventDefault()
  if (!host || isWidgetPreview() || loading.value) return
  const bounds = stage.value?.getBoundingClientRect()
  if (!bounds || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return
  const item = drag
  const templateItem = template
  let releaseOperation: (() => void) | null = null
  cancelDrag()
  try {
    if (templateItem) {
      if (templateItem.saveScope !== 'twoD') { ElMessage.warning('含三维内容的模板待 Unity 接入后应用'); return }
      releaseOperation = beginEditorSceneOperation('template')
      releaseTemplateOperation = releaseOperation
      await ElMessageBox.confirm('应用二维模板将按来源规则覆盖当前场景，并清空原有三维内容，是否继续？', '应用模板', { type: 'warning' })
      stopSceneDataPolling()
      const appliedScene = await applyEditorDim3dTemplate(templateItem, { host, isActive: () => !disposed })
      if (disposed) return
      // 用户明确选择整场景模板覆盖后，原三维包不再是当前编辑基线，不能在保存时恢复旧三维内容。
      retainOriginalScenePackages(sceneId, serializeSceneDefinitionToFourPackages(appliedScene))
      return
    }
    if (!item) return
    if (item.modelType !== DRAG_MODEL_ENUM.Widget) { ElMessage.warning('三维资源将在二维验收后接入 Unity'); return }
    const id = await widgetStore.createWidget(item, { clientX: event.clientX, clientY: event.clientY })
    if (id) widgetStore.setCurrentWidgetsIds([id])
  } catch (error) {
    if (!disposed && error !== 'cancel' && error !== 'close') ElMessage.error(error instanceof Error ? error.message : '创建部件失败')
  } finally {
    releaseOperation?.()
    if (releaseTemplateOperation === releaseOperation) releaseTemplateOperation = null
    if (templateItem && templateItem.templateSceneId !== sceneId) releaseOriginalScenePackages(templateItem.templateSceneId)
    // 模板加载失败时也恢复数据调度，不能让一次失败覆盖操作永久停止已有二维请求。
    if (templateItem && !disposed) await restartSceneDataPolling()
  }
}

/** 文本输入不抢占快捷键；选中组件的编辑事务继续交给来源仓库记录唯一历史。 */
const handleKey = (event: KeyboardEvent) => {
  if (isWidgetPreview() || disposed || !host || loading.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"], .monaco-editor, .el-dialog, .el-drawer')) return
  const modifier = event.ctrlKey || event.metaKey
  if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? host.getCommandBus().redo() : host.getCommandBus().undo(); return }
  if (modifier && event.key.toLowerCase() === 'y') { event.preventDefault(); host.getCommandBus().redo(); return }
  const ids = widgetStore.currentWidgetsIds ?? []
  if ((event.key === 'Delete' || event.key === 'Backspace') && ids.length) { event.preventDefault(); widgetStore.deleteWidgets(ids) }
  if (modifier && event.key.toLowerCase() === 'd' && ids.length) { event.preventDefault(); widgetStore.duplicateWidgets(ids) }
}

onMounted(async () => {
  eventBus?.on(MITT_ON_KEY_ENUM.MODEL_DRAG_START, startDrag)
  eventBus?.on(MITT_ON_KEY_ENUM.MODEL_DRAG_CANCEL, cancelDrag)
  eventBus?.on(MITT_ON_KEY_ENUM.TEMPLATE_DRAG_START, startTemplateDrag)
  eventBus?.on(MITT_ON_KEY_ENUM.TEMPLATE_DRAG_CANCEL, cancelDrag)
  window.addEventListener('keydown', handleKey)
  observer = new ResizeObserver(refreshLayout)
  if (viewport.value) observer.observe(viewport.value)
  refreshLayout()
  emit('sceneLoadStateChange', 'loading')
  try {
    const result = await loadEditorSceneDefinition(sceneId)
    // 请求晚于卸载完成时，仓储刚保留的原始四包也必须释放。
    if (disposed || !stage.value) { releaseOriginalScenePackages(sceneId); return }
    const scene = result.scene ?? createSceneDefinition({ id: sceneId, name: '未命名场景', type: 'local3d', coordinateSystem: { kind: 'local', unit: 'meter', upAxis: 'Y', gridEnabled: true } })
    host = createViewportHost({ container: stage.value, scene })
    await host.mount()
    if (disposed) { host.dispose(); return }
    setActiveSceneViewportHost(host)
    sceneStore.setSceneApi(null)
    setWidgetCommandPort(createCommandBusWidgetCommandPort(() => host?.getCommandBus()))
    setWidgetRuntimePort(createSceneApiWidgetRuntimePort(() => null))
    const overlay = createSceneApiWidgetOverlayHostPort(() => null, () => host?.getRuntime() ?? null)
    setWidgetOverlayHostPort({ ...overlay, refreshViewportLayout: refreshLayout })
    await loadEditorSceneDefinitionIntoHost(sceneId, { host, preloadedResult: result, skipSceneReplace: true, isActive: () => !disposed })
    if (disposed) return
    await restartSceneDataPolling()
    if (disposed) return
    host.getCommandBus().clear()
    emit('sceneLoadStateChange', 'ready')
    refreshLayout()
  } catch (error) {
    if (disposed) return
    appLogger.error('SceneCanvas', '二维场景加载失败', error)
    ElMessage.error(error instanceof Error ? error.message : '二维场景加载失败')
    emit('sceneLoadStateChange', 'failed')
  } finally { if (!disposed) loading.value = false }
})
watch(() => [widgetStore.widgetCanvasSize, layout.value.scale], refreshLayout, { deep: true })
onBeforeUnmount(() => {
  disposed = true
  releaseTemplateOperation?.()
  releaseTemplateOperation = null
  stopSceneDataPolling()
  observer?.disconnect()
  cancelAnimationFrame(layoutFrame)
  window.removeEventListener('keydown', handleKey)
  eventBus?.off(MITT_ON_KEY_ENUM.MODEL_DRAG_START, startDrag)
  eventBus?.off(MITT_ON_KEY_ENUM.MODEL_DRAG_CANCEL, cancelDrag)
  eventBus?.off(MITT_ON_KEY_ENUM.TEMPLATE_DRAG_START, startTemplateDrag)
  eventBus?.off(MITT_ON_KEY_ENUM.TEMPLATE_DRAG_CANCEL, cancelDrag)
  resetWidgetRuntimePorts()
  clearActiveSceneViewportHost(host)
  host?.dispose()
  host = null
  void widgetStore.loadSavedWidgets([], [])
  releaseOriginalScenePackages(sceneId)
})
defineExpose({ stopSceneDataPolling, restartSceneDataPolling })
</script>
<template>
  <div ref="viewport" class="scene-edit-canvas-viewport" @drop="drop" @dragover.prevent>
    <div id="scene-render" ref="stage" class="scene-edit-canvas-stage" :style="stageStyle"><LayerDOM /></div>
  </div>
  <Loading :loading="loading" :percentage="loading ? 0 : 100" />
</template>
<style scoped>
.scene-edit-canvas-viewport { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--scene-edit-canvas-bg, #17191d); }
.scene-edit-canvas-stage { position: absolute; overflow: hidden; background: #1f2937; }
</style>
