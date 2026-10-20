/**
 * 页面菜单节点的可序列化定义。
 *
 * `visible` 只控制该节点是否发布到菜单；被隐藏的父节点会连带隐藏其全部子级，
 * 因此运行时不必维护第二份“可见页面”列表。`pageUrl` 允许填写站内路由或完整地址，
 * 为空时该节点只充当菜单分组，不会触发页面跳转。每个节点独立保存打开方式，
 * 使同一框架中的不同页面链接能够选择当前窗口或新窗口打开。
 */
export interface PageMenuNode {
  id: string
  label: string
  pageUrl: string
  openInNewWindow: boolean
  visible: boolean
  children: PageMenuNode[]
}

/** 配置面板使用的扁平节点；`node` 始终指回真实持久化节点，禁止编辑副本。 */
export interface FlattenedPageMenuNode {
  node: PageMenuNode
  depth: number
}

/** 菜单文案为空或仍是旧版自动占位名时保持空，避免画布出现“模块1/菜单1”。 */
export const normalizePageMenuLabel = (value: unknown): string => {
  if (value == null) return ''
  const label = String(value)
  return /^(模块|菜单)\s*\d+$/.test(label.trim()) ? '' : label
}

/** 页面菜单最多支持三级，固定上限使编辑器和运行时均可用线性遍历处理。 */
export const PAGE_MENU_MAX_DEPTH = 3

/**
 * 创建稳定且无需全局状态的菜单节点。
 *
 * 随机后缀只用于同一次编辑中的 Vue key 与面板选中态；场景保存后会跟随配置持久化，
 * 不会在每次渲染时重新生成而造成菜单节点重挂载。
 */
export const createPageMenuNode = (depth: number, index: number): PageMenuNode => ({
  id: `page-menu-${Date.now()}-${depth}-${index}-${Math.random().toString(36).slice(2, 8)}`,
  label: '',
  pageUrl: '',
  openInNewWindow: false,
  visible: true,
  children: [],
})

/**
 * 将菜单树压平成面板可直接渲染的列表。
 *
 * 遍历只访问一次每个节点，时间复杂度为 O(n)。同时限制深度并忽略异常 children，
 * 让旧场景或手工编辑的错误数据不能突破三级菜单约束。
 */
export const flattenPageMenuTree = (nodes: PageMenuNode[]): FlattenedPageMenuNode[] => {
  const flattened: FlattenedPageMenuNode[] = []
  const stack: Array<{ node: PageMenuNode; depth: number }> = []

  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    stack.push({ node: nodes[index], depth: 1 })
  }

  while (stack.length) {
    const current = stack.pop()
    if (!current || current.depth > PAGE_MENU_MAX_DEPTH) continue

    // 返回真实节点引用，右侧复选框与输入框的修改才能直接进入场景持久化 option。
    flattened.push({ node: current.node, depth: current.depth })
    const children = Array.isArray(current.node.children) ? current.node.children : []
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: children[index], depth: current.depth + 1 })
    }
  }

  return flattened
}

/**
 * 按节点 ID 查找原始节点及其父级数组。
 *
 * 面板删除和新增子级都需要直接修改原始配置树。返回数组引用可避免“先深拷贝再回写”
 * 造成大菜单编辑时的额外分配，也能保持 Vue 对嵌套 option 的响应式追踪。
 */
export const findPageMenuNode = (
  nodes: PageMenuNode[],
  id: string,
): { node: PageMenuNode; parent: PageMenuNode[]; depth: number } | null => {
  const stack: Array<{ node: PageMenuNode; parent: PageMenuNode[]; depth: number }> = []

  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    stack.push({ node: nodes[index], parent: nodes, depth: 1 })
  }

  while (stack.length) {
    const current = stack.pop()
    if (!current || current.depth > PAGE_MENU_MAX_DEPTH) continue
    if (current.node.id === id) return current

    const children = Array.isArray(current.node.children) ? current.node.children : []
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: children[index], parent: children, depth: current.depth + 1 })
    }
  }

  return null
}

/**
 * 仅返回当前节点和所有祖先都启用后的菜单树。
 *
 * 每个运行时组件实例只在 `menus` 变动时计算一次，模板不再为每一层重复做可见性判断；
 * 使用新数组承载结果，绝不修改持久化配置，避免预览渲染反向污染编辑器数据。
 */
export const getVisiblePageMenuTree = (nodes: PageMenuNode[], depth = 1): PageMenuNode[] => {
  if (depth > PAGE_MENU_MAX_DEPTH || !Array.isArray(nodes)) return []

  return nodes.reduce<PageMenuNode[]>((visibleNodes, node) => {
    if (!node || node.visible === false) return visibleNodes

    visibleNodes.push({
      ...node,
      children: getVisiblePageMenuTree(
        Array.isArray(node.children) ? node.children : [],
        depth + 1,
      ),
    })
    return visibleNodes
  }, [])
}
