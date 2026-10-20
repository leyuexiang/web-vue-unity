import { useSceneWidgetStore } from '@/stores/sceneEditStore'
import { appLogger } from '@/utils/logger'
import { getWidgetRuntimePort } from './ports'
import { cloneDeep, set } from 'lodash-es'
import type { WidgetParameterMapping } from '@/types/sceneInteraction'
import {
  createInteractionLifecycleGuard,
  type ActionCompletion,
} from '@/utils/renderScene/interactionActionSequence'

/** 按稳定编号读取指定二维来源实例，执行器可复用其最新数据和逐条翻页选中记录。 */
export const getWidgetParameterSourceById = (widgetId: string) =>
  useSceneWidgetStore().getWidgetById(widgetId)?.component

/**
 * 批量设置二维部件显隐。
 *
 * 交互动作执行器不再直接扫描二维仓库，而是通过当前项目集成层修改目标。
 * 这样状态/交互规则仍可复用旧动作系统，同时二维目标访问点保持单一。
 */
export const setWidgetVisibilityByIds = (
  widgetIds: string[],
  visible: boolean,
  activated = false,
): ActionCompletion => {
  const widgetStore = useSceneWidgetStore()
  const uniqueIds = Array.from(new Set(widgetIds.filter(Boolean)))

  /**
   * 发布预览中的初始隐藏组件尚未进入二维仓库。第一次显示时先让当前运行时端口从内存分片
   * 缓存创建目标，再复用同一显隐入口更新状态。返回激活承诺，让交互与状态动作都等待
   * 组件和请求索引就绪；每批只激活一次，不在目标缺失时无限递归重试。
   */
  const missingIds = visible
    ? uniqueIds.filter((widgetId) => !widgetStore.getWidgetById(widgetId))
    : []
  const port = getWidgetRuntimePort()
  const activateWidgets = port.activateWidgets
  const isActive = createInteractionLifecycleGuard()
  if (missingIds.length && activateWidgets && !activated) {
    return activateWidgets(missingIds)
      .then(() => {
        if (isActive()) return setWidgetVisibilityByIds(uniqueIds, true, true)
      })
      .catch((error) => {
        appLogger.error('WidgetRuntimeActions', '按需创建二维目标失败', error)
      })
  }

  uniqueIds.forEach((widgetId) => {
    const widgetEntry = widgetStore.getWidgetById(widgetId)
    if (!widgetEntry) {
      /**
       * 发布预览的隐藏动作可以命中尚未实例化的组件。
       * 这类组件保持“未挂载”就是按需加载的正常结果，只有要求显示但激活后仍无法找到时
       * 才属于真正的目标数据缺失，避免每次切页的清理动作污染控制台。
       */
      if (visible) appLogger.warn('WidgetRuntimeActions', '未找到可见性目标部件', widgetId)
      return
    }

    widgetEntry.component.option = {
      ...((widgetEntry.component.option as Record<string, unknown> | undefined) || {}),
      visible,
    }
    widgetStore.bumpWidgetRenderVersion(widgetId)
  })
}

/** 批量设置二维视觉分组自身显隐，不覆盖分组成员各自的显隐状态。 */
export const setWidgetGroupVisibilityByIds = (
  groupIds: string[],
  visible: boolean,
  activated = false,
): ActionCompletion => {
  const widgetStore = useSceneWidgetStore()
  const runtimePort = getWidgetRuntimePort()
  const isActive = createInteractionLifecycleGuard()
  const setVisible = runtimePort.isPreview()
    ? widgetStore.setGroupVisibleTransient
    : widgetStore.setGroupVisible

  const uniqueGroupIds = Array.from(new Set(groupIds.filter(Boolean)))
  /**
   * 发布二维切页的目标通常是视觉分组，而首屏会把隐藏分组从仓库中裁剪掉。
   * 因此分组显隐不能只更新当前仓库状态，必须先通过完整发布缓存批量安装成员；`activated`
   * 只用于在异步激活完成后落回同步显隐，避免递归再次创建加载任务。
   */
  if (visible && !activated && runtimePort.activateWidgetGroups) {
    return runtimePort
      .activateWidgetGroups(uniqueGroupIds)
      .then(() => {
        if (isActive()) return setWidgetGroupVisibilityByIds(uniqueGroupIds, true, true)
      })
      .catch((error) => {
        appLogger.error('WidgetRuntimeActions', '按需创建分组目标失败', error)
      })
  }

  uniqueGroupIds.forEach((groupId) => {
    setVisible(groupId, visible)
  })
}

/**
 * 批量写入多组二维部件属性，保留目标原有显隐状态。
 *
 * 所有映射在同一份 option 快照上完成，最后每个目标只触发一次渲染版本更新，
 * 避免多个参数导致部件重复渲染或出现中间状态。
 */
export const setWidgetPropertiesByIds = (
  widgetIds: string[],
  propertyValues: Array<Pick<WidgetParameterMapping, 'targetProperty'> & { value: unknown }>,
  activated = false,
): ActionCompletion => {
  const widgetStore = useSceneWidgetStore()
  const uniqueIds = Array.from(new Set(widgetIds.filter(Boolean)))
  const normalizedValues = propertyValues
    .map(({ targetProperty, value }) => ({ targetProperty: targetProperty.trim(), value }))
    .filter(({ targetProperty }) => targetProperty)
  if (!uniqueIds.length || !normalizedValues.length) return

  const missingIds = uniqueIds.filter((widgetId) => !widgetStore.getWidgetById(widgetId))
  const port = getWidgetRuntimePort()
  const activateWidgets = port.activateWidgets
  const isActive = createInteractionLifecycleGuard()
  // 最多激活一次，缺失目标不会递归重试；创建隐藏部件后仍保留其可见性。
  if (missingIds.length && activateWidgets && !activated) {
    return activateWidgets(missingIds)
      .then(() => {
        if (isActive()) return setWidgetPropertiesByIds(uniqueIds, normalizedValues, true)
      })
      .catch((error) => {
        appLogger.error('WidgetRuntimeActions', '按需创建多参数动作目标失败', error)
      })
  }

  uniqueIds.forEach((widgetId) => {
    const widgetEntry = widgetStore.getWidgetById(widgetId)
    if (!widgetEntry) {
      appLogger.warn('WidgetRuntimeActions', '未找到多参数动作目标部件', widgetId)
      return
    }

    const currentOption =
      (widgetEntry.component.option as Record<string, unknown> | undefined) || {}
    const nextOption = cloneDeep(currentOption)
    normalizedValues.forEach(({ targetProperty, value }) => set(nextOption, targetProperty, value))
    // 显隐由独立动作控制，即便映射填写 visible 也不覆盖现有值。
    if (Object.prototype.hasOwnProperty.call(currentOption, 'visible')) {
      nextOption.visible = currentOption.visible
    } else {
      delete nextOption.visible
    }
    widgetEntry.component.option = nextOption
    widgetStore.bumpWidgetRenderVersion(widgetId)
  })
}

/**
 * 清理二维画布选中态。
 *
 * 三维结构树、变换控制器只调用这个动作端口，不再读取完整二维仓库实例。
 * 后续二维选择态迁入统一编辑器状态时，只替换这里的实现。
 */
export const clearWidgetSelection = () => {
  useSceneWidgetStore().clearCurrentWidgetSelection()
}
