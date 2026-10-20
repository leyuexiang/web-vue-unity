import type { ComponentDataConfig } from '@/types/data-config'
import type { ActionCompletion } from '@/utils/renderScene/interactionActionSequence'

/** 传参只描述目标域、实例编号和请求参数，不携带渲染对象或页面状态。 */
export interface SceneRequestParameterAction {
  targetKind: 'widget' | 'object'
  targetId: string
  assignments: Array<{ targetProperty: string; value: unknown }>
}

type RequestParameterHandler = (action: SceneRequestParameterAction) => Promise<void>
let activeHandler: RequestParameterHandler | null = null
/** 复用当前调度器的对象编号索引，读取包含最新请求结果的三维来源快照。 */
let activeSourceReader: ((objectId: string) => ComponentDataConfig | null) | null = null
/** 目标已经挂载但首轮数据仍在返回时，属性和显隐动作也需等待初始化完成。 */
let activeTargetWaiter:
  | ((kind: 'widget' | 'object', ids: readonly string[]) => ActionCompletion)
  | null = null

/** 注册当前场景请求调度器；释放函数只移除自身，避免旧场景卸载误清新场景端口。 */
export const registerSceneRequestParameterHandler = (
  handler: RequestParameterHandler,
  sourceReader: typeof activeSourceReader = null,
  targetWaiter: typeof activeTargetWaiter = null,
) => {
  activeHandler = handler
  activeSourceReader = sourceReader
  activeTargetWaiter = targetWaiter
  return () => {
    if (activeHandler === handler) {
      activeHandler = null
      activeSourceReader = null
      activeTargetWaiter = null
    }
  }
}

/** 只读取当前场景已有数据；不激活对象、不发送来源请求，停止场景时随调度端口释放。 */
export const getSceneRequestParameterSourceConfig = (objectId: string) =>
  activeSourceReader?.(objectId) ?? null

/** 只等待当前场景已有的初始化任务，不激活目标、不新增网络请求。 */
export const waitSceneDataTargets = (kind: 'widget' | 'object', ids: readonly string[]) =>
  activeTargetWaiter?.(kind, ids)

/** 交互和状态动作共用当前场景的请求入口；场景未启动或已卸载时安全跳过。 */
export const passSceneRequestParameters = async (action: SceneRequestParameterAction) => {
  await activeHandler?.(action)
}
