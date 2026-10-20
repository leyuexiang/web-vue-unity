import type { SceneRuntime } from '@/scene-platform/runtime/sceneRuntime'
import { executeInteractionActionList, type InteractionActionExecutionContext } from '@/utils/renderScene/interactionActionExecutors'
import type { ActionItem } from '@/types/threeScene'
import type { ActionCompletion } from '@/utils/renderScene/interactionActionSequence'

export interface EditorSceneInteractionActionRuntimePort {
  isActive?: () => boolean
  dispose?: () => void
  executeActionList: (actions: ActionItem[], context?: Omit<InteractionActionExecutionContext, 'sceneApi'>) => ActionCompletion
}
export interface EditorSceneInteractionActionRuntimeOptions {
  getRuntime?: () => SceneRuntime | null
  getSceneApi?: () => InteractionActionExecutionContext['sceneApi']
  isActive?: () => boolean
}
/** 动作实例绑定当前画布生命周期，卸载后不再执行迟到的等待链，不持有旧引擎对象。 */
export const createEditorSceneInteractionActionRuntimePort = (
  options: EditorSceneInteractionActionRuntimeOptions = {},
): EditorSceneInteractionActionRuntimePort => {
  let disposed = false
  const isActive = () => !disposed && (options.isActive?.() ?? true)
  return {
    isActive,
    dispose: () => { disposed = true },
    executeActionList: (actions, context) => executeInteractionActionList(actions, { ...context, sceneApi: null, isActive }),
  }
}
/** 历史调用名只保留签名兼容；实现始终走相同二维端口，不启动旧渲染器。 */
export const createLegacySceneInteractionActionRuntimePort = createEditorSceneInteractionActionRuntimePort
