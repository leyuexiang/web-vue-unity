import type { WidgetConfig } from '@/stores/sceneEditStore'
import type { WidgetLayerGroupNode, WidgetLayerNode } from '@/types/threeScene'
import { getWidgetKindLabelByPackage } from '@/integrations/scene/widgetStructure'
import { normalizePageFrameOption } from '@/packages/components/Widget/VPageMenu/pageFrameTypes'
import { flattenPageMenuTree } from '@/packages/components/Widget/VPageMenu/menuTree'

export type WidgetMenuContextPayload = {
  event: MouseEvent
  groupId?: string
  widgetId?: string
}

export type WidgetSortableMoveEvent = {
  draggedContext?: { element?: Pick<WidgetLayerNode, 'id' | 'type'> }
  relatedContext?: { element?: Pick<WidgetLayerNode, 'id' | 'type'> }
  relatedRect?: { top: number; height: number }
  willInsertAfter?: boolean
}

type WidgetSortablePointerEvent = {
  clientX?: number
  clientY?: number
  target?: EventTarget | null
  touches?: ArrayLike<{ clientY: number }>
}

export const WIDGET_DRAG_DATA_TYPE = 'application/x-jtyf-scene-widget'

/**
 * 使用项目专用数据类型启动组件拖拽。
 *
 * SortableJS 默认把整行文字写入 text/plain，浏览器会把它识别为可搜索文本，拖出页面时
 * 可能显示“松开鼠标以搜索文本”甚至新开搜索页。结构树实际通过 Store 快照识别拖拽对象，
 * 这里只写入自定义类型以满足原生拖拽协议，不向浏览器暴露可搜索内容。
 */
export const setWidgetDragData = (dataTransfer: DataTransfer, dragElement: HTMLElement) => {
  const widgetId =
    dragElement.dataset.widgetId ||
    dragElement.querySelector<HTMLElement>('[data-widget-row-id]')?.dataset.widgetRowId ||
    dragElement.querySelector<HTMLElement>('[data-structure-group-id]')?.dataset.structureGroupId ||
    ''
  dataTransfer.setData(WIDGET_DRAG_DATA_TYPE, widgetId)
  dataTransfer.effectAllowed = 'move'
}

/**
 * 组件行的上半区插到目标前，下半区插到目标后。
 * 中央区域由父子挂载逻辑优先消费，上下边缘继续提供清晰的排序方向。
 */
export const resolveWidgetSortPlacement = (
  clientY: number,
  rect: Pick<DOMRect, 'top' | 'height'>,
): 'before' | 'after' => (clientY < rect.top + rect.height / 2 ? 'before' : 'after')

/**
 * 判断 SortableJS 当前指针是否进入组件行本体。
 * 上下各四分之一预留为排序区，中间一半才生成父子挂载候选。
 * 传入真实行矩形，避免父节点包含后代时挂载区域随子树高度扩大。
 */
export const resolveWidgetHierarchyDropTarget = (
  event: WidgetSortableMoveEvent,
  pointerEvent: WidgetSortablePointerEvent | undefined,
  draggedWidgetIds: string[],
) => {
  const related = event.relatedContext?.element
  if (!related || related.type !== 'widget' || draggedWidgetIds.includes(related.id)) return null

  const firstTouch = pointerEvent?.touches?.[0]
  const clientY = firstTouch?.clientY ?? pointerEvent?.clientY
  const rect = event.relatedRect
  if (typeof clientY !== 'number' || !rect || rect.height <= 0) return null

  const offsetRatio = (clientY - rect.top) / rect.height
  if (offsetRatio <= 0.25 || offsetRatio >= 0.75) return null

  /**
   * 排序库回调里的 target 是换位前真正经过的行，应优先于 elementFromPoint。
   * 换位后拖动项本身可能移动到指针下方，elementFromPoint 会错误命中拖动项，
   * 进而把已经出现的父子挂载提示降级成普通排序。
   */
  const directTarget = pointerEvent?.target
  const eventTarget =
    directTarget && 'closest' in directTarget
      ? directTarget
      : typeof document !== 'undefined' && typeof pointerEvent?.clientX === 'number'
        ? document.elementFromPoint(pointerEvent.clientX, clientY)
        : null
  if (eventTarget && 'closest' in eventTarget) {
    const closest = (eventTarget as Element).closest
    if (typeof closest === 'function') {
      return closest.call(eventTarget, '.scene-edit-structure-item') ? related.id : null
    }
  }

  return related.id
}

/**
 * 统一生成结构树里的部件显示名称。
 * 优先使用用户可见的 label，再回退到组件定义名和 ID，避免不同入口显示口径不一致。
 */
export const getWidgetDisplayName = (entry: WidgetConfig | null, fallbackId: string) =>
  ((entry?.component.option as Record<string, unknown> | undefined)?.label as string) ||
  entry?.component.info.name ||
  fallbackId

/**
 * 结构树标签样式按部件所属包分类。
 * 这里只返回样式类，不让 SFC 内继续混入包名判断分支。
 */
export const getWidgetKindClass = (entry: WidgetConfig | null) => {
  const packageName = entry?.component.info.packageName
  if (packageName === 'Chart') return 'is-chart'
  if (packageName === 'Decorate') return 'is-decorate'
  return 'is-widget'
}

