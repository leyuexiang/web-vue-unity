import type * as THREE from '@/types/legacyObjectPort'
import { ACTION_TYPE_ENUM } from '@/enums/scenePanelEnum'
import type { ActionItem } from '@/types/threeScene'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import type { SceneRuntimeBridge } from './sceneRuntimeBridge'
import { appLogger } from '@/utils/logger'
import {
  setWidgetPropertiesByIds,
  setWidgetGroupVisibilityByIds,
  setWidgetVisibilityByIds,
  getWidgetParameterSourceById,
} from '@/integrations/scene/widgetRuntime/widgetRuntimeActions'
import { getWidgetDataConfig, normalizeDataConfig } from '@/utils/dataConfig'
import { getWidgetRuntimeValuesById } from '@/integrations/scene/widgetRuntime/widgetRuntimeValues'
import { createParameterSourceReader } from '@/utils/dataConfig/interactionParameterSources'
import { getRecordPaginationSelection } from '@/utils/dataConfig/recordPaginationSelection'
import { findSceneObjectByTargetId } from './sceneObjectTargetResolver'
import { getWidgetRuntimePort } from '@/integrations/scene/widgetRuntime/ports'
import {
  runInteractionSequence,
  createInteractionLifecycleGuard,
  prepareInteractionObjectTarget,
  isActionPending,
  type ActionCompletion,
} from './interactionActionSequence'
import {
  passSceneRequestParameters,
  getSceneRequestParameterSourceConfig,
} from '@/integrations/scene/widgetRuntime/sceneDataRequestActions'

/**
 * 交互动作执行上下文。
 * 这里只暴露动作执行真正需要的最小依赖，避免执行器再反向感知完整模块实例。
 */
export interface InteractionActionExecutionContext {
  sceneApi: SceneRuntimeBridge['sceneApi']
  /** 触发动作的二维部件；未指定来源组件时从其数据快照读取字段。 */
  sourceWidget?: BaseWidgetConfig
  /** 来源稳定编号用于读取实时输入；逐条翻页也据此恢复历史回放后的当前记录。 */
  sourceWidgetId?: string
  /** 触发动作的三维对象；用于兼容三维对象自身的数据配置。 */
  sourceObject?: THREE.Object3D
  /** 场景卸载或退出预览后，排队动作不得再访问旧目标。 */
  isActive?: () => boolean
}

/** 只执行二维动作；三维配置保留原样，执行时明确报告能力尚未接入。 */
const executePreparedInteractionAction = (action: ActionItem, context: InteractionActionExecutionContext): ActionCompletion => {
  switch (action.actionType) {
    case ACTION_TYPE_ENUM.PassParameters:
      if (action.parameterTargetKind !== 'widget') throw new Error('三维传参待 Unity 接入')
      return executeRequestParameterAction(action, context)
    case ACTION_TYPE_ENUM.SetWidgetProperty: return executeSetWidgetPropertyAction(action)
    case ACTION_TYPE_ENUM.JumpLink: return executeJumpLink(action)
    case ACTION_TYPE_ENUM.SwitchScene: return executeSwitchScene(action)
    case ACTION_TYPE_ENUM.WidgetVisibility: return executeWidgetVisibility(action)
    case ACTION_TYPE_ENUM.WidgetVisibilityWithValue: return executeWidgetVisibilityWithValue(action, context)
    default: throw new Error(`三维动作待 Unity 接入：${action.actionType}`)
  }
}
/** 沿用来源二维动作语义，异步任务由统一生命周期守卫取消。 */
export const executeInteractionActionList = (
  actionList: ActionItem[],
  context: InteractionActionExecutionContext,
) => {
  const isActive = createInteractionLifecycleGuard(context.isActive)
  const executionContext = { ...context, isActive }
  return runInteractionSequence(
    actionList ?? [],
    (action) => executeInteractionAction(action, executionContext),
    isActive,
  )
}

/** 沿用来源二维动作语义，异步任务由统一生命周期守卫取消。 */
const executeInteractionAction = (
  action: ActionItem,
  context: InteractionActionExecutionContext,
): ActionCompletion => {
  const preparation = prepareInteractionObjectTarget(action)
  if (isActionPending(preparation))
    return preparation.then(() => {
      if (context.isActive?.() ?? true) return executePreparedInteractionAction(action, context)
    })
  return executePreparedInteractionAction(action, context)
}

