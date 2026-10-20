import type renderModel from '@/utils/renderScene'
import type { RenderSceneStoreBridge } from '@/utils/renderScene'
import { createLegacySceneInteractionActionRuntimePort } from '@/integrations/scene/editorSceneInteractionActionRuntime'
import {
  getWidgetEventRuntimeService,
  type WidgetEventRuntimePort,
} from './widgetRuntime/widgetEventRuntimeService'
import {
  setWidgetPreviewState,
  type WidgetCommandPort,
  type WidgetOverlayHostPort,
  type WidgetRuntimePort,
} from './widgetRuntime/ports'

type PreviewSceneApiGetter = () => renderModel | null

/**
 * 发布预览页使用的旧 renderScene Store 桥。
 *
 * 预览页只允许旧渲染核心读取固定运行态开关，不允许把点击选中、属性刷新信号
 * 写回编辑器 Store。这样 local3d 新格式和旧格式兜底都能继续渲染，但不会污染
 * 编辑页的 currentTransformMaterialUuid、随机刷新标记或测量态。
 */
export const createReadonlyPreviewRenderSceneStoreBridge = (): RenderSceneStoreBridge => ({
  getIsMeasuring: () => false,
  setCurrentTransformMaterialUuid: () => undefined,
  setTransformMaterialRandomId: () => undefined,
})

/**
 * 发布预览页使用的二维运行时端口。
 *
 * 该端口只保留运行态必要能力：部件交互事件、状态规则调度和旧 Three 选中框清理。
 * 清理选中只作用在旧 renderScene 内存对象上；由于 Store 桥是只读 no-op，
 * 即使旧 transformControls 内部触发回调，也不会反向写入编辑态 Store。
 */
export const createReadonlyPreviewWidgetRuntimePort = (
  getSceneApi: PreviewSceneApiGetter,
  widgetEventRuntime: WidgetEventRuntimePort = getWidgetEventRuntimeService(),
  activateWidgets?: (widgetIds: readonly string[]) => Promise<void>,
  activateWidgetGroups?: (groupIds: readonly string[]) => Promise<void>,
  prepareSceneObjects?: WidgetRuntimePort['prepareSceneObjects'],
): WidgetRuntimePort => {
  /**
   * 发布页不能读取编辑器 Store 中的 sceneApi。
   * 这里把发布 renderScene 的 getter 注入动作端口，使二维点击、状态规则中的高亮、相机和显隐
   * 始终作用于当前预览实例；端口本身不写编辑器 Store，仍保持只读边界。
   */
  const actionRuntime = createLegacySceneInteractionActionRuntimePort({ getSceneApi })
  /**
   * 发布页没有编辑器 Store 场景实例，不能把二维状态规则再交给旧 statusEventModules。
   * 单独按帧合并可保留连续输入不重复全量执行的性能特性，并确保动作绑定当前预览实例。
   */
  let widgetStatusFrame = 0

  const executeWidgetStatusEvents = () => {
    widgetEventRuntime.executeAllWidgetStatusEvents(actionRuntime)
  }

  const scheduleWidgetStatusEvents = () => {
    if (widgetStatusFrame) return

    widgetStatusFrame = requestAnimationFrame(() => {
      widgetStatusFrame = 0
      executeWidgetStatusEvents()
    })
  }

  return {
    isPreview: () => true,
    handleInteractiveEvent: (widgetId, eventType, childId) => {
      if (childId) {
        widgetEventRuntime.handleWidgetInteractiveEvent(widgetId, eventType, actionRuntime, childId)
      } else {
        widgetEventRuntime.handleWidgetInteractiveEvent(widgetId, eventType, actionRuntime)
      }
    },
    scheduleStatusEvaluation: scheduleWidgetStatusEvents,
    executeAllStatusEvents: executeWidgetStatusEvents,
    /** 隐藏二维组件只在当前预览会话第一次显示时由分片缓存创建，不写回编辑态。 */
    ...(activateWidgets ? { activateWidgets } : {}),
    /** 页面框架通过分组显隐切页；分组成员由发布控制器从完整内存图层树批量补齐。 */
    ...(activateWidgetGroups ? { activateWidgetGroups } : {}),
    /** 所有三维目标动作先经过当前发布控制器的依赖与实例就绪屏障。 */
    ...(prepareSceneObjects ? { prepareSceneObjects } : {}),
    clearSceneObjectSelection: () => {
      getSceneApi()?.transformControlsModules.clearCurrentSelection()
    },
    dispose: () => {
      actionRuntime.dispose?.()
      if (!widgetStatusFrame) return

      cancelAnimationFrame(widgetStatusFrame)
      widgetStatusFrame = 0
    },
  }
}

/**
 * 发布预览页的二维命令端口。
 *
 * 预览态的二维部件可以上报运行时值，但不能把编辑配置变化提交到历史系统。
 * 因此这里固定丢弃 WidgetCommand，并始终返回“未执行历史命令”。
 */
export const createReadonlyPreviewWidgetCommandPort = (): WidgetCommandPort => ({
  executeWidgetCommand: () => undefined,
  isApplyingWidgetHistory: () => false,
})

/**
 * 发布预览页的叠加层宿主端口。
 *
 * 宿主只负责切换二维预览态、通知旧 renderScene 刷新尺寸和执行旧预览模块。
 * 空白清选与高亮恢复不写 Store；发布页没有编辑选中态，避免和编辑器预览混用。
 */
export const createReadonlyPreviewWidgetOverlayHostPort = (
  getSceneApi: PreviewSceneApiGetter,
): WidgetOverlayHostPort => {
  /**
   * 每次进入或退出预览都会推进生命周期版本。
   * 旧预览初始化包含远程请求，页面可能在请求完成前卸载；版本校验可阻止迟到失败再次清理
   * 已销毁的 renderScene，同时避免重复执行退出逻辑。
   */
  let previewLifecycleVersion = 0
  let previewActive = false

  return {
    isMounted: () => true,
    refreshViewportLayout: () => {
      getSceneApi()?.onWindowResizes()
    },
    enterPreview: async () => {
      /**
       * 返回旧预览初始化 Promise，而非在此处直接结算二维状态。
       * 上层会在 Promise 完成后调用当前 WidgetRuntimePort，保证数据绑定、远程初始值和打点准备完成后
       * 再执行状态规则，同时避免把只读预览实例写入编辑器 Store。
       */
      const currentLifecycleVersion = ++previewLifecycleVersion
      const sceneApi = getSceneApi()
      previewActive = true
      setWidgetPreviewState(true)

      try {
        await sceneApi?.scenePreviewModules.setScenePreview()
      } catch (error) {
        /**
         * 仅当前仍有效的进入请求负责失败回滚。
         * 若页面已退出或卸载，exitPreview 已完成清理，迟到失败只继续向调用方报告，
         * 不能再次访问已销毁的旧运行时实例。
         */
        if (currentLifecycleVersion === previewLifecycleVersion) {
          previewLifecycleVersion += 1
          previewActive = false
          setWidgetPreviewState(false)
          sceneApi?.scenePreviewModules.exitScenePreview()
        }
        throw error
      }
    },
    exitPreview: () => {
      previewLifecycleVersion += 1
      setWidgetPreviewState(false)
      if (!previewActive) return

      previewActive = false
      getSceneApi()?.scenePreviewModules.exitScenePreview()
    },
    clearSceneSelectionWhenBlankClick: () => {
      getSceneApi()?.transformControlsModules.clearCurrentSelection()
      return false
    },
    restoreSceneObjectHighlight: () => undefined,
  }
}
