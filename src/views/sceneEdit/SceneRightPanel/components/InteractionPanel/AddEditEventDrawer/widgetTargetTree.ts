import type { WidgetConfig } from '@/stores/sceneEditStore'
import type {
  SceneWidgetTargetItem,
  WidgetLayerGroupNode,
  WidgetLayerNode,
} from '@/types/threeScene'
import { buildWidgetGroupParentIndex, collectWidgetGroupWidgetIds } from '@/utils/widgetLayer'

export interface WidgetTargetTreeNode {
  value: string
  label: string
  kind: 'group' | 'widget'
  widgetIds: string[]
  children?: WidgetTargetTreeNode[]
}

const GROUP_VALUE_PREFIX = '__widget_group__:'

/** 分组使用独立值域，避免极端情况下分组 id 与组件 id 冲突。 */
export const getWidgetTargetGroupValue = (groupId: string) => `${GROUP_VALUE_PREFIX}${groupId}`

/** 从树控件使用的分组值中还原持久化分组 ID。 */
export const getWidgetTargetGroupId = (value: string) =>
  value.startsWith(GROUP_VALUE_PREFIX) ? value.slice(GROUP_VALUE_PREFIX.length) : null

/**
 * 把左侧二维组件结构投影为动作选择树。
 *
 * 图层树负责视觉分组和顺序，组件 parentId 负责真实父子层级；这里沿用结构面板的规则：
 * 同一分组内的父子组件嵌套显示，跨分组子组件则作为所属分组的根节点显示。
 */
export const buildWidgetTargetTree = (
  layerTree: WidgetLayerNode[],
  widgets: WidgetConfig[],
  options: SceneWidgetTargetItem[],
): WidgetTargetTreeNode[] => {
  const optionMap = new Map(options.map((option) => [option.id, option]))
  const widgetMap = new Map(widgets.map((widget) => [widget.id, widget]))
  const groupMap = new Map(
    layerTree
      .filter((node): node is WidgetLayerGroupNode => node.type === 'group')
      .map((group) => [group.id, group]),
  )
  const groupParentIndex = buildWidgetGroupParentIndex(layerTree)
  const widgetGroupIndex = new Map<string, string>()
  groupMap.forEach((group) =>
    group.children.forEach((widgetId) => widgetGroupIndex.set(widgetId, group.id)),
  )

  const orderedWidgetIds = options.map((option) => option.id)
  const childIdsByParent = new Map<string, string[]>()
  orderedWidgetIds.forEach((widgetId) => {
    const parentId = widgetMap.get(widgetId)?.parentId
    if (!parentId) return
    const widgetGroupId = widgetGroupIndex.get(widgetId)
    const parentGroupId = widgetGroupIndex.get(parentId)
    if (widgetGroupId !== parentGroupId) return
    const childIds = childIdsByParent.get(parentId) || []
    childIds.push(widgetId)
    childIdsByParent.set(parentId, childIds)
  })

  const buildWidgetNode = (
    widgetId: string,
    visitedWidgetIds = new Set<string>(),
  ): WidgetTargetTreeNode | null => {
    const option = optionMap.get(widgetId)
    if (!option || visitedWidgetIds.has(widgetId)) return null
    const nextVisitedIds = new Set(visitedWidgetIds).add(widgetId)
    const children = (childIdsByParent.get(widgetId) || [])
      .map((childId) => buildWidgetNode(childId, nextVisitedIds))
      .filter((node): node is WidgetTargetTreeNode => Boolean(node))
    return {
      value: option.id,
      label: `${option.name}（${option.kindLabel}）`,
      kind: 'widget',
      widgetIds: [option.id],
      ...(children.length ? { children } : {}),
    }
  }

  const buildGroupNode = (
    group: WidgetLayerGroupNode,
    visitedGroupIds = new Set<string>(),
  ): WidgetTargetTreeNode | null => {
    if (visitedGroupIds.has(group.id)) return null
    const nextVisitedIds = new Set(visitedGroupIds).add(group.id)
    const ownWidgetIdSet = new Set(group.children)
    const widgetChildren = group.children
      .filter((widgetId) => {
        const parentId = widgetMap.get(widgetId)?.parentId
        return !parentId || !ownWidgetIdSet.has(parentId)
      })
      .map((widgetId) => buildWidgetNode(widgetId))
      .filter((node): node is WidgetTargetTreeNode => Boolean(node))
    const groupChildren = (group.childGroupIds || [])
      .map((groupId) => groupMap.get(groupId))
      .filter((childGroup): childGroup is WidgetLayerGroupNode => Boolean(childGroup))
      .map((childGroup) => buildGroupNode(childGroup, nextVisitedIds))
      .filter((node): node is WidgetTargetTreeNode => Boolean(node))

    return {
      value: getWidgetTargetGroupValue(group.id),
      label: group.name,
      kind: 'group',
      widgetIds: collectWidgetGroupWidgetIds(layerTree, group.id),
      children: [...widgetChildren, ...groupChildren],
    }
  }

  return layerTree
    .map((node): WidgetTargetTreeNode | null => {
      if (node.type === 'group') {
        return groupParentIndex.has(node.id) ? null : buildGroupNode(node)
      }
      return widgetMap.get(node.id)?.parentId ? null : buildWidgetNode(node.id)
    })
    .filter((node): node is WidgetTargetTreeNode => Boolean(node))
}