/**
 * 结构树标签文案统一复用渲染层定义，保证动作面板、结构树和候选列表语义一致。
 */
export const getWidgetKindLabel = (entry: WidgetConfig | null) =>
  getWidgetKindLabelByPackage(entry?.component.info.packageName || 'Widget')

/**
 * 部件显隐统一从 option.visible 推导。
 * 未显式关闭时按可见处理，保持与预览层现有默认行为一致。
 */
export const getWidgetVisibleState = (entry: WidgetConfig | null) =>
  ((entry?.component.option as Record<string, unknown> | undefined)?.visible as
    | boolean
    | undefined) !== false

/**
 * 根据当前部件列表生成快速查找表。
 * 结构树渲染和搜索都会频繁按 ID 取部件，统一预建 Map 可避免重复线性扫描。
 */
export const buildWidgetEntryMap = (widgets: WidgetConfig[]) =>
  new Map(widgets.map((item) => [item.id, item]))

const getPageFrameSearchText = (entry: WidgetConfig | null) => {
  if (entry?.component.info.keyName !== 'VPageMenu') return ''
  const option = normalizePageFrameOption(entry.component.option)
  return [
    option.logo.text,
    option.title.text,
    option.title.subtitle,
    option.weather.temperature,
    option.weather.condition,
    option.account.name,
    option.account.role,
    ...option.menuChildren.map((child) => child.label),
    ...option.menuChildren.flatMap((child) =>
      flattenPageMenuTree(child.children).map((item) => item.node.label),
    ),
  ]
    .join(' ')
    .toLowerCase()
}

/**
 * 过滤结构树中的部件节点。
 * 分组节点命中组名或子节点命中时都会保留，同时对子节点列表做最小裁剪，减少模板侧判断复杂度。
 */
export const filterWidgetLayerNodes = (
  keyword: string,
  widgetLayerTree: WidgetLayerNode[],
  widgetMap: Map<string, WidgetConfig>,
  widgetGroupMap = new Map(
    widgetLayerTree
      .filter((node): node is WidgetLayerGroupNode => node.type === 'group')
      .map((group): [string, WidgetLayerGroupNode] => [group.id, group]),
  ),
): WidgetLayerNode[] => {
  if (!keyword) {
    return widgetLayerTree
  }

  const childrenIndex = new Map<string, string[]>()
  widgetMap.forEach((entry) => {
    if (!entry.parentId) return
    const children = childrenIndex.get(entry.parentId) || []
    children.push(entry.id)
    childrenIndex.set(entry.parentId, children)
  })
  const matchesWidgetPath = (widgetId: string, visitedIds = new Set<string>()): boolean => {
    if (visitedIds.has(widgetId)) return false
    visitedIds.add(widgetId)
    const entry = widgetMap.get(widgetId) || null
    if (
      String(getWidgetDisplayName(entry, '')).toLowerCase().includes(keyword) ||
      getPageFrameSearchText(entry).includes(keyword)
    ) {
      return true
    }
    return (childrenIndex.get(widgetId) || []).some((childId) =>
      matchesWidgetPath(childId, visitedIds),
    )
  }

  const filterGroup = (
    group: WidgetLayerGroupNode,
    visitedGroupIds = new Set<string>(),
  ): WidgetLayerGroupNode | null => {
    if (visitedGroupIds.has(group.id)) return null
    const nextVisitedGroupIds = new Set(visitedGroupIds).add(group.id)
    const matchedChildren = group.children.filter((id) => matchesWidgetPath(id))
    const matchedChildGroupIds = (group.childGroupIds || []).filter((groupId) => {
      const childGroup = widgetGroupMap.get(groupId)
      return Boolean(childGroup && filterGroup(childGroup, nextVisitedGroupIds))
    })

    if (
      group.name.toLowerCase().includes(keyword) ||
      matchedChildren.length > 0 ||
      matchedChildGroupIds.length > 0
    ) {
      return {
        ...group,
        children: matchedChildren,
        ...(matchedChildGroupIds.length ? { childGroupIds: matchedChildGroupIds } : {}),
      }
    }
    return null
  }

  return widgetLayerTree
    .map<WidgetLayerNode | null>((node) => {
      if (node.type === 'group') {
        return filterGroup(node)
      }

      return matchesWidgetPath(node.id) ? node : null
    })
    .filter((node): node is WidgetLayerNode => Boolean(node))
}

/**
 * 同步结构树分组展开状态。
 * 默认只清理已删除分组的脏 ID；仅调用方明确传入的新建分组才允许加入展开列表。
 * 这样首次加载场景时不会把现有结构全部展开，新建操作仍可主动展示创建结果。
 */
export const syncExpandedGroupIds = (
  expandedGroupIds: string[],
  widgetLayerTree: WidgetLayerNode[],
  newlyCreatedGroupIds?: string[],
) => {
  const groupIds = widgetLayerTree
    .filter((node): node is WidgetLayerGroupNode => node.type === 'group')
    .map((node) => node.id)

  // 未传新建分组时保持全部现有折叠状态，避免初始化阶段误把整棵结构树展开。
  const groupsToExpand = newlyCreatedGroupIds ?? []
  return Array.from(new Set([...expandedGroupIds, ...groupsToExpand])).filter((id) =>
    groupIds.includes(id),
  )
}
