import { describe, expect, it } from 'vitest'
import {
  findPageMenuNode,
  flattenPageMenuTree,
  getVisiblePageMenuTree,
  type PageMenuNode,
} from '../menuTree'

/** 构造测试树时统一补齐菜单必填字段，使断言只关注层级与可见性行为。 */
const createNode = (id: string, visible = true, children: PageMenuNode[] = []): PageMenuNode => ({
  id,
  label: id,
  pageUrl: `/${id}`,
  visible,
  children,
})

describe('页面菜单树', () => {
  it('按显示顺序压平三级节点并保留原始节点引用', () => {
    const third = createNode('third')
    const second = createNode('second', true, [third])
    const first = createNode('first', true, [second])

    const flattened = flattenPageMenuTree([first])

    expect(flattened.map((item) => [item.node.id, item.depth])).toEqual([
      ['first', 1],
      ['second', 2],
      ['third', 3],
    ])
    expect(flattened[1].node).toBe(second)
  })

  it('忽略第四级异常数据，保持组件的三级菜单上限', () => {
    const fourth = createNode('fourth')
    const tree = [
      createNode('first', true, [
        createNode('second', true, [createNode('third', true, [fourth])]),
      ]),
    ]

    expect(flattenPageMenuTree(tree).map((item) => item.node.id)).toEqual([
      'first',
      'second',
      'third',
    ])
    expect(findPageMenuNode(tree, 'fourth')).toBeNull()
  })

  it('父级未勾选时隐藏整个页面分支且不修改原始配置', () => {
    const hiddenChild = createNode('hidden-child')
    const hiddenRoot = createNode('hidden-root', false, [hiddenChild])
    const visibleRoot = createNode('visible-root')

    const visibleTree = getVisiblePageMenuTree([hiddenRoot, visibleRoot])

    expect(visibleTree.map((item) => item.id)).toEqual(['visible-root'])
    expect(hiddenRoot.children).toEqual([hiddenChild])
  })

  it('查找节点时返回真实父数组，支持面板原地删除当前分支', () => {
    const child = createNode('child')
    const root = createNode('root', true, [child])
    const result = findPageMenuNode([root], 'child')

    expect(result?.node).toBe(child)
    expect(result?.parent).toBe(root.children)
    expect(result?.depth).toBe(2)
  })
})