/** 沿用来源二维动作语义，异步任务由统一生命周期守卫取消。 */
const executeSetWidgetPropertyAction = (action: ActionItem) => {
  const targetIds = action.actionTargetWidgetIds || []
  if (!targetIds.length) {
    appLogger.warn('InteractionActionExecutors', '自定义组件赋值动作缺少目标部件 ID')
    return
  }

  const mappings = action.widgetPropertyAssignments || []
  const propertyValues = mappings
    .filter(({ targetProperty }) => Boolean(targetProperty?.trim()))
    .map(({ targetProperty, value }) => ({ targetProperty: targetProperty.trim(), value }))
  if (!propertyValues.length) {
    appLogger.warn('InteractionActionExecutors', '自定义组件赋值动作缺少映射字段')
    return
  }

  // 未完成行只有在录入了值时才构成无效配置；空值本身是合法指令，可用于清空组件字段。
  if (mappings.some(({ targetProperty, value }) => !targetProperty?.trim() && value !== '')) {
    appLogger.warn('InteractionActionExecutors', '自定义组件赋值动作存在未指定字段的参数')
    return
  }

  return setWidgetPropertiesByIds(targetIds, propertyValues)
}

/** 沿用来源二维动作语义，异步任务由统一生命周期守卫取消。 */
const executeRequestParameterAction = (
  action: ActionItem,
  context: InteractionActionExecutionContext,
) => {
  const isWidget = action.parameterTargetKind === 'widget'
  const targetId = isWidget ? action.actionTargetWidgetIds?.[0] : action.actionTargetUuid
  if (!targetId) return
  const source = action.parameterSource
  // 指定来源后完全隔离触发上下文；来源被删除时保持缺失，不能悄悄取回当前组件的数据。
  const sourceWidget = source
    ? source.kind === 'widget'
      ? getWidgetParameterSourceById(source.id)
      : undefined
    : context.sourceWidget
  // 新场景优先按调度器索引取快照；仅旧引擎对象才查询场景，避免每次传参额外遍历对象树。
  const indexedSourceConfig =
    source?.kind === 'object' ? getSceneRequestParameterSourceConfig(source.id) : null
  const sourceObject =
    source?.kind === 'object'
      ? indexedSourceConfig
        ? undefined
        : getTargetObjectByUuid(source.id, context.sceneApi?.scene)
      : source
        ? undefined
        : context.sourceObject
  const sourceConfig =
    source?.kind === 'object'
      ? indexedSourceConfig || sourceObject?.userData?.dataConfig
      : sourceWidget?.dataConfig ||
        // 没有显式数据配置的输入框同样复用面板推导，避免候选可选但执行时被判为缺失。
        (sourceWidget?.info
          ? getWidgetDataConfig(sourceWidget)
          : sourceObject?.userData?.dataConfig)
  const readSource = createParameterSourceReader(
    normalizeDataConfig(sourceConfig),
    getRecordPaginationSelection(sourceWidget, source?.id || context.sourceWidgetId),
    sourceWidget ? getWidgetRuntimeValuesById(source?.id || context.sourceWidgetId) : undefined,
  )
  const mappings = (isWidget ? action.widgetParameterMappings : action.modelParameterMappings) ?? []
  const assignments = mappings.map((mapping) => ({
    targetProperty: mapping.targetProperty,
    value: readSource(mapping),
  }))
  // 任一来源缺失时整条动作跳过，避免目标请求带上部分新参数和部分旧参数。
  if (!assignments.length || assignments.some(({ value }) => value === undefined)) return
  // 调度器按领域编号索引；不能把已保存的业务编号反向换成引擎临时编号。
  const targetObject = isWidget ? null : getTargetObjectByUuid(targetId, context.sceneApi?.scene)
  const resolvedId = targetObject?.userData?.sceneObjectId || targetId
  // 请求参数编码以方括号开头；普通字段直接写入目标组件当前展示值。
  const isRequestParameter = (targetProperty: string) => targetProperty.trim().startsWith('[')
  const apply = () => {
    // 普通展示字段和请求参数分开写入，同一批属性只应用一次，避免重复渲染。
    const properties = isWidget
      ? assignments.filter(({ targetProperty }) => !isRequestParameter(targetProperty))
      : []
    const update = properties.length ? setWidgetPropertiesByIds([targetId], properties) : undefined
    const refresh = () =>
      passSceneRequestParameters({
        targetKind: isWidget ? 'widget' : 'object',
        targetId: resolvedId,
        assignments,
      })
    return isActionPending(update) ? update.then(refresh) : refresh()
  }
  // 单独配置传参动作也能等待隐藏目标；首次显示与传参共用加载器的按编号去重入口。
  const port = getWidgetRuntimePort()
  if (isWidget && !getWidgetParameterSourceById(targetId) && port.activateWidgets) {
    return port.activateWidgets([targetId]).then(() => {
      if (getWidgetRuntimePort() === port && (context.isActive?.() ?? true)) return apply()
    })
  }
  return apply()
}

