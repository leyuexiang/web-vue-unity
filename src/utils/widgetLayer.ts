import type { WidgetLayerGroupNode, WidgetLayerItemNode, WidgetLayerNode } from '@/types/threeScene'

/**
 * 创建默认部件图层树。
 * 老场景没有图层树时，按调用方传入的“背景到前景”顺序生成一份扁平节点列表，
 * 这样可以保证旧数据无迁移脚本也能平滑进入新图层逻辑。
 */
export const createDefaultWidgetLayerTree = (widgetIds: string[]): WidgetLayerItemNode[] =>
  widgetIds.map((id) => ({
    id,
    type: 'widget',
  }))

/**
 * 判断节点是否为分组节点。
 * 统一用这个守卫而不是到处手写 `type === 'group'`，便于后续字段扩展时集中维护。
 */
export const isWidgetLayerGroupNode = (node: WidgetLayerNode): node is WidgetLayerGroupNode =>
  node.type === 'group'

const buildWidgetGroupNodeMap = (tree: WidgetLayerNode[]) =>
  new Map(
    tree
      .filter(isWidgetLayerGroupNode)
      .map((group): [string, WidgetLayerGroupNode] => [group.id, group]),
  )

/** 建立子分组到直属父分组的索引。 */
export const buildWidgetGroupParentIndex = (tree: WidgetLayerNode[]) => {
  const groupMap = buildWidgetGroupNodeMap(tree)
  const index = new Map<string, string>()
  tree.forEach((node) => {
    if (!isWidgetLayerGroupNode(node)) return
    ;(node.childGroupIds || []).forEach((childGroupId) => {
      if (groupMap.has(childGroupId) && !index.has(childGroupId)) {
        index.set(childGroupId, node.id)
      }
    })
  })
  return index
}

/** 将既有分组挂到另一分组下，并按子分组顺序插入；无效目标和循环引用保持原树。 */
export const moveWidgetGroupIntoGroup = (
  tree: WidgetLayerNode[],
  groupId: string,
  targetGroupId: string,
  targetIndex = 0,
): WidgetLayerNode[] => {
  const groupMap = buildWidgetGroupNodeMap(tree)
  if (!groupMap.has(groupId) || !groupMap.has(targetGroupId) || groupId === targetGroupId) {
    return tree
  }

  const parentIndex = buildWidgetGroupParentIndex(tree)
  const targetChildren = groupMap.get(targetGroupId)?.childGroupIds || []
  if (
    parentIndex.get(groupId) === targetGroupId &&
    targetChildren.indexOf(groupId) === targetIndex
  ) {
    return tree
  }
  let ancestorId: string | undefined = targetGroupId
  while (ancestorId) {
    if (ancestorId === groupId) return tree
    ancestorId = parentIndex.get(ancestorId)
  }

  const nextTree = tree.map((node) => {
    if (!isWidgetLayerGroupNode(node)) return node
    if (node.id !== targetGroupId && !(node.childGroupIds || []).includes(groupId)) return node
    const childGroupIds = (node.childGroupIds || []).filter((id) => id !== groupId)
    if (node.id === targetGroupId) {
      const insertIndex = Math.max(0, Math.min(Math.trunc(targetIndex), childGroupIds.length))
      childGroupIds.splice(insertIndex, 0, groupId)
    }
    if (childGroupIds.length) return { ...node, childGroupIds }
    const nextGroup = { ...node }
    delete nextGroup.childGroupIds
    return nextGroup
  })
  return nextTree
}

/** 递归收集一个视觉分组内的全部真实部件，子分组本身不会被拍平成部件。 */
export const collectWidgetGroupWidgetIds = (tree: WidgetLayerNode[], groupId: string) => {
  const groupMap = buildWidgetGroupNodeMap(tree)
  const visitedGroupIds = new Set<string>()
  const widgetIds: string[] = []
  const visitGroup = (currentGroupId: string) => {
    if (visitedGroupIds.has(currentGroupId)) return
    visitedGroupIds.add(currentGroupId)
    const group = groupMap.get(currentGroupId)
    if (!group) return
    widgetIds.push(...group.children)
    ;(group.childGroupIds || []).forEach(visitGroup)
  }
  visitGroup(groupId)
  return Array.from(new Set(widgetIds))
}