/**
 * 将树选择值归一化为互不重复的树节点值。
 *
 * Element Plus 在父子节点同时被勾选时可能把整条子树回传；动作目标是按真实部件
 * 逐个控制的，因此部件父节点被选中后不应再把它的子节点当成额外目标。分组节点
 * 则保持原有语义，仍然可以展开为分组内的全部部件。
 */
export const normalizeWidgetTargetSelectionValues = (
  values: string[],
  tree: WidgetTargetTreeNode[],
): string[] => {
  const nodeMap = new Map<string, WidgetTargetTreeNode>()
  const widgetParentMap = new Map<string, string>()
  const nodeParentMap = new Map<string, string>()
  const visit = (
    nodes: WidgetTargetTreeNode[],
    parentNodeValue?: string,
    parentWidgetValue?: string,
  ) => {
    nodes.forEach((node) => {
      nodeMap.set(node.value, node)
      if (parentNodeValue) nodeParentMap.set(node.value, parentNodeValue)
      if (node.kind === 'widget') {
        if (parentWidgetValue) widgetParentMap.set(node.value, parentWidgetValue)
        if (node.children) visit(node.children, node.value, node.value)
        return
      }
      if (node.children) visit(node.children, node.value)
    })
  }
  visit(tree)

  const selectedValues = new Set(values)
  const selectedWidgetValues = new Set(
    values.filter((value) => nodeMap.get(value)?.kind === 'widget' || optionLike(value)),
  )
  const compactedValues: string[] = []
  const emittedValues = new Set<string>()

  values.forEach((value) => {
    const node = nodeMap.get(value)
    if (node) {
      let parentValue = nodeParentMap.get(value)
      while (parentValue) {
        const parentNode = nodeMap.get(parentValue)
        const selectedWidgetAncestor =
          node.kind === 'widget' && parentNode?.kind === 'widget' && selectedWidgetValues.has(parentValue)
        const selectedGroupAncestor = parentNode?.kind === 'group' && selectedValues.has(parentValue)
        if (selectedWidgetAncestor || selectedGroupAncestor) return
        parentValue = nodeParentMap.get(parentValue)
      }
    }
    if (emittedValues.has(value)) return
    emittedValues.add(value)
    compactedValues.push(value)
  })

  return compactedValues
}

export interface WidgetTargetSelection {
  widgetIds: string[]
  groupIds: string[]
}

const buildWidgetTargetNodeMap = (tree: WidgetTargetTreeNode[]) => {
  const nodeMap = new Map<string, WidgetTargetTreeNode>()
  const visit = (nodes: WidgetTargetTreeNode[]) => {
    nodes.forEach((node) => {
      nodeMap.set(node.value, node)
      if (node.children) visit(node.children)
    })
  }
  visit(tree)
  return nodeMap
}

/** 将树选择值拆分为真实部件目标和视觉分组目标，分组不会展开为成员部件。 */
export const resolveWidgetTargetSelection = (
  values: string[],
  tree: WidgetTargetTreeNode[],
): WidgetTargetSelection => {
  const nodeMap = buildWidgetTargetNodeMap(tree)
  const selection = normalizeWidgetTargetSelectionValues(values, tree)
  const widgetIds: string[] = []
  const groupIds: string[] = []

  selection.forEach((value) => {
    const node = nodeMap.get(value)
    if (node?.kind === 'group') {
      const groupId = getWidgetTargetGroupId(value)
      if (groupId) groupIds.push(groupId)
      return
    }
    if (node?.kind === 'widget') {
      widgetIds.push(...node.widgetIds)
      return
    }
    if (optionLike(value)) widgetIds.push(value)
  })

  return {
    widgetIds: Array.from(new Set(widgetIds)),
    groupIds: Array.from(new Set(groupIds)),
  }
}

/** 将树选择值归一化为现有动作协议需要的真实组件 id。 */
export const resolveWidgetTargetIds = (
  values: string[],
  tree: WidgetTargetTreeNode[],
): string[] => resolveWidgetTargetSelection(values, tree).widgetIds

/** 将树选择值归一化为现有动作协议需要的视觉分组 id。 */
export const resolveWidgetTargetGroupIds = (
  values: string[],
  tree: WidgetTargetTreeNode[],
): string[] => resolveWidgetTargetSelection(values, tree).groupIds

const optionLike = (value: string) => !value.startsWith(GROUP_VALUE_PREFIX)
