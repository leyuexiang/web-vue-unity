<template>
  <div class="scene-edit-operation">
    <div class="scene-edit-operation__group">
      <div class="scene-edit-operation__rail">
        <el-tooltip
          v-for="item in transformTypeList"
          :key="item.type"
          :content="item.label"
          placement="bottom"
          popper-class="scene-edit-popover"
        >
          <span
            :class="['scene-edit-icon-button', { 'is-active': transformType === item.type }]"
            @click="handleTransformType(item.type)"
          >
            <!-- 使用遮罩图标让按钮颜色继承父级，激活态才能复用统一的主题色。 -->
            <span
              class="scene-edit-icon-button__image"
              :style="createIconStyle(item.icon)"
              aria-hidden="true"
            ></span>
          </span>
        </el-tooltip>
      </div>
      <div class="scene-edit-operation__rail">
        <el-tooltip
          v-for="item in availableMeasureTypeList"
          :key="item.type"
          :content="item.label"
          placement="bottom"
          popper-class="scene-edit-popover"
        >
          <span
            :class="[
              'scene-edit-icon-button',
              'scene-edit-icon-button--measure',
              { 'is-active': measureDistanceType === item.type },
            ]"
            @click="handleMeasureDistanceType(item.type)"
          >
            <!-- 测量图标同样通过 currentColor 继承默认/选中颜色。 -->
            <span
              class="scene-edit-icon-button__image"
              :style="createIconStyle(item.icon)"
              aria-hidden="true"
            ></span>
          </span>
        </el-tooltip>
      </div>
    </div>

    <!-- 保存和预览已收敛到顶栏；这里仅保留设计稿定义的编辑辅助与历史操作。 -->
    <el-divider direction="vertical" />
    <div class="scene-edit-operation__group">
      <div class="scene-edit-operation__rail">
        <el-tooltip content="撤销" placement="bottom" popper-class="scene-edit-popover">
          <span
            :class="['scene-edit-icon-button', { 'is-disabled': isUndoDisabled }]"
            @click="handleUndo"
          >
            <span
              class="scene-edit-icon-button__image"
              :style="createIconStyle(undoIcon)"
              aria-hidden="true"
            ></span>
          </span>
        </el-tooltip>
        <el-tooltip content="重做" placement="bottom" popper-class="scene-edit-popover">
          <span
            :class="['scene-edit-icon-button', { 'is-disabled': isRedoDisabled }]"
            @click="handleRedo"
          >
            <span
              class="scene-edit-icon-button__image"
              :style="createIconStyle(redoIcon)"
              aria-hidden="true"
            ></span>
          </span>
        </el-tooltip>
        <el-tooltip content="重置场景" placement="bottom" popper-class="scene-edit-popover">
          <span class="scene-edit-icon-button" @click="handleRefreshScene">
            <span
              class="scene-edit-icon-button__image"
              :style="createIconStyle(resetIcon)"
              aria-hidden="true"
            ></span>
          </span>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, getCurrentInstance } from 'vue'
import undoIcon from '@/assets/images/scene-editor-tool-undo.svg'
import redoIcon from '@/assets/images/scene-editor-tool-redo.svg'
import resetIcon from '@/assets/images/scene-editor-tool-reset.svg'
import type { CommandBus, RuntimeCapabilities, SceneStore, SceneStoreEvent } from '@/scene-platform'
import { TRANSFORM_CONTROLS_ENUM, MEASURE_ENUM } from '@/enums/scenePanelEnum'
import { useSceneStore } from '@/stores/sceneEditStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MITT_ON_KEY_ENUM } from '@/enums'
import { transformTypeList, measureTypeList } from './config'
import { useRoute } from 'vue-router'
import { appLogger } from '@/utils/logger'
import { beginEditorSceneOperation, editorSceneOperation } from '@/integrations/scene/editorSceneOperationGate'
import { saveActiveEditorSceneDefinition } from '@/integrations/scene/editorSceneSaveAdapter'
import type {
  EditorDim3dSceneSaveBookmark,
  EditorDim3dSceneSaveContext,
} from '@/integrations/scene/editorDim3dSceneSaveService'
import { subscribeActiveSceneViewportHost } from '@/integrations/scene/editorScenePlatformHost'
import { UnityEditorSceneRuntime } from '@/unity-runtime/runtime/UnityEditorSceneRuntime'
import { createEditorSceneSaveStateTracker } from '@/integrations/scene/editorSceneSaveState'
import {
  clearEditorHistory,
  getEditorUndoRedoState,
  redoEditorHistory,
  undoEditorHistory,
} from '@/integrations/scene/editorSceneUndoRedoAdapter'
import {
  canUseEditorSceneMeasure,
  filterEditorSceneMeasureTools,
  getEditorSceneRuntimeCapabilities,
} from '@/integrations/scene/editorSceneToolCapabilityAdapter'

