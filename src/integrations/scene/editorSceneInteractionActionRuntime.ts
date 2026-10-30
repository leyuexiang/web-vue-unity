import type { SceneRuntime } from '@/scene-platform/runtime/sceneRuntime'
import type { ActionItem } from '@/types/threeScene'
import {
  executeInteractionActionList,
  type InteractionActionExecutionContext,
} from '@/utils/renderScene/interactionActionExecutors'
import { getSceneRuntimeBridge } from '@/utils/renderScene/sceneRuntimeBridge'
import {
  createInteractionLifecycleGuard,
  type ActionCompletion,
} from '@/utils/renderScene/interactionActionSequence'

export interface EditorSceneInteractionActionRuntimePort {
  /** 端口销毁或宿主被替换后返回 false，供等待中的动作及时结束。 */
  isActive?: () => boolean
  dispose?: () => void
  executeActionList: (
    actions: ActionItem[],
    context?: Omit<InteractionActionExecutionContext, 'sceneApi'>,
  ) => ActionCompletion
}

export interface EditorSceneInteractionActionRuntimeOptions {
  getRuntime?: () => SceneRuntime | null
  getSceneApi?: () => InteractionActionExecutionContext['sceneApi']
  isActive?: () => boolean
}

/**
 * 交互动作共用一个生命周期端口。
 * 三维对象目标使用当前 Runtime 的稳定编号；二维部件事件继续使用现有旧场景适配器。
 */
export const createEditorSceneInteractionActionRuntimePort = (
  options: EditorSceneInteractionActionRuntimeOptions = {},
): EditorSceneInteractionActionRuntimePort => {
  let disposed = false
  const hasRuntimeGetter = options.getRuntime !== undefined
  const isPortActive = () => !disposed && (options.isActive?.() ?? true)

  return {
    isActive: isPortActive,
    dispose: () => {
      disposed = true
    },
    executeActionList: (actions, context) => {
      const runtime = options.getRuntime?.() ?? context?.sceneRuntime ?? null
      // 显式提供 Runtime 时禁止回退到旧三维场景；仅二维兼容调用读取旧 sceneApi。
      const sceneApi = options.getSceneApi?.() ??
        (hasRuntimeGetter ? null : getSceneRuntimeBridge().sceneApi)
      const isActive = createInteractionLifecycleGuard(
        () =>
          isPortActive() &&
          (context?.isActive?.() ?? true) &&
          (!options.getRuntime || options.getRuntime() === runtime),
      )

      return executeInteractionActionList(actions ?? [], {
        ...context,
        sceneApi,
        sceneRuntime: runtime,
        isActive,
      })
    },
  }
}

/** 历史入口继续复用同一端口，保证二维部件动作保留既有场景读取方式。 */
export const createLegacySceneInteractionActionRuntimePort =
  createEditorSceneInteractionActionRuntimePort
