import type renderModel from '@/utils/renderScene'
import {
  useSceneStore,
  useSceneWidgetStore,
  type WidgetPreviewSnapshot,
} from '@/stores/sceneEditStore'
import type { SceneRuntime } from '@/scene-platform'
import { createEditorSceneInteractionActionRuntimePort } from '@/integrations/scene/editorSceneInteractionActionRuntime'
import { getActiveSceneViewportHost } from '@/integrations/scene/editorScenePlatformHost'
import {
  getWidgetEventRuntimeService,
  type WidgetEventRuntimePort,
} from './widgetEventRuntimeService'
import {
  getWidgetRuntimePort,
  isWidgetPreview,
  setWidgetPreviewState,
  type WidgetOverlayHostPort,
  type WidgetRuntimePort,
} from './ports'
import { appLogger } from '@/utils/logger'

type SceneApiGetter = () => renderModel | null
type SceneRuntimeGetter = () => SceneRuntime | null

const getCurrentSceneApi = () => useSceneStore().sceneApi

/**
 * 旧 sceneApi 到二维运行时端口的适配器。
 *
 * 注意这里是当前项目集成层，不是平台协议层：
 * - 允许读取旧 renderScene 子模块；
 * - 对外只暴露二维部件所需的预览、交互、状态和选中协调能力。
 */
export const createSceneApiWidgetRuntimePort = (
  getSceneApi: SceneApiGetter = getCurrentSceneApi,
  widgetEventRuntime: WidgetEventRuntimePort = getWidgetEventRuntimeService(),
  getSceneRuntime?: SceneRuntimeGetter,
): WidgetRuntimePort => {
  /** GIS 编辑器没有旧状态模块，因此由当前二维端口自行合并状态扫描帧。 */
  let widgetStatusFrame = 0

  /**
   * 每个画布端口闭包持有自己的懒读取动作端口。
   * 新格式模型显隐优先读取活动 SceneRuntime，旧动作仍在真正命中时才读取 sceneApi；
   * 因此既不会缓存已销毁实例，也保持历史部件联动的旧执行语义。
   */
  const actionRuntime = createEditorSceneInteractionActionRuntimePort({
    getSceneApi,
    // 三维编辑页中的二维部件事件也可操作 Unity 模型；旧页面未传 Runtime 时继续沿用原 sceneApi。
    ...(getSceneRuntime ? { getRuntime: getSceneRuntime } : {}),
  })

  /**
   * 立即结算二维状态规则。
   * 有旧场景实例时仍让旧模块负责三维对象扫描；GIS 编辑器没有该实例，只执行二维规则服务。
   */
  const executeAllWidgetStatusEvents = () => {
    if (widgetStatusFrame) {
      cancelAnimationFrame(widgetStatusFrame)
      widgetStatusFrame = 0
    }

    const sceneApi = getSceneApi()
    if (sceneApi) {
      sceneApi.statusEventModules.executeAllStatusEvents(actionRuntime)
      return
    }

    widgetEventRuntime.executeAllWidgetStatusEvents(actionRuntime)
  }

  /**
   * 状态值变化时按动画帧合并全量评估。
   * Three 场景继续委托旧模块；GIS 场景仅扫描二维部件，避免依赖不存在的旧 renderScene。
   */
  const scheduleWidgetStatusEvaluation = () => {
    const sceneApi = getSceneApi()
    if (sceneApi) {
      sceneApi.statusEventModules.scheduleExecuteAllStatusEvents(actionRuntime)
      return
    }

    if (widgetStatusFrame) return

    widgetStatusFrame = requestAnimationFrame(() => {
      widgetStatusFrame = 0
      /** 帧执行前再次读取宿主，覆盖调度后旧场景实例才完成挂载的情况。 */
      const currentSceneApi = getSceneApi()
      if (currentSceneApi) {
        currentSceneApi.statusEventModules.scheduleExecuteAllStatusEvents(actionRuntime)
        return
      }

      widgetEventRuntime.executeAllWidgetStatusEvents(actionRuntime)
    })
  }

  return {
    isPreview: () => isWidgetPreview() || Boolean(getSceneApi()?.scenePreviewModules.isPreview),
    handleInteractiveEvent: (widgetId, eventType, childId) => {
      if (childId) {
        widgetEventRuntime.handleWidgetInteractiveEvent(widgetId, eventType, actionRuntime, childId)
      } else {
        widgetEventRuntime.handleWidgetInteractiveEvent(widgetId, eventType, actionRuntime)
      }
    },
    scheduleStatusEvaluation: scheduleWidgetStatusEvaluation,
    executeAllStatusEvents: executeAllWidgetStatusEvents,
    clearSceneObjectSelection: () => {
      /**
       * 二维部件选中前统一清除领域选中、三维兼容编号和旧引擎控制器。
       * 领域 Store 的清选会通过 RuntimeBridge 同步到 Unity / 网页 Runtime，保证同一时刻只有
       * 一个画布对象处于编辑焦点；旧 sceneApi 调用仅负责清理尚未迁移对象的即时视觉状态。
       */
      const sceneStore = useSceneStore()
      const platformStore = getActiveSceneViewportHost()?.getStore()
      platformStore?.setSelectedObjectId(null)
      platformStore?.setSelectedEffectId(null)
      getSceneApi()?.transformControlsModules.clearCurrentSelection()
      sceneStore.setCurrentTransformMaterialUuid(null)
      sceneStore.setSelectedThreeMapObjectId(null)
    },
    /** 场景卸载时取消 GIS 端口自行排队的状态扫描，防止动作落到已离开的画布。 */
    dispose: () => {
      actionRuntime.dispose?.()
      if (!widgetStatusFrame) return

      cancelAnimationFrame(widgetStatusFrame)
      widgetStatusFrame = 0
    },
  }
}