const { $eventBus } = getCurrentInstance()?.proxy || {}
const store = useSceneStore()
const route = useRoute()

const props = withDefaults(
  defineProps<{
    /** 编辑器根组件持有锁上下文；工具栏不自行读取 sessionStorage 中的敏感令牌。 */
    saveContext?: EditorDim3dSceneSaveContext | null
  }>(),
  {
    saveContext: null,
  },
)

const emit = defineEmits<{
  /** 保存成功后把服务端书签交还根组件，供下一次保存携带最新基准修订号。 */
  saveSucceeded: [bookmark: EditorDim3dSceneSaveBookmark]
  /** 同步真实请求中的状态，供顶栏禁用保存按钮；脏状态变化不会触发额外接口。 */
  saveStateChange: [saving: boolean]
}>()

/**
 * 将外部 SVG 作为遮罩使用，图形只保留透明度，实际颜色由按钮的 currentColor 决定。
 * 这样普通、悬停、激活和禁用状态都能沿用场景编辑器的同一套颜色变量。
 */
const createIconStyle = (icon: string) => ({
  '--scene-icon-src': `url("${icon}")`,
})

const scenePlatformCommandBus = ref<CommandBus | null>(null)
const scenePlatformHistoryRevision = ref(0)
const runtimeCapabilities = ref<RuntimeCapabilities | null>(null)
const scenePlatformStore = ref<SceneStore | null>(null)
/** GIS 与普通三维共用 Unity 的变换接口。 */
const unityGizmoRuntime = ref<UnityEditorSceneRuntime | null>(null)
const editorSceneSaveStateTracker = createEditorSceneSaveStateTracker((snapshot) => {
  sceneSaveState.value = snapshot
  emit('saveStateChange', snapshot.saving)
})
const sceneSaveState = ref(editorSceneSaveStateTracker.getSnapshot())
let stopScenePlatformHostSubscription: (() => void) | null = null
let stopScenePlatformStoreSubscription: (() => void) | null = null
let stopScenePlatformHistorySubscription: (() => void) | null = null

const refreshScenePlatformHistoryRevision = () => {
  scenePlatformHistoryRevision.value += 1
}

/**
 * 场景选中态可能来自结构树、浏览器拾取或 Runtime 反写，不一定经过顶部按钮。
 * 当当前按钮停在“旋转”且新选中对象是看板时，同步退回“平移”，避免 UI 高亮与真实控件不一致。
 */
const syncTransformTypeAfterSceneStoreEvent = (event?: SceneStoreEvent) => {
  refreshScenePlatformHistoryRevision()
  if (transformType.value !== TRANSFORM_CONTROLS_ENUM.Rotate) return

  const selectedObjectId = event?.type === 'selectionChanged' ? event.objectId : undefined
  const nextType = coerceTransformTypeForCurrentSelection(transformType.value, selectedObjectId)
  if (nextType === transformType.value) return

  if (unityGizmoRuntime.value) {
    void unityGizmoRuntime.value.setGizmoMode(nextType).then(() => { transformType.value = nextType })
      .catch((error: unknown) => ElMessage.error(error instanceof Error ? error.message : 'Unity 变换模式切换失败'))
    return
  }

  const appliedType =
    store.sceneApi?.transformControlsModules?.setTransformControlsMode(nextType) ?? nextType
  transformType.value = normalizeTransformControlsMode(appliedType)
}

const subscribeScenePlatformStore = (nextStore: SceneStore | null) => {
  stopScenePlatformStoreSubscription?.()
  stopScenePlatformStoreSubscription = null
  refreshScenePlatformHistoryRevision()

  if (!nextStore) return

  /**
   * CommandBus 本身不暴露订阅接口；当前所有平台命令都会改写 Store。
   * 顶部按钮用 Store 事件作为刷新信号，读取 CommandBus 栈大小来更新禁用态。
   */
  stopScenePlatformStoreSubscription = nextStore.subscribe(syncTransformTypeAfterSceneStoreEvent)
}

const subscribeScenePlatformHistory = (nextCommandBus: CommandBus | null) => {
  stopScenePlatformHistorySubscription?.()
  stopScenePlatformHistorySubscription = null
  if (!nextCommandBus) return
  stopScenePlatformHistorySubscription = nextCommandBus.subscribeHistory(
    refreshScenePlatformHistoryRevision,
  )
}

const editorHistoryState = computed(() => {
  void scenePlatformHistoryRevision.value
  return getEditorUndoRedoState({
    commandBus: scenePlatformCommandBus.value,
  })
})

const isUndoDisabled = computed(() => {
  return !editorHistoryState.value.canUndo
})
const isRedoDisabled = computed(() => {
  return !editorHistoryState.value.canRedo
})

