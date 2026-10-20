import { useSceneWidgetStore } from '@/stores/sceneEditStore'

/**
 * 读取二维部件运行时值。
 *
 * 这是当前项目适配层入口，屏蔽底层仍由 Pinia 保存运行时值的事实。
 * 后续接入统一 SceneRuntime 时，条件判断模块只需要替换这里的实现。
 */
export const getWidgetRuntimeValueById = (widgetId: string, field: string): unknown => {
  const runtimeFieldMap = getWidgetRuntimeValuesById(widgetId)
  if (!runtimeFieldMap || !(field in runtimeFieldMap)) return undefined
  return runtimeFieldMap[field]
}

/** 动作触发时一次性读取来源实例的实时字段，避免每条参数映射重复查询仓库。 */
export const getWidgetRuntimeValuesById = (
  widgetId?: string,
): Readonly<Record<string, unknown>> | undefined =>
  widgetId ? useSceneWidgetStore().widgetRuntimeValueMap?.[widgetId] : undefined
