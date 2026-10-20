import { areWidgetIdsInSameParent } from '@/utils/widgetLayer'
import type { WidgetLayerNode } from '@/types/threeScene'

export type StructureContextMenuState = {
  visible: boolean
  x: number
  y: number
  canCreateGroup: boolean
}

/**
 * 生成结构树右键菜单的隐藏态。
 *
 * 组件里多个入口都会复用这份初始值，
 * 统一收口后可以避免手写对象时漏掉某个字段。
 */
export const createHiddenStructureContextMenuState = (): StructureContextMenuState => ({
  visible: false,
  x: 0,
  y: 0,
  canCreateGroup: false,
})

/**
 * 根据当前选中部件和图层树，推导右键菜单是否允许创建分组。
 *
 * 分组要求至少两个部件且必须处于同一父级，
 * 这样菜单层只负责展示状态，不再重复内嵌业务判断。
 */
export const resolveStructureCanCreateGroup = (
  widgetLayerTree: WidgetLayerNode[],
  currentWidgetIds: string[],
) => currentWidgetIds.length > 1 && areWidgetIdsInSameParent(widgetLayerTree, currentWidgetIds)

/**
 * 根据右键位置和当前多选状态，生成菜单显示状态。
 *
 * 这里只决定菜单是否应该显示，以及初始落点；
 * 真正的视口边界修正仍由组件在拿到真实 DOM 尺寸后执行。
 */
export const createStructureContextMenuState = (
  event: MouseEvent,
  widgetLayerTree: WidgetLayerNode[],
  currentWidgetIds: string[],
  canCreateGroupOverride?: boolean,
): StructureContextMenuState => {
  const canCreateGroup =
    canCreateGroupOverride ?? resolveStructureCanCreateGroup(widgetLayerTree, currentWidgetIds)
  return {
    visible: canCreateGroup,
    x: event.clientX,
    y: event.clientY,
    canCreateGroup,
  }
}

/**
 * 根据菜单真实尺寸，把右键菜单收口到视口内。
 *
 * 这里不依赖组件状态，只接收位置和尺寸参数，
 * 便于后续继续抽离菜单交互而不把 DOM 细节反向耦合进业务逻辑。
 */
export const adjustStructureContextMenuPosition = (
  position: Pick<StructureContextMenuState, 'x' | 'y'>,
  viewport: { width: number; height: number },
  menuRect: { width: number; height: number },
  padding = 12,
) => {
  const nextX = Math.min(position.x, viewport.width - menuRect.width - padding)
  const nextY = Math.min(position.y, viewport.height - menuRect.height - padding)

  return {
    x: Math.max(padding, nextX),
    y: Math.max(padding, nextY),
  }
}