const transformType = ref<TRANSFORM_CONTROLS_ENUM>(TRANSFORM_CONTROLS_ENUM.Translate)

/** Three TransformControls 返回字符串模式；工具栏内部统一转回项目枚举，避免响应式状态被放宽成字符串。 */
const normalizeTransformControlsMode = (mode: string): TRANSFORM_CONTROLS_ENUM => {
  if (mode === TRANSFORM_CONTROLS_ENUM.Rotate) return TRANSFORM_CONTROLS_ENUM.Rotate
  if (mode === TRANSFORM_CONTROLS_ENUM.Scale) return TRANSFORM_CONTROLS_ENUM.Scale
  return TRANSFORM_CONTROLS_ENUM.Translate
}

/**
 * 当前选中对象是三维看板时，旋转工具统一降级为平移工具。
 *
 * 看板本身由 Sprite 表达，始终面向相机；这里只在按钮点击边界读取一次 Store，
 * 不订阅每帧场景变化，避免工具栏为低频交互引入多余查询。
 */
const coerceTransformTypeForCurrentSelection = (
  type: TRANSFORM_CONTROLS_ENUM,
  selectedObjectId?: string | null,
) => {
  if (type !== TRANSFORM_CONTROLS_ENUM.Rotate) return type

  /**
   * 鼠标点击旧画布时 legacy 选中态可能先于 SceneStore 更新；结构树选择时则是 SceneStore 先更新。
   * 这里按“显式事件编号 → 旧选中态 → 平台选中态”取值，覆盖两条过渡期链路。
   */
  const objectId =
    selectedObjectId !== undefined
      ? selectedObjectId
      : store.currentTransformMaterialUuid || scenePlatformStore.value?.getSelectedObjectId()
  const sceneObject = objectId ? scenePlatformStore.value?.getObject(objectId) : null
  return sceneObject?.billboard ? TRANSFORM_CONTROLS_ENUM.Translate : type
}

const handleTransformType = async (type: TRANSFORM_CONTROLS_ENUM) => {
  // 二维宿主不具备三维操控器，入口保留但不能伪造激活状态。
  if (!runtimeCapabilities.value?.editing.gizmo) { ElMessage.info('三维变换待 Unity 云渲染接入'); return }

  const nextType = coerceTransformTypeForCurrentSelection(type)
  if (unityGizmoRuntime.value) {
    try {
      await unityGizmoRuntime.value.setGizmoMode(nextType)
      transformType.value = nextType
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : 'Unity 变换模式切换失败')
    }
    return
  }

  /** 非 GIS 场景继续沿用现有 Three TransformControls 行为，保证原编辑器交互不受影响。 */
  const appliedType =
    store.sceneApi?.transformControlsModules?.setTransformControlsMode(nextType) ?? nextType
  transformType.value = normalizeTransformControlsMode(appliedType)
}

/**
 * 画布只负责识别 Q/W/E，工具栏负责真正切换模式。
 * 这样快捷键与鼠标按钮共用 `handleTransformType`，GIS 看板限制、当前高亮和 Three 降级逻辑不会分叉。
 */
const handleTransformModeShortcut = (mode: 'translate' | 'rotate' | 'scale') => {
  handleTransformType(mode as TRANSFORM_CONTROLS_ENUM)
}

const measureDistanceType = ref<MEASURE_ENUM | null>(null)
const availableMeasureTypeList = computed(() =>
  filterEditorSceneMeasureTools(measureTypeList, runtimeCapabilities.value),
)
watch(
  () => store.isMeasuring,
  (newVal) => {
    if (!newVal) {
      measureDistanceType.value = null
    }
  },
)
watch(availableMeasureTypeList, (nextList) => {
  if (!measureDistanceType.value) return
  if (nextList.some((item) => item.type === measureDistanceType.value)) return

  /**
   * Runtime 切换后如果测量能力不可用，需要同步清理按钮选中态和旧测量态。
   * 这里只在能力变更时触发一次，避免每次渲染都访问旧 sceneApi。
   */
  measureDistanceType.value = null
  store.sceneApi?.measureDistanceModules?.stopMeasure()
})
const handleMeasureDistanceType = (type: MEASURE_ENUM) => {
  if (!canUseEditorSceneMeasure(runtimeCapabilities.value)) return
  if (measureDistanceType.value === type) {
    measureDistanceType.value = null
    store.sceneApi?.measureDistanceModules?.stopMeasure()
    return
  }
  measureDistanceType.value = type
  store.sceneApi?.measureDistanceModules?.startMeasure(type)
}

const handleUndo = () => {
  if (isUndoDisabled.value) return
  const applied = undoEditorHistory({
    commandBus: scenePlatformCommandBus.value,
  })
  if (!applied) return
  refreshScenePlatformHistoryRevision()
  $eventBus?.emit(MITT_ON_KEY_ENUM.HISTORY_APPLIED, true)
}

