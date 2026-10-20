import { describe, expect, it } from 'vitest'
import {
  buildWidgetChildrenIndex,
  collectWidgetAncestorIds,
  collectWidgetDescendantIds,
  compactWidgetHierarchySelection,
  normalizeWidgetHierarchy,
  orderWidgetIdsByHierarchy,
} from '../widgetHierarchy'

describe('二维组件父子关系', () => {
  it('清理不存在的父级、自引用和循环引用', () => {
    const normalized = normalizeWidgetHierarchy([
      { id: 'root' },
      { id: 'child', parentId: 'root' },
      { id: 'missing', parentId: 'not-exists' },
      { id: 'self', parentId: 'self' },
      { id: 'cycle-a', parentId: 'cycle-b' },
      { id: 'cycle-b', parentId: 'cycle-a' },
    ])

    expect(normalized).toEqual([
      { id: 'root' },
      { id: 'child', parentId: 'root' },
      { id: 'missing' },
      { id: 'self' },
      { id: 'cycle-a' },
      { id: 'cycle-b' },
    ])
  })

  it('建立祖先和后代索引，并压缩同时选中的父子节点', () => {
    const widgets = [
      { id: 'root' },
      { id: 'child', parentId: 'root' },
      { id: 'grandchild', parentId: 'child' },
      { id: 'sibling', parentId: 'root' },
    ]
    const childrenIndex = buildWidgetChildrenIndex(widgets)
    const parentIndex = new Map(
      widgets.filter((item) => item.parentId).map((item) => [item.id, item.parentId!]),
    )

    expect(collectWidgetDescendantIds('root', childrenIndex)).toEqual([
      'child',
      'grandchild',
      'sibling',
    ])
    expect(collectWidgetAncestorIds('grandchild', parentIndex)).toEqual(['child', 'root'])
    expect(compactWidgetHierarchySelection(['root', 'child', 'sibling'], parentIndex)).toEqual([
      'root',
    ])
  })

  it('无论原图层节点是否连续，都按父在前、子在后生成最终渲染顺序', () => {
    const widgets = [
      { id: 'parent' },
      { id: 'child', parentId: 'parent' },
      { id: 'grandchild', parentId: 'child' },
      { id: 'sibling' },
    ]

    expect(
      orderWidgetIdsByHierarchy(['parent', 'sibling', 'grandchild', 'child'], widgets),
    ).toEqual(['parent', 'child', 'grandchild', 'sibling'])
  })
})
