import { SCENE_PANEL_ENUM } from '@/enums/scenePanelEnum'

export type SceneInspectorRouteKind =
  | 'scene'
  | 'sceneObject'
  | 'sceneObjectGroup'
  | 'widget'
  | 'widgetChild'
  | 'widgetGroup'
  | 'multiWidget'
  | 'effect'

export type WidgetPanelSelectionKind =
  | 'none'
  | 'widget'
  | 'widgetChild'
  | 'widgetGroup'
  | 'multiWidget'

export type SceneInspectorPanelItem = {
  value: SCENE_PANEL_ENUM
  label: string
}

/**
 * 判断统一场景对象是否应进入效果检查器。
 *
 * 效果对象仍由 SceneStore 统一选中，但顶部页签和右侧内容分别订阅自己的状态；把判断集中
 * 在这里可以避免新增三维效果时只改一侧，导致“对象已选中、右侧仍显示场景设置”的路由分叉。
 */
export const isSceneInspectorEffectType = (effectType?: string | null) =>
  effectType === 'volume-heatmap' || effectType === 'three-map'

export const SYSTEM_INSPECTOR_PANEL_ITEMS: SceneInspectorPanelItem[] = [
  { value: SCENE_PANEL_ENUM.Base, label: '基础' },
  { value: SCENE_PANEL_ENUM.Camera, label: '相机' },
  { value: SCENE_PANEL_ENUM.Weather, label: '环境设置' },
  /** 光照参数已归并至天气系统，保留此位置作为植被系统的后续配置入口。 */
  { value: SCENE_PANEL_ENUM.Vegetation, label: '植被系统' },
]

export const OBJECT_INSPECTOR_PANEL_ITEMS: SceneInspectorPanelItem[] = [
  { value: SCENE_PANEL_ENUM.Base, label: '基础' },
  { value: SCENE_PANEL_ENUM.Data, label: '数据' },
  { value: SCENE_PANEL_ENUM.Animation, label: '动画' },
  { value: SCENE_PANEL_ENUM.Status, label: '状态' },
  { value: SCENE_PANEL_ENUM.Interaction, label: '事件' },
]

export const GROUP_INSPECTOR_PANEL_ITEMS: SceneInspectorPanelItem[] = [
  { value: SCENE_PANEL_ENUM.Base, label: '基础' },
]

/** 页面框架子项复用所属框架的数据配置，仍不暴露独立的动画和状态页。 */
export const WIDGET_CHILD_INSPECTOR_PANEL_ITEMS: SceneInspectorPanelItem[] = [
  { value: SCENE_PANEL_ENUM.Base, label: '基础' },
  { value: SCENE_PANEL_ENUM.Data, label: '数据' },
  { value: SCENE_PANEL_ENUM.Interaction, label: '事件' },
]

export const resolveSceneInspectorRouteKind = (
  widgetSelectionKind: WidgetPanelSelectionKind,
  sceneObjectUuid?: string | null,
  sceneObjectLayerId?: string | null,
  effectSelected = false,
): SceneInspectorRouteKind => {
  if (widgetSelectionKind !== 'none') return widgetSelectionKind
  if (effectSelected) return 'effect'
  if (sceneObjectLayerId) return 'sceneObjectGroup'
  if (sceneObjectUuid) return 'sceneObject'
  return 'scene'
}

export const getSceneInspectorPanelItems = (
  routeKind: SceneInspectorRouteKind,
): SceneInspectorPanelItem[] => {
  if (routeKind === 'scene') return SYSTEM_INSPECTOR_PANEL_ITEMS
  if (routeKind === 'widget' || routeKind === 'sceneObject') return OBJECT_INSPECTOR_PANEL_ITEMS
  if (routeKind === 'widgetChild') return WIDGET_CHILD_INSPECTOR_PANEL_ITEMS
  // 体积热力场属于三维组件，右侧页签必须与三维看板保持一致；基础页再承载热力场专属参数。
  if (routeKind === 'effect') return OBJECT_INSPECTOR_PANEL_ITEMS
  return GROUP_INSPECTOR_PANEL_ITEMS
}

export const getSceneInspectorPanelLabel = (
  routeKind: SceneInspectorRouteKind,
  panel: SCENE_PANEL_ENUM,
) => {
  return getSceneInspectorPanelItems(routeKind).find((item) => item.value === panel)?.label || ''
}