/**
 * 拍平视觉管理树，得到最终画布渲染顺序。
 * 分组只提供视觉归类，拍平过程不会创建任何画布父子关系。
 */
export const flattenWidgetLayerTree = (tree: WidgetLayerNode[]): string[] => {
  const orderedIds: string[] = []
  const groupMap = buildWidgetGroupNodeMap(tree)
  const groupParentIndex = buildWidgetGroupParentIndex(tree)
  const visitedGroupIds = new Set<string>()

  const appendGroup = (group: WidgetLayerGroupNode) => {
    if (visitedGroupIds.has(group.id)) return
    visitedGroupIds.add(group.id)
    orderedIds.push(...group.children)
    ;(group.childGroupIds || []).forEach((childGroupId) => {
      const childGroup = groupMap.get(childGroupId)
      if (childGroup) appendGroup(childGroup)
    })
  }

  tree.forEach((node) => {
    if (isWidgetLayerGroupNode(node)) {
      if (!groupParentIndex.has(node.id)) appendGroup(node)
      return
    }
    orderedIds.push(node.id)
  })

  return orderedIds
}

/**
 * 根据拍平后的图层顺序生成显式 zIndex 映射。
 * 显式层级值用于把“结构顺序”稳定同步到真实渲染层，避免仅依赖 DOM 先后顺序。
 */
export const buildWidgetLayerZIndexMap = (tree: WidgetLayerNode[]) =>
  buildWidgetZIndexMap(flattenWidgetLayerTree(tree))

/** 根据已经整理好的“背景到前景”组件顺序生成连续 zIndex。 */
export const buildWidgetZIndexMap = (orderedWidgetIds: string[]) =>
  Object.fromEntries(orderedWidgetIds.map((id, index) => [id, index]))

/**
 * 合并发布二维图层树时保留当前运行态的分组状态。
 *
 * 发布缓存中的完整图层树只代表“发布时初始状态”；预览切页后，当前树上的分组显隐已经
 * 变成运行态临时状态。按需追加组件必须继续使用发布树补齐结构，但不能用发布初始值覆盖
 * 已经完成的切页结果。只合并当前已存在分组的显隐和锁定字段，新分组仍使用发布快照值。
 */
export const preserveWidgetLayerRuntimeState = (
  nextTree: WidgetLayerNode[],
  currentTree: readonly WidgetLayerNode[],
): WidgetLayerNode[] => {
  const currentGroupState = new Map(
    currentTree
      .filter(isWidgetLayerGroupNode)
      .map((group) => [group.id, { visible: group.visible, locked: group.locked }] as const),
  )

  return nextTree.map((node) => {
    if (!isWidgetLayerGroupNode(node)) return node
    const currentState = currentGroupState.get(node.id)
    return currentState ? { ...node, ...currentState } : node
  })
}

/**
 * 归一化并校验图层树：
 * 1. 自动剔除不存在的部件 id；
 * 2. 保留合法空组，支持先建组后拖入成员；
 * 3. 自动补上漏掉的部件；
 * 4. 自动防止重复引用同一个部件 id。
 *
 * 这样无论是旧场景回显、删除部件后的残留状态，还是未来手动改配置，
 * 最终都能回到一份稳定、可渲染的部件图层树。
 */
