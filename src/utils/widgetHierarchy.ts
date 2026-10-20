export interface WidgetHierarchyEntry {
  id: string
  parentId?: string
}

/**
 * 清理二维组件父子关系中的无效引用、自引用和循环引用。
 *
 * 保存数据可能来自旧接口或人工编辑的 JSON；归一化时按原数组顺序保留最先出现的合法关系，
 * 一旦发现父级不存在或沿祖先链回到自身，就把当前节点提升到根级。
 */
export const normalizeWidgetHierarchy = <T extends WidgetHierarchyEntry>(widgets: T[]): T[] => {
  const validIdSet = new Set(widgets.map((widget) => widget.id))
  const sourceParentMap = new Map(widgets.map((widget) => [widget.id, widget.parentId]))

  return widgets.map((widget) => {
    const parentId = widget.parentId
    if (!parentId || parentId === widget.id || !validIdSet.has(parentId)) {
      if (!parentId) return widget
      const { parentId: _removedParentId, ...rootWidget } = widget
      return rootWidget as T
    }

    const visitedIds = new Set([widget.id])
    let currentParentId: string | undefined = parentId
    while (currentParentId) {
      if (visitedIds.has(currentParentId)) {
        const { parentId: _removedParentId, ...rootWidget } = widget
        return rootWidget as T
      }
      visitedIds.add(currentParentId)
      currentParentId = sourceParentMap.get(currentParentId)
    }

    return widget
  })
}

/** 为结构树建立父组件到直属子组件的稳定顺序索引。 */
export const buildWidgetChildrenIndex = <T extends WidgetHierarchyEntry>(widgets: T[]) => {
  const childrenIndex = new Map<string, string[]>()
  widgets.forEach((widget) => {
    if (!widget.parentId) return
    const children = childrenIndex.get(widget.parentId) || []
    children.push(widget.id)
    childrenIndex.set(widget.parentId, children)
  })
  return childrenIndex
}

/**
 * 按父级在前、后代在后的深度优先顺序整理图层 ID。
 * 同级先后仍沿用图层树原顺序，因此结果既与左侧递归树一致，也保证每个子组件层级高于父组件。
 */
export const orderWidgetIdsByHierarchy = <T extends WidgetHierarchyEntry>(
  orderedIds: string[],
  widgets: T[],
) => {
  const widgetMap = new Map(widgets.map((widget) => [widget.id, widget]))
  const orderedIdSet = new Set(orderedIds)
  const childrenIndex = new Map<string, string[]>()
  orderedIds.forEach((widgetId) => {
    const parentId = widgetMap.get(widgetId)?.parentId
    if (!parentId || !orderedIdSet.has(parentId)) return
    const children = childrenIndex.get(parentId) || []
    children.push(widgetId)
    childrenIndex.set(parentId, children)
  })

  const result: string[] = []
  const visitedIds = new Set<string>()
  const visit = (widgetId: string) => {
    if (visitedIds.has(widgetId) || !widgetMap.has(widgetId)) return
    visitedIds.add(widgetId)
    result.push(widgetId)
    ;(childrenIndex.get(widgetId) || []).forEach(visit)
  }

  orderedIds.forEach((widgetId) => {
    const parentId = widgetMap.get(widgetId)?.parentId
    if (!parentId || !orderedIdSet.has(parentId)) visit(widgetId)
  })
  // 异常循环理论上已由 normalizeWidgetHierarchy 清理；这里保留兜底，避免意外丢节点。
  orderedIds.forEach(visit)
  return result
}

/** 返回从直属子级开始的完整后代列表；异常循环会被 visited 集合安全截断。 */
export const collectWidgetDescendantIds = (
  widgetId: string,
  childrenIndex: ReadonlyMap<string, readonly string[]>,
) => {
  const descendants: string[] = []
  const visitedIds = new Set([widgetId])
  const visit = (parentId: string) => {
    ;(childrenIndex.get(parentId) || []).forEach((childId) => {
      if (visitedIds.has(childId)) return
      visitedIds.add(childId)
      descendants.push(childId)
      visit(childId)
    })
  }
  visit(widgetId)
  return descendants
}

/** 返回目标组件从直属父级到最外层父级的祖先链。 */
export const collectWidgetAncestorIds = (
  widgetId: string,
  parentIndex: ReadonlyMap<string, string>,
) => {
  const ancestors: string[] = []
  const visitedIds = new Set([widgetId])
  let parentId = parentIndex.get(widgetId)
  while (parentId && !visitedIds.has(parentId)) {
    visitedIds.add(parentId)
    ancestors.push(parentId)
    parentId = parentIndex.get(parentId)
  }
  return ancestors
}

/**
 * 多选拖拽时只保留最外层选中节点。
 * 若父组件和它的子组件同时被选中，只移动父组件即可，子树会随父组件整体迁移。
 */
export const compactWidgetHierarchySelection = (
  widgetIds: string[],
  parentIndex: ReadonlyMap<string, string>,
) => {
  const selectedIdSet = new Set(widgetIds)
  return Array.from(selectedIdSet).filter(
    (widgetId) =>
      !collectWidgetAncestorIds(widgetId, parentIndex).some((ancestorId) =>
        selectedIdSet.has(ancestorId),
      ),
  )
}
