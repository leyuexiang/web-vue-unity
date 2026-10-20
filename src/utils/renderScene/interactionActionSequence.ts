import { appLogger } from '@/utils/logger'
import { ACTION_TYPE_ENUM } from '@/enums/scenePanelEnum'
import type { ActionItem } from '@/types/threeScene'
import { waitSceneDataTargets } from '@/integrations/scene/widgetRuntime/sceneDataRequestActions'
import {
  getWidgetRuntimePort,
  getWidgetPreviewGeneration,
} from '@/integrations/scene/widgetRuntime/ports'

export type ActionCompletion = void | Promise<void>

/** 保留同步动作的即时反馈，只有遇到真实异步准备或请求时才挂起后续动作。 */
export const isActionPending = (value: ActionCompletion): value is Promise<void> =>
  Boolean(value && typeof value.then === 'function')

/** 所有排队层共用端口身份与预览代次，退出、重进和切换场景均使旧动作失效。 */
export const createInteractionLifecycleGuard = (isActive: () => boolean = () => true) => {
  const port = getWidgetRuntimePort()
  const generation = getWidgetPreviewGeneration()
  return () =>
    getWidgetRuntimePort() === port && getWidgetPreviewGeneration() === generation && isActive()
}

/** 三维原生动作与旧兼容动作共用依赖准备入口，来源对象仅仅读取，不能因读来源而额外加载。 */
export const prepareInteractionObjectTarget = (action: ActionItem): ActionCompletion => {
  let targetId: string | undefined
  switch (action.actionType) {
    case ACTION_TYPE_ENUM.HighlightModel:
    case ACTION_TYPE_ENUM.ModelVisibility:
    case ACTION_TYPE_ENUM.ModelVisibilityWithValue:
      targetId = action.actionTargetUuid
      break
    case ACTION_TYPE_ENUM.MoveCamera:
      targetId = action.observationTargetUuid
      break
    case ACTION_TYPE_ENUM.WidgetVisibility:
    case ACTION_TYPE_ENUM.WidgetVisibilityWithValue:
    case ACTION_TYPE_ENUM.SetWidgetProperty:
      return waitSceneDataTargets('widget', action.actionTargetWidgetIds ?? [])
    case ACTION_TYPE_ENUM.PassParameters:
      if (action.parameterTargetKind === 'widget')
        return waitSceneDataTargets('widget', action.actionTargetWidgetIds ?? [])
      targetId = action.actionTargetUuid
      break
  }
  if (!targetId) return
  const ids = [targetId]
  const preparation = getWidgetRuntimePort().prepareSceneObjects?.(ids)
  return isActionPending(preparation)
    ? preparation.then(() => waitSceneDataTargets('object', ids))
    : waitSceneDataTargets('object', ids)
}

/**
 * 同一事件内按配置顺序执行，异步加载完成后再继续，避免后续动作查不到尚未注册的目标。
 * 每项失败单独记录并继续其它配置；生命周期结束则停止后续动作，不把旧事件带入新场景。
 */
export const runInteractionSequence = <T>(
  items: readonly T[],
  execute: (item: T) => ActionCompletion,
  isActive: () => boolean = () => true,
): ActionCompletion => {
  let index = 0
  const report = (error: unknown) =>
    appLogger.error('InteractionActionSequence', '场景配置动作执行失败', error)
  const resume = (): ActionCompletion => {
    while (index < items.length && isActive()) {
      const item = items[index++]
      try {
        const pending = execute(item)
        if (isActionPending(pending)) return pending.catch(report).then(resume)
      } catch (error) {
        report(error)
      }
    }
  }
  return resume()
}