/** 沿用来源二维动作语义，异步任务由统一生命周期守卫取消。 */
const executeJumpLink = (action: ActionItem) => {
  if (typeof window === 'undefined') {
    appLogger.warn('InteractionActionExecutors', '当前环境不支持跳转链接动作')
    return
  }

  const url = action.jumpLink?.trim()
  if (!url) {
    appLogger.warn('InteractionActionExecutors', '跳转链接动作缺少跳转地址')
    return
  }

  window.open(url, action.newWindow ? '_blank' : '_self')
}

/** 沿用来源二维动作语义，异步任务由统一生命周期守卫取消。 */
const executeSwitchScene = (action: ActionItem) => {
  if (typeof window === 'undefined') {
    appLogger.warn('InteractionActionExecutors', '当前环境不支持切换场景动作')
    return
  }

  const sceneUrl = action.sceneUrl?.trim()
  if (!sceneUrl) {
    appLogger.warn('InteractionActionExecutors', '切换场景动作缺少 sceneUrl')
    return
  }

  window.location.href = sceneUrl
}

/** 沿用来源二维动作语义，异步任务由统一生命周期守卫取消。 */
const executeWidgetVisibility = (action: ActionItem) => {
  const { actionTargetWidgetIds, actionTargetWidgetGroupIds, widgetVisibility } = action
  if (!actionTargetWidgetIds?.length && !actionTargetWidgetGroupIds?.length) {
    appLogger.warn('InteractionActionExecutors', '部件可见性动作缺少目标部件 ID')
    return
  }

  if (typeof widgetVisibility !== 'boolean') {
    appLogger.warn('InteractionActionExecutors', '部件可见性动作缺少可见性布尔值')
    return
  }

  const pending: Promise<void>[] = []
  // 同一显隐动作的组件和分组可并行准备；后续配置仍等待两类目标全部就绪。
  const widgets = actionTargetWidgetIds?.length
    ? setWidgetVisibilityByIds(actionTargetWidgetIds, widgetVisibility)
    : undefined
  const groups = actionTargetWidgetGroupIds?.length
    ? setWidgetGroupVisibilityByIds(actionTargetWidgetGroupIds, widgetVisibility)
    : undefined
  if (isActionPending(widgets)) pending.push(widgets)
  if (isActionPending(groups)) pending.push(groups)
  if (pending.length) return Promise.all(pending).then(() => undefined)
}

/** 沿用来源二维动作语义，异步任务由统一生命周期守卫取消。 */
const executeWidgetVisibilityWithValue = (
  action: ActionItem,
  context: InteractionActionExecutionContext,
) => {
  const { actionTargetWidgetIds } = action
  if (!actionTargetWidgetIds?.length) {
    appLogger.warn('InteractionActionExecutors', '参数化部件动作缺少目标部件 ID')
    return
  }

  const sourceDataConfig =
    context.sourceWidget?.dataConfig || context.sourceObject?.userData?.dataConfig
  const readSource = createParameterSourceReader(
    normalizeDataConfig(sourceDataConfig),
    getRecordPaginationSelection(context.sourceWidget, context.sourceWidgetId),
  )
  const mappings = action.widgetParameterMappings?.length
    ? action.widgetParameterMappings
    : action.widgetTargetProperty && action.widgetValueSourceField
      ? [
          {
            targetProperty: action.widgetTargetProperty,
            sourceField: action.widgetValueSourceField,
          },
        ]
      : []
  if (!mappings.length) {
    appLogger.warn('InteractionActionExecutors', '参数化部件动作缺少参数映射')
    return
  }

  const propertyValues = mappings.map((mapping) => ({
    sourceField: mapping.sourceField?.trim(),
    targetProperty: mapping.targetProperty?.trim(),
    value: readSource(mapping),
  }))
  if (
    propertyValues.some(
      ({ sourceField, targetProperty, value }) =>
        !sourceField || !targetProperty || value === undefined,
    )
  ) {
    appLogger.warn('InteractionActionExecutors', '参数化部件动作存在无效映射或缺失来源字段')
    return
  }

  return setWidgetPropertiesByIds(actionTargetWidgetIds, propertyValues)
}

/** 沿用来源二维动作语义，异步任务由统一生命周期守卫取消。 */
const getTargetObjectByUuid = (
  uuid: string,
  scene: THREE.Scene | null | undefined,
): THREE.Object3D | null => findSceneObjectByTargetId(scene, uuid)