export const normalizeWidgetLayerTree = (
  inputTree: WidgetLayerNode[] | null | undefined,
  widgetIds: string[],
): WidgetLayerNode[] => {
  const validIdSet = new Set(widgetIds)
  const usedIdSet = new Set<string>()
  const normalizedTree: WidgetLayerNode[] = []

  ;(inputTree || []).forEach((node) => {
    if (isWidgetLayerGroupNode(node)) {
      const children = node.children.filter((id) => {
        if (!validIdSet.has(id) || usedIdSet.has(id)) {
          return false
        }
        usedIdSet.add(id)
        return true
      })

      normalizedTree.push({
        ...node,
        visible: node.visible !== false,
        locked: node.locked === true,
        children,
      })
      return
    }

    if (!validIdSet.has(node.id) || usedIdSet.has(node.id)) {
      return
    }

    usedIdSet.add(node.id)
    normalizedTree.push(node)
  })

  widgetIds.forEach((id) => {
    if (!usedIdSet.has(id)) {
      normalizedTree.push({
        id,
        type: 'widget',
      })
    }
  })

  const normalizedGroupMap = buildWidgetGroupNodeMap(normalizedTree)
  const groupParentIndex = new Map<string, string>()
  normalizedTree.forEach((node) => {
    if (!isWidgetLayerGroupNode(node)) return
    const normalizedChildGroupIds: string[] = []
    const sourceGroup = (inputTree || []).find(
      (item): item is WidgetLayerGroupNode => item.id === node.id && item.type === 'group',
    )
    ;(sourceGroup?.childGroupIds || []).forEach((childGroupId: string) => {
      if (
        childGroupId === node.id ||
        !normalizedGroupMap.has(childGroupId) ||
        groupParentIndex.has(childGroupId) ||
        normalizedChildGroupIds.includes(childGroupId)
      ) {
        return
      }

      let ancestorGroupId: string | undefined = node.id
      while (ancestorGroupId) {
        if (ancestorGroupId === childGroupId) return
        ancestorGroupId = groupParentIndex.get(ancestorGroupId)
      }
      groupParentIndex.set(childGroupId, node.id)
      normalizedChildGroupIds.push(childGroupId)
    })
    if (normalizedChildGroupIds.length) node.childGroupIds = normalizedChildGroupIds
    else delete node.childGroupIds
  })

  return normalizedTree
}

/**
 * 往顶层最后方插入一个部件节点。
 * 结构树采用“越靠下越在前”的图层语义，因此新拖入部件必须追加到末位，
 * 才能同时保持结构展示和画布遮挡关系一致。
 */
export const appendWidgetLayerNode = (
  tree: WidgetLayerNode[],
  widgetId: string,
): WidgetLayerNode[] => [...tree, { id: widgetId, type: 'widget' }]

/**
 * 从视觉管理树里移除指定部件。
 * 分组即使失去最后一个成员也必须保留，支持用户继续向空组拖入其他部件。
 */
export const removeWidgetFromLayerTree = (
  tree: WidgetLayerNode[],
  widgetId: string,
): WidgetLayerNode[] =>
  tree
    .map<WidgetLayerNode | null>((node) => {
      if (isWidgetLayerGroupNode(node)) {
        const nextChildren = node.children.filter((id) => id !== widgetId)
        return {
          ...node,
          children: nextChildren,
        }
      }

      return node.id === widgetId ? null : node
    })
    .filter((node): node is WidgetLayerNode => node !== null)

/**
 * 判断一组部件是否位于同一个父层级。
 * 组件只能在同一直属视觉分组内继续建子组；跨组场景由分组多选入口处理。
 */
export const areWidgetIdsInSameParent = (tree: WidgetLayerNode[], widgetIds: string[]) => {
  if (widgetIds.length < 2) return false

  const parentIdSet = new Set<string>()

  tree.forEach((node) => {
    if (isWidgetLayerGroupNode(node)) {
      node.children.forEach((id) => {
        if (widgetIds.includes(id)) {
          parentIdSet.add(node.id)
        }
      })
      return
    }

    if (widgetIds.includes(node.id)) {
      parentIdSet.add('__root__')
    }
  })

  return parentIdSet.size === 1
}