/**
 * 旧 sceneApi 到二维叠加层宿主端口的适配器。
 *
 * 这部分只处理视口级协调，不承载二维业务数据。
 * 后续替换三维底层时，可以由统一 SceneRuntime 或编辑器外壳提供同名端口实现。
 */
export const createSceneApiWidgetOverlayHostPort = (
  getSceneApi: SceneApiGetter = getCurrentSceneApi,
  getRuntime: SceneRuntimeGetter = () => null,
  restorePreviewState: () => void = () => undefined,
): WidgetOverlayHostPort => {
  const widgetStore = useSceneWidgetStore()
  let widgetPreviewSnapshot: WidgetPreviewSnapshot | null = null
  let previewLifecycleVersion = 0
  let previewActive = false
  let previewStartupVersion: number | null = null
  /** 预览期间隐藏编辑选中态，退出时恢复进入预览前的对象和地图对象路由。 */
  let previewSelectionSnapshot: {
    objectId: string | null
    effectId: string | null
    threeMapObjectId: string | null
  } | null = null

  const clearEditorSelectionForPreview = () => {
    const sceneStore = useSceneStore()
    const platformStore = getActiveSceneViewportHost()?.getStore()
    if (!previewSelectionSnapshot) {
      previewSelectionSnapshot = {
        objectId:
          platformStore?.getSelectedObjectId() ?? sceneStore.currentTransformMaterialUuid ?? null,
        effectId: platformStore?.getSelectedEffectId() ?? null,
        threeMapObjectId: sceneStore.selectedThreeMapObjectId ?? null,
      }
    }

    /** 先清领域选中态，再关闭运行时编辑能力，避免预览首帧仍显示旧对象选中状态。 */
    platformStore?.setSelectedObjectId(null)
    platformStore?.setSelectedEffectId(null)
    sceneStore.setCurrentTransformMaterialUuid(null)
    sceneStore.setSelectedThreeMapObjectId(null)
    getSceneApi()?.transformControlsModules?.clearCurrentSelection?.()
  }

  const restoreEditorSelectionAfterPreview = () => {
    const snapshot = previewSelectionSnapshot
    previewSelectionSnapshot = null
    if (!snapshot) return

    const sceneStore = useSceneStore()
    const platformStore = getActiveSceneViewportHost()?.getStore()
    if (snapshot.objectId) {
      platformStore?.setSelectedObjectId(snapshot.objectId)
      sceneStore.setCurrentTransformMaterialUuid(snapshot.objectId)
      getRuntime()?.setSelectedObject(snapshot.objectId)
    }
    if (snapshot.effectId) {
      platformStore?.setSelectedEffectId(snapshot.effectId)
    }
    if (snapshot.threeMapObjectId) {
      sceneStore.setSelectedThreeMapObjectId(snapshot.threeMapObjectId)
    }
  }

  const restoreWidgetPreviewState = (clearSnapshot = true) => {
    if (!widgetPreviewSnapshot) return
    widgetStore.restoreWidgetPreviewSnapshot(widgetPreviewSnapshot)
    if (clearSnapshot) widgetPreviewSnapshot = null
  }

  return {
    /** GIS 场景没有旧 sceneApi，但统一 ViewportHost 已挂载时同样属于可用的叠加层宿主。 */
    isMounted: () => Boolean(getSceneApi() || getRuntime()),
    refreshViewportLayout: () => {
      getSceneApi()?.onWindowResizes()
    },
    enterPreview: async () => {
      const currentLifecycleVersion = ++previewLifecycleVersion
      if (!previewActive) {
        /**
         * 预览允许交互结果临时改变二维部件，但不允许这些结果成为编辑态配置；快照必须在
         * 设置预览标记和启动状态规则之前捕获，确保“进入前”的显隐与弹窗状态可恢复。
         */
        widgetPreviewSnapshot = widgetStore.createWidgetPreviewSnapshot()
        previewActive = true
      }
      previewStartupVersion = currentLifecycleVersion

      clearEditorSelectionForPreview()
      setWidgetPreviewState(true)
      /**
       * 预览入口同时通知统一 SceneRuntime 关闭编辑能力。
       * 本地三维 Runtime 会转发到旧 TransformControls，GIS Runtime 会清理 Cesium Gizmo；
       * 顶部入口不判断具体引擎，底层差异由 Runtime 自身处理。
       */
      const runtime = getRuntime()
       await runtime?.setEditingEnabled?.(false)
      /**
       * Store 中保留进入预览前的选中编号，便于退出时恢复；Runtime 侧单独清选，
       * 可立即移除 GIS 模型高亮、包围盒和 Gizmo，又不会污染对象树的编辑态记忆。
       */
      runtime?.setSelectedObject(null)

      try {
        await getSceneApi()?.scenePreviewModules.setScenePreview()
        if (currentLifecycleVersion !== previewLifecycleVersion) {
          /** 退出发生在异步初始化期间时，清理迟到完成并再次覆盖可能产生的运行态回写。 */
          getSceneApi()?.scenePreviewModules.exitScenePreview()
          restoreWidgetPreviewState()
        } else if (!getSceneApi()) {
          /**
           * GIS 没有旧 scenePreviewModules；通过已注册的配对运行端口评估已满足的二维初始状态，
           * 复用同一动作上下文，避免预览入口另建端口后把规则动作发往错误场景。
           */
          getWidgetRuntimePort().executeAllStatusEvents()
        }
        previewStartupVersion = null
      } catch (error) {
        if (currentLifecycleVersion === previewLifecycleVersion) {
          previewActive = false
          setWidgetPreviewState(false)
          getSceneApi()?.scenePreviewModules.exitScenePreview()
          restorePreviewState()
          restoreEditorSelectionAfterPreview()
          restoreWidgetPreviewState()
          void Promise.resolve(runtime?.setEditingEnabled?.(true)).catch((restoreError) => {
            appLogger.error('SceneApiWidgetRuntimeAdapter', '恢复 Unity 编辑模式失败', restoreError)
          })
        } else {
          /** 退出方保留了快照，迟到失败仍需完成最后一次二维状态回滚。 */
          restoreWidgetPreviewState()
        }
        previewStartupVersion = null
        throw error
      }
    },
    exitPreview: () => {
      ++previewLifecycleVersion
      // 退出预览时立即恢复二维编辑态，旧预览模块负责清理三维任务和事件监听。
      setWidgetPreviewState(false)
      getSceneApi()?.scenePreviewModules.exitScenePreview()
      const runtime = getRuntime()
      void Promise.resolve(runtime?.setEditingEnabled?.(true)).catch((error) => {
        appLogger.error('SceneApiWidgetRuntimeAdapter', '退出预览后恢复 Unity 编辑模式失败', error)
      })
      restorePreviewState()
      restoreEditorSelectionAfterPreview()
      // 预览初始化尚未完成时保留快照，待迟到 Promise settle 后再做一次兜底恢复。
      restoreWidgetPreviewState(previewStartupVersion === null)
      previewActive = false
      /**
       * 预览期间结构树仍可能改变领域选中对象，但 Runtime 不会创建 Gizmo。
       * 退出后重新同步当前选中对象，保证两类场景都恢复编辑辅助器。
       */
    },
    clearSceneSelectionWhenBlankClick: (event) => {
      return Boolean(getSceneApi()?.transformControlsModules.clearSelectionWhenClickBlank(event))
    },
    restoreSceneObjectHighlight: (uuid) => {
      if (!uuid) return
      const currentObject = getSceneApi()?.getSceneObjectByUuid(uuid)
      if (currentObject) {
        getSceneApi()?.setObjectHighlight(currentObject)
      }
    },
  }
}