const handleRedo = () => {
  if (isRedoDisabled.value) return
  const applied = redoEditorHistory({
    commandBus: scenePlatformCommandBus.value,
  })
  if (!applied) return
  refreshScenePlatformHistoryRevision()
  $eventBus?.emit(MITT_ON_KEY_ENUM.HISTORY_APPLIED, true)
}

const handleSaveSceneConfig = async () => {
  if (sceneSaveState.value.saving || editorSceneOperation.value) return
  const release = beginEditorSceneOperation('save')
  editorSceneSaveStateTracker.beginSave()

  try {
    /**
     * G002 起保存入口改为提交 SceneStore 中的纯 SceneDefinition。
     * 旧 sceneApi 仍负责当前真实画面和未迁移交互，但不再作为保存 JSON 的拼装来源。
     */
    const result = await saveActiveEditorSceneDefinition({
      sceneApi: store.sceneApi,
      saveContext: props.saveContext,
    })
    if (!result.backendBookmark) {
      throw new Error('场景保存接口未返回后端保存书签。')
    }
    editorSceneSaveStateTracker.markSaved()
    /**
     * 保存成功后，当前场景快照就是新的撤销基线。
     * 清空平台 CommandBus。旧 renderScene.historyModules 是无状态兼容门面，不再存在第二套历史栈。
     */
    clearEditorHistory({
      commandBus: scenePlatformCommandBus.value,
    })
    refreshScenePlatformHistoryRevision()
    emit('saveSucceeded', result.backendBookmark)
    ElMessage.success('场景保存成功')
  } catch (error) {
    const saveFailureState = editorSceneSaveStateTracker.markFailed(error)
    /**
     * G008 要求保存失败不能清空脏状态。
     * 失败时只记录场景 id 和错误原因，当前 Store 快照继续留在页面中，用户修复接口或网络后可直接重试保存。
     */
    appLogger.error('SceneOperation', '保存场景定义失败', route.query.id, error)
    ElMessage.error(saveFailureState.lastErrorMessage || '场景保存失败，当前改动已保留')
  } finally {
    release()
  }
}

const handleRefreshScene = () => {
  if (editorSceneOperation.value) return
  ElMessageBox.confirm('将会清空当前场景和历史记录，是否重置？', '重置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    // 重置直接重新读取服务端修订，不从空旧渲染器中生成场景。
    window.location.reload()
    clearEditorHistory({
      commandBus: scenePlatformCommandBus.value,
    })
    refreshScenePlatformHistoryRevision()
  })
}

const handlePreviewScene = () => {
  $eventBus?.emit(MITT_ON_KEY_ENUM.PREVIEW_SCENE, true)
}

// 顶部栏只代理公开方法，保存、预览仍由本组件维护原有平台与事件总线链路。
// 宿主刷新后显式标为未保存；锁令牌与后端修订仍由根组件持有。
defineExpose({
  handleSaveSceneConfig,
  handlePreviewScene,
  sceneSaveState,
  markSceneDirty: editorSceneSaveStateTracker.markDirty,
})

onMounted(() => {
  $eventBus?.on(MITT_ON_KEY_ENUM.TRANSFORM_MODE_SHORTCUT, handleTransformModeShortcut)
  stopScenePlatformHostSubscription = subscribeActiveSceneViewportHost((host) => {
    scenePlatformCommandBus.value = host?.getCommandBus() ?? null
    subscribeScenePlatformHistory(scenePlatformCommandBus.value)
    runtimeCapabilities.value = getEditorSceneRuntimeCapabilities(host)
    const runtime = host?.getRuntime() ?? null
    unityGizmoRuntime.value = runtime instanceof UnityEditorSceneRuntime ? runtime : null
    const nextStore = host?.getStore() ?? null
    scenePlatformStore.value = nextStore
    subscribeScenePlatformStore(nextStore)
    editorSceneSaveStateTracker.bindStore(nextStore)
  })
})

onBeforeUnmount(() => {
  $eventBus?.off(MITT_ON_KEY_ENUM.TRANSFORM_MODE_SHORTCUT, handleTransformModeShortcut)
  stopScenePlatformHostSubscription?.()
  stopScenePlatformHostSubscription = null
  stopScenePlatformStoreSubscription?.()
  stopScenePlatformStoreSubscription = null
  stopScenePlatformHistorySubscription?.()
  stopScenePlatformHistorySubscription = null
  scenePlatformCommandBus.value = null
  runtimeCapabilities.value = null
  scenePlatformStore.value = null
  unityGizmoRuntime.value = null
  editorSceneSaveStateTracker.dispose()
})
</script>