/** 判断多个视觉分组是否处于同一个视觉父层级。 */
export const areWidgetGroupIdsInSameParent = (tree: WidgetLayerNode[], groupIds: string[]) => {
  const uniqueGroupIds = Array.from(new Set(groupIds))
  if (uniqueGroupIds.length < 2) return false
  const groupMap = buildWidgetGroupNodeMap(tree)
  if (uniqueGroupIds.some((id) => !groupMap.has(id))) return false
  const groupParentIndex = buildWidgetGroupParentIndex(tree)
  return new Set(uniqueGroupIds.map((id) => groupParentIndex.get(id) || '__root__')).size === 1
}

/**
 * 判断普通组件与视觉分组的混合选择是否都位于同一个直属视觉父层级。
 *
 * 根级组件和根级分组统一使用 `__root__`；组内组件与子分组则都使用直属父组 id。
 * 只有同层级节点才允许一次包进新父组，避免跨层级选择产生循环引用或隐式拆组。
 */
export const areWidgetLayerSelectionsInSameParent = (
  tree: WidgetLayerNode[],
  widgetIds: string[],
  groupIds: string[],
) => {
  const selectedWidgetIds = Array.from(new Set(widgetIds))
  const selectedGroupIds = Array.from(new Set(groupIds))
  if (selectedWidgetIds.length + selectedGroupIds.length < 2) return false

  const validWidgetIds = new Set(flattenWidgetLayerTree(tree))
  const groupMap = buildWidgetGroupNodeMap(tree)
  if (selectedWidgetIds.some((id) => !validWidgetIds.has(id))) return false
  if (selectedGroupIds.some((id) => !groupMap.has(id))) return false

  const widgetParentIndex = buildWidgetParentGroupIndex(tree)
  const groupParentIndex = buildWidgetGroupParentIndex(tree)
  const parentIds = [
    ...selectedWidgetIds.map((id) => widgetParentIndex.get(id) || '__root__'),
    ...selectedGroupIds.map((id) => groupParentIndex.get(id) || '__root__'),
  ]
  return new Set(parentIds).size === 1
}

/**
 * 创建分组。
 * 分组位置固定插在“本次选中的同层级节点里最靠前”的位置，保持用户视觉上下文稳定。
 */
export const createWidgetGroupLayerTree = (
  tree: WidgetLayerNode[],
  groupId: string,
  groupName: string,
  widgetIds: string[],
): WidgetLayerNode[] => {
  if (!areWidgetIdsInSameParent(tree, widgetIds)) {
    return tree
  }

  const selectedIdSet = new Set(widgetIds)
  const orderedSelectedIds = flattenWidgetLayerTree(tree).filter((id) => selectedIdSet.has(id))
  const selectedGroup = {
    id: groupId,
    type: 'group' as const,
    name: groupName,
    children: orderedSelectedIds,
  }

  const nextTree: WidgetLayerNode[] = []
  let groupInserted = false
  let parentGroupId: string | null = null

  tree.forEach((node) => {
    if (isWidgetLayerGroupNode(node)) {
      const selectedChildren = node.children.filter((id) => selectedIdSet.has(id))
      if (!selectedChildren.length) {
        nextTree.push(node)
        return
      }

      /**
       * 同组成员建立新组时，只移走选中的成员，未选成员留在原组。
       * 旧实现会直接丢弃整个原组，造成未选组件从管理树中消失。
       */
      const remainingChildren = node.children.filter((id) => !selectedIdSet.has(id))
      parentGroupId = node.id
      nextTree.push({
        ...node,
        children: remainingChildren,
        childGroupIds: [...(node.childGroupIds || []), groupId],
      })
      if (!groupInserted) {
        groupInserted = true
      }
      return
    }

    if (!selectedIdSet.has(node.id)) {
      nextTree.push(node)
      return
    }

    if (!groupInserted) {
      nextTree.push(selectedGroup)
      groupInserted = true
    }
  })

  if (groupInserted && parentGroupId) {
    nextTree.push(selectedGroup)
  }

  return nextTree
}

/**
 * 把多个同层级的既有视觉分组包进一个新父组。
 * 子分组节点和成员保持原样，只新增父子分组引用，因此不会把旧结构拍平或清空。
 */
