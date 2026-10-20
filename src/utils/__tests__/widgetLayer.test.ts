import { describe, expect, it } from 'vitest'
import type { WidgetLayerNode } from '@/types/threeScene'
import {
  appendEmptyWidgetGroup,
  appendWidgetLayerNode,
  buildWidgetLayerZIndexMap,
  buildWidgetGroupParentIndex,
  buildWidgetParentGroupIndex,
  createWidgetGroupLayerTree,
  createWidgetGroupLayerTreeFromGroups,
  createWidgetGroupLayerTreeFromMixedSelection,
  deleteWidgetGroupLayerTree,
  flattenWidgetLayerTree,
  areWidgetLayerSelectionsInSameParent,
  moveWidgetLayerItem,
  moveWidgetGroupIntoGroup,
  normalizeWidgetLayerTree,
  preserveWidgetLayerRuntimeState,
} from '@/utils/widgetLayer'

const createTree = (): WidgetLayerNode[] => [
  { id: 'widget-a', type: 'widget' },
  {
    id: 'group-1',
    type: 'group',
    name: '分组1',
    visible: true,
    locked: false,
    children: ['widget-b', 'widget-c'],
  },
  { id: 'widget-d', type: 'widget' },
]

describe('二维组件视觉分组', () => {
  it('结构树中越靠下的节点应获得越高的画布层级', () => {
    /**
     * 结构面板使用“背景在上、前景在下”的图层语义。
     * 分组只改变管理结构，但拍平后的显式层级必须保留这一视觉约定。
     */
    const zIndexMap = buildWidgetLayerZIndexMap(createTree())

    expect(zIndexMap['widget-a']).toBeLessThan(zIndexMap['widget-b'])
    expect(zIndexMap['widget-b']).toBeLessThan(zIndexMap['widget-c'])
    expect(zIndexMap['widget-c']).toBeLessThan(zIndexMap['widget-d'])
  })

  it('新增组件应同时出现在结构树底部和画布最前方', () => {
    const nextTree = appendWidgetLayerNode(createTree(), 'widget-new')
    const zIndexMap = buildWidgetLayerZIndexMap(nextTree)

    expect(flattenWidgetLayerTree(nextTree).at(-1)).toBe('widget-new')
    expect(zIndexMap['widget-new']).toBeGreaterThan(zIndexMap['widget-a'])
  })

  it('归一化时保留空分组，并为旧数据补齐显隐和锁定默认值', () => {
    const normalized = normalizeWidgetLayerTree(
      [{ id: 'empty-group', type: 'group', name: '空分组', children: [] }],
      ['widget-a'],
    )

    expect(normalized).toEqual([
      {
        id: 'empty-group',
        type: 'group',
        name: '空分组',
        visible: true,
        locked: false,
        children: [],
      },
      { id: 'widget-a', type: 'widget' },
    ])
  })

  it('追加发布组件时保留已切页分组的运行态显隐', () => {
    const publishedTree: WidgetLayerNode[] = [
      {
        id: 'group-home',
        type: 'group',
        name: '首页',
        visible: true,
        locked: false,
        children: ['widget-home', 'widget-new'],
      },
      {
        id: 'group-planting',
        type: 'group',
        name: '种植管理',
        visible: false,
        locked: false,
        children: ['widget-planting'],
      },
    ]
    const currentTree: WidgetLayerNode[] = [
      {
        id: 'group-home',
        type: 'group',
        name: '首页',
        visible: false,
        locked: false,
        children: ['widget-home'],
      },
    ]

    expect(preserveWidgetLayerRuntimeState(publishedTree, currentTree)).toEqual([
      {
        ...publishedTree[0],
        visible: false,
      },
      publishedTree[1],
    ])
  })

  it('支持先创建空分组，再把根级组件拖入并保持唯一归属', () => {
    const treeWithEmptyGroup = appendEmptyWidgetGroup(createTree(), 'group-2', '分组2')
    const movedTree = moveWidgetLayerItem(treeWithEmptyGroup, 'widget-a', 'group-2', 0)

    expect(buildWidgetParentGroupIndex(movedTree).get('widget-a')).toBe('group-2')
    expect(flattenWidgetLayerTree(movedTree)).toEqual([
      'widget-b',
      'widget-c',
      'widget-d',
      'widget-a',
    ])
    expect(
      movedTree.filter((node) => node.type === 'widget' && node.id === 'widget-a'),
    ).toHaveLength(0)
  })

  it('支持跨组和拖回根级，原分组失去最后成员后仍保留', () => {
    const movedToNewGroup = moveWidgetLayerItem(
      appendEmptyWidgetGroup(createTree(), 'group-2', '分组2'),
      'widget-b',
      'group-2',
    )
    const movedAgain = moveWidgetLayerItem(movedToNewGroup, 'widget-c', 'group-2')
    const movedToRoot = moveWidgetLayerItem(movedAgain, 'widget-b', null, 0)

    const originalGroup = movedToRoot.find((node) => node.type === 'group' && node.id === 'group-1')
    expect(originalGroup?.children).toEqual([])
    expect(flattenWidgetLayerTree(movedToRoot)).toEqual([
      'widget-b',
      'widget-a',
      'widget-d',
      'widget-c',
    ])
  })

  it('删除分组只释放成员，并保持组内顺序和组件数据不变', () => {
    const { nextTree, widgetIds } = deleteWidgetGroupLayerTree(createTree(), 'group-1')

    expect(widgetIds).toEqual(['widget-b', 'widget-c'])
    expect(nextTree).toEqual([
      { id: 'widget-a', type: 'widget' },
      { id: 'widget-b', type: 'widget' },
      { id: 'widget-c', type: 'widget' },
      { id: 'widget-d', type: 'widget' },
    ])
  })

  it('从已有分组的部分成员创建新分组时不会丢失未选成员', () => {
    const nextTree = createWidgetGroupLayerTree(createTree(), 'group-2', '分组2', [
      'widget-c',
      'widget-b',
    ])

    expect(nextTree).toEqual([
      { id: 'widget-a', type: 'widget' },
      {
        id: 'group-1',
        type: 'group',
        name: '分组1',
        visible: true,
        locked: false,
        children: [],
        childGroupIds: ['group-2'],
      },
      { id: 'widget-d', type: 'widget' },
      { id: 'group-2', type: 'group', name: '分组2', children: ['widget-b', 'widget-c'] },
    ])
    expect(buildWidgetGroupParentIndex(nextTree).get('group-2')).toBe('group-1')
    expect(flattenWidgetLayerTree(nextTree)).toEqual([
      'widget-a',
      'widget-b',
      'widget-c',
      'widget-d',
    ])
  })

  it('把已有分组放进新父组时保留旧组结构和成员', () => {
    const sourceTree: WidgetLayerNode[] = [
      { id: 'group-left', type: 'group', name: '左侧数据看板', children: ['widget-a'] },
      { id: 'widget-gap', type: 'widget' },
      { id: 'group-bottom', type: 'group', name: '底部数据面板', children: ['widget-b'] },
    ]

    const nextTree = createWidgetGroupLayerTreeFromGroups(sourceTree, 'group-parent', '分组1', [
      'group-left',
      'group-bottom',
    ])

    expect(nextTree).toEqual([
      {
        id: 'group-parent',
        type: 'group',
        name: '分组1',
        children: [],
        childGroupIds: ['group-left', 'group-bottom'],
      },
      { id: 'group-left', type: 'group', name: '左侧数据看板', children: ['widget-a'] },
      { id: 'widget-gap', type: 'widget' },
      { id: 'group-bottom', type: 'group', name: '底部数据面板', children: ['widget-b'] },
    ])
    expect(flattenWidgetLayerTree(nextTree)).toEqual(['widget-a', 'widget-b', 'widget-gap'])

    const { nextTree: restoredTree } = deleteWidgetGroupLayerTree(nextTree, 'group-parent')
    expect(restoredTree).toEqual(sourceTree)
  })

  it('把根级分组放到目标组的第一个子分组，并拒绝形成循环', () => {
    const sourceTree: WidgetLayerNode[] = [
      { id: 'button', type: 'group', name: '按钮触发', children: ['button-widget'] },
      {
        id: 'showroom',
        type: 'group',
        name: '孪生展厅UI_全局沙盘',
        children: [],
        childGroupIds: ['center'],
      },
      { id: 'center', type: 'group', name: '中央介绍面板', children: ['center-widget'] },
    ]

    const movedTree = moveWidgetGroupIntoGroup(sourceTree, 'button', 'showroom', 0)
    const showroom = movedTree.find((node) => node.id === 'showroom')
    expect(showroom?.type === 'group' ? showroom.childGroupIds : undefined).toEqual([
      'button',
      'center',
    ])
    expect(buildWidgetGroupParentIndex(movedTree).get('button')).toBe('showroom')
    expect(flattenWidgetLayerTree(movedTree)).toEqual(['button-widget', 'center-widget'])
    expect(moveWidgetGroupIntoGroup(movedTree, 'showroom', 'button')).toBe(movedTree)
    expect(moveWidgetGroupIntoGroup(movedTree, 'showroom', 'showroom')).toBe(movedTree)
  })

  it('把同层级分组和普通组件一次混合收纳到新父组', () => {
    const sourceTree: WidgetLayerNode[] = [
      { id: 'group-left', type: 'group', name: '左侧数据看板', children: ['widget-left'] },
      { id: 'group-bottom', type: 'group', name: '底部数据面板', children: ['widget-bottom'] },
      { id: 'widget-overview', type: 'widget' },
      { id: 'widget-environment', type: 'widget' },
      { id: 'widget-sibling', type: 'widget' },
    ]

    expect(
      areWidgetLayerSelectionsInSameParent(
        sourceTree,
        ['widget-overview', 'widget-environment'],
        ['group-left', 'group-bottom'],
      ),
    ).toBe(true)

    const nextTree = createWidgetGroupLayerTreeFromMixedSelection(
      sourceTree,
      'group-parent',
      '分组1',
      ['widget-overview', 'widget-environment'],
      ['group-left', 'group-bottom'],
    )

    expect(nextTree).toEqual([
      {
        id: 'group-parent',
        type: 'group',
        name: '分组1',
        children: ['widget-overview', 'widget-environment'],
        childGroupIds: ['group-left', 'group-bottom'],
      },
      { id: 'group-left', type: 'group', name: '左侧数据看板', children: ['widget-left'] },
      { id: 'group-bottom', type: 'group', name: '底部数据面板', children: ['widget-bottom'] },
      { id: 'widget-sibling', type: 'widget' },
    ])
    expect(flattenWidgetLayerTree(nextTree)).toEqual([
      'widget-overview',
      'widget-environment',
      'widget-left',
      'widget-bottom',
      'widget-sibling',
    ])
  })
})