export const createWidgetGroupLayerTreeFromGroups = (
  tree: WidgetLayerNode[],
  groupId: string,
  groupName: string,
  childGroupIds: string[],
): WidgetLayerNode[] => {
  const selectedGroupIds = Array.from(new Set(childGroupIds))
  if (!areWidgetGroupIdsInSameParent(tree, selectedGroupIds)) return tree

  const selectedGroupIdSet = new Set(selectedGroupIds)
  const groupParentIndex = buildWidgetGroupParentIndex(tree)
  const parentGroupId = groupParentIndex.get(selectedGroupIds[0]) || null
  const selectedGroup: WidgetLayerGroupNode = {
    id: groupId,
    type: 'group',
    name: groupName,
    children: [],
    childGroupIds: selectedGroupIds,
  }

  const nextTree = tree.map((node) => {
    if (!isWidgetLayerGroupNode(node) || node.id !== parentGroupId) return node
    const oldChildGroupIds = node.childGroupIds || []
    const firstSelectedIndex = oldChildGroupIds.findIndex((id) => selectedGroupIdSet.has(id))
    return {
      ...node,
      childGroupIds: oldChildGroupIds.reduce<string[]>((ids, childGroupId) => {
        if (!selectedGroupIdSet.has(childGroupId)) {
          ids.push(childGroupId)
        } else if (
          !ids.includes(groupId) &&
          oldChildGroupIds.indexOf(childGroupId) === firstSelectedIndex
        ) {
          ids.push(groupId)
        }
        return ids
      }, []),
    }
  })

  const firstSelectedTreeIndex = nextTree.findIndex((node) => selectedGroupIdSet.has(node.id))
  const insertIndex = firstSelectedTreeIndex >= 0 ? firstSelectedTreeIndex : nextTree.length
  nextTree.splice(insertIndex, 0, selectedGroup)
  return nextTree
}

/**
 * 把同层级的普通组件与既有视觉分组一次包进新父组。
 *
 * 真实组件进入新组的 children，既有分组只通过 childGroupIds 建立引用，因此原分组名称、
 * 成员、显隐和锁定状态均保持不变。组件配置里的 parentId 也不会在视觉成组时被改写。
 */
export const createWidgetGroupLayerTreeFromMixedSelection = (
  tree: WidgetLayerNode[],
  groupId: string,
  groupName: string,
  widgetIds: string[],
  childGroupIds: string[],
): WidgetLayerNode[] => {
  const selectedWidgetIds = Array.from(new Set(widgetIds))
  const selectedGroupIds = Array.from(new Set(childGroupIds))
  if (!selectedWidgetIds.length || !selectedGroupIds.length) return tree
  if (!areWidgetLayerSelectionsInSameParent(tree, selectedWidgetIds, selectedGroupIds)) {
    return tree
  }

  const selectedWidgetIdSet = new Set(selectedWidgetIds)
  const selectedGroupIdSet = new Set(selectedGroupIds)
  const widgetParentIndex = buildWidgetParentGroupIndex(tree)
  const groupParentIndex = buildWidgetGroupParentIndex(tree)
  const parentGroupId =
    widgetParentIndex.get(selectedWidgetIds[0]) || groupParentIndex.get(selectedGroupIds[0]) || null
  const orderedWidgetIds = flattenWidgetLayerTree(tree).filter((id) => selectedWidgetIdSet.has(id))
  const selectedGroup: WidgetLayerGroupNode = {
    id: groupId,
    type: 'group',
    name: groupName,
    children: orderedWidgetIds,
    childGroupIds: selectedGroupIds,
  }

  const nextTree = tree
    .map<WidgetLayerNode | null>((node) => {
      if (isWidgetLayerGroupNode(node)) {
        if (node.id !== parentGroupId) return node
        const oldChildGroupIds = node.childGroupIds || []
        const firstSelectedIndex = oldChildGroupIds.findIndex((id) => selectedGroupIdSet.has(id))
        return {
          ...node,
          children: node.children.filter((id) => !selectedWidgetIdSet.has(id)),
          childGroupIds: oldChildGroupIds.reduce<string[]>((ids, childGroupId) => {
            if (!selectedGroupIdSet.has(childGroupId)) {
              ids.push(childGroupId)
            } else if (
              !ids.includes(groupId) &&
              oldChildGroupIds.indexOf(childGroupId) === firstSelectedIndex
            ) {
              ids.push(groupId)
            }
            return ids
          }, []),
        }
      }

      return !parentGroupId && selectedWidgetIdSet.has(node.id) ? null : node
    })
    .filter((node): node is WidgetLayerNode => node !== null)

  const selectedTreeIds = new Set([...selectedWidgetIds, ...selectedGroupIds])
  const firstSelectedTreeIndex = nextTree.findIndex((node) => selectedTreeIds.has(node.id))
  const insertIndex = firstSelectedTreeIndex >= 0 ? firstSelectedTreeIndex : nextTree.length
  nextTree.splice(insertIndex, 0, selectedGroup)
  return nextTree
}

/**
 * 创建一个没有成员的视觉分组。
 * 空组只进入结构管理数据，不创建 DOM 容器，也不改变任何组件配置。
 */
export const appendEmptyWidgetGroup = (
  tree: WidgetLayerNode[],
  groupId: string,
  groupName: string,
): WidgetLayerNode[] => [
  ...tree,
  {
    id: groupId,
    type: 'group',
    name: groupName,
    visible: true,
    locked: false,
    children: [],
  },
]

/**
 * 把单个组件移动到根级或指定分组。
 * 移动过程先从原位置移除，再按目标下标插入，因此不会产生重复成员；
 * 返回树拍平后的顺序就是本次拖拽应同步到 zIndex 的唯一结果。
 */
export const moveWidgetLayerItem = (
  tree: WidgetLayerNode[],
  widgetId: string,
  targetGroupId: string | null,
  targetIndex?: number,
): WidgetLayerNode[] => {
  const treeWithoutWidget = removeWidgetFromLayerTree(tree, widgetId)

  if (targetGroupId) {
    let inserted = false
    const nextTree = treeWithoutWidget.map((node) => {
      if (!isWidgetLayerGroupNode(node) || node.id !== targetGroupId) return node
      inserted = true
      const insertIndex = Math.max(
        0,
        Math.min(targetIndex ?? node.children.length, node.children.length),
      )
      const children = [...node.children]
      children.splice(insertIndex, 0, widgetId)
      return { ...node, children }
    })
    return inserted ? nextTree : tree
  }

  const rootNode: WidgetLayerItemNode = { id: widgetId, type: 'widget' }
  const insertIndex = Math.max(
    0,
    Math.min(targetIndex ?? treeWithoutWidget.length, treeWithoutWidget.length),
  )
  const nextTree = [...treeWithoutWidget]
  nextTree.splice(insertIndex, 0, rootNode)
  return nextTree
}

/**
 * 把一棵组件子树对应的多个平铺图层节点作为连续块移动。
 * 父子关系保存在组件快照中；图层树仍保存每个真实组件的渲染顺序和视觉分组归属。
 */
export const moveWidgetLayerItems = (
  tree: WidgetLayerNode[],
  widgetIds: string[],
  targetGroupId: string | null,
  targetIndex?: number,
): WidgetLayerNode[] => {
  const orderedWidgetIds = Array.from(new Set(widgetIds))
  const movingIdSet = new Set(orderedWidgetIds)
  const treeWithoutWidgets = tree
    .map<WidgetLayerNode | null>((node) => {
      if (isWidgetLayerGroupNode(node)) {
        return {
          ...node,
          children: node.children.filter((id) => !movingIdSet.has(id)),
        }
      }
      return movingIdSet.has(node.id) ? null : node
    })
    .filter((node): node is WidgetLayerNode => node !== null)

  if (targetGroupId) {
    let inserted = false
    const nextTree = treeWithoutWidgets.map((node) => {
      if (!isWidgetLayerGroupNode(node) || node.id !== targetGroupId) return node
      inserted = true
      const insertIndex = Math.max(
        0,
        Math.min(targetIndex ?? node.children.length, node.children.length),
      )
      const children = [...node.children]
      children.splice(insertIndex, 0, ...orderedWidgetIds)
      return { ...node, children }
    })
    return inserted ? nextTree : tree
  }

  const insertIndex = Math.max(
    0,
    Math.min(targetIndex ?? treeWithoutWidgets.length, treeWithoutWidgets.length),
  )
  const nextTree = [...treeWithoutWidgets]
  nextTree.splice(
    insertIndex,
    0,
    ...orderedWidgetIds.map<WidgetLayerItemNode>((id) => ({ id, type: 'widget' })),
  )
  return nextTree
}

/**
 * 删除视觉分组，但保留全部成员。
 * 成员按组内顺序回填到分组原位置，既不删除组件，也不修改其坐标、尺寸和业务配置。
 */
export const deleteWidgetGroupLayerTree = (
  tree: WidgetLayerNode[],
  groupId: string,
): { nextTree: WidgetLayerNode[]; widgetIds: string[] } => ungroupWidgetLayerTree(tree, groupId)

/**
 * 为组件建立 O(1) 的父组查询索引。
 * 结构树渲染、锁定判断和显隐判断都会高频调用，集中建索引可避免每个节点重复扫描整棵树。
 */
export const buildWidgetParentGroupIndex = (tree: WidgetLayerNode[]) => {
  const index = new Map<string, string>()
  tree.forEach((node) => {
    if (!isWidgetLayerGroupNode(node)) return
    node.children.forEach((widgetId) => index.set(widgetId, node.id))
  })
  return index
}

/**
 * 解组。
 * 组内 children 会按当前组内顺序回填到原组位置，保证用户拖过的层级结果不丢失。
 */
export const ungroupWidgetLayerTree = (
  tree: WidgetLayerNode[],
  groupId: string,
): { nextTree: WidgetLayerNode[]; widgetIds: string[] } => {
  const nextTree: WidgetLayerNode[] = []
  let releasedIds: string[] = []
  const groupParentIndex = buildWidgetGroupParentIndex(tree)
  const parentGroupId = groupParentIndex.get(groupId) || null
  const targetGroup = tree.find(
    (node): node is WidgetLayerGroupNode => isWidgetLayerGroupNode(node) && node.id === groupId,
  )

  if (!targetGroup) return { nextTree: tree, widgetIds: [] }

  tree.forEach((node) => {
    if (isWidgetLayerGroupNode(node) && node.id === groupId) {
      releasedIds = [...node.children]
      if (!parentGroupId) {
        node.children.forEach((id) => nextTree.push({ id, type: 'widget' }))
      }
      return
    }

    if (isWidgetLayerGroupNode(node) && node.id === parentGroupId) {
      const childGroupIds = node.childGroupIds || []
      const releasedChildGroupIds = targetGroup.childGroupIds || []
      nextTree.push({
        ...node,
        children: Array.from(new Set([...node.children, ...targetGroup.children])),
        childGroupIds: childGroupIds.flatMap((childGroupId) =>
          childGroupId === groupId ? releasedChildGroupIds : [childGroupId],
        ),
      })
      return
    }

    nextTree.push(node)
  })

  return {
    nextTree,
    widgetIds: releasedIds,
  }
}

/**
 * 生成默认分组名称。
 * 名称只追求稳定递增，不追求补洞复用，避免因删除历史组导致名称来回跳变。
 */
export const buildNextWidgetGroupName = (tree: WidgetLayerNode[]) => {
  const maxIndex = tree.reduce((currentMax, node) => {
    if (!isWidgetLayerGroupNode(node)) return currentMax
    const matched = /^分组(\d+)$/.exec(node.name.trim())
    if (!matched) return currentMax
    return Math.max(currentMax, Number(matched[1]))
  }, 0)

  return `分组${maxIndex + 1}`
}
