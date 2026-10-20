import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { computed, nextTick } from 'vue'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import { useSceneWidgetStore, type WidgetConfig } from '@/stores/sceneEditStore'
import { setWidgetCommandPort } from '@/integrations/scene/widgetRuntime/ports'
import type WidgetCommand from '@/integrations/scene/widgetRuntime/widgetCommand'
import type { InteractionEvent, WidgetLayerNode } from '@/types/threeScene'
import PageFrameConfig from '@/packages/components/Widget/VPageMenu/config'
import { createPageFrameMenuChild } from '@/packages/components/Widget/VPageMenu/pageFrameTypes'
import {
  getSelectedWidgetEventTarget,
  getWidgetInteractiveEventList,
  setWidgetInteractiveEventList,
} from '@/integrations/scene/widgetPanels'

vi.hoisted(() => {
  const storage = {
    clear: () => undefined,
    getItem: () => null,
    key: () => null,
    removeItem: () => undefined,
    setItem: () => undefined,
    get length() {
      return 0
    },
  }
  Object.assign(globalThis, { localStorage: storage, sessionStorage: storage })
})

const createWidget = (id: string, zIndex: number, option: Record<string, unknown> = {}) =>
  ({
    id,
    component: {
      attr: { l: 10, t: 20, w: 100, h: 60, zIndex },
      info: { name: id, keyName: 'TestWidget', packageName: 'Widget', icon: '' },
      option,
      styles: { animations: [] },
      dataConfig: undefined,
      statusList: [],
      interactiveEvent: [],
    } as unknown as BaseWidgetConfig,
  }) as WidgetConfig

/** 把 Pinia 响应式代理转换为稳定的普通对象快照，供撤销前后做精确顺序断言。 */
const snapshotWidgetLayerTree = (tree: WidgetLayerNode[]) =>
  tree.map((node) =>
    node.type === 'group'
      ? {
          id: node.id,
          type: node.type,
          name: node.name,
          children: [...node.children],
          ...(node.childGroupIds?.length ? { childGroupIds: [...node.childGroupIds] } : {}),
        }
      : { id: node.id, type: node.type },
  )

describe('二维组件视觉分组仓库', () => {
  let commands: WidgetCommand[]

  beforeEach(() => {
    setActivePinia(createPinia())
    commands = []
    setWidgetCommandPort({
      executeWidgetCommand: (command) => commands.push(command),
      isApplyingWidgetHistory: () => false,
    })
  })

  it('页面框架父子配置通过单个 Widget 快照完整撤销和重做', () => {
    const store = useSceneWidgetStore()
    const component = new PageFrameConfig()
    const widget = { id: 'page-frame', component } as WidgetConfig
    store.totalWidgets = [widget]
    store.setWidgetLayerTree([{ id: widget.id, type: 'widget' }])
    const originalCount = component.option.menuChildren.length

    store.runWidgetHistoryChange('新增页面框架菜单', [widget.id], () => {
      component.option.title.text = '修改后的标题'
      component.option.menuChildren.push(createPageFrameMenuChild(originalCount, 'left'))
    })

    expect(commands).toHaveLength(1)
    expect(component.option.menuChildren).toHaveLength(originalCount + 1)
    commands[0].undo()
    expect(store.getWidgetById(widget.id)?.component.option).toMatchObject({
      title: { text: '数字孪生平台' },
      menuChildren: expect.any(Array),
    })
    expect(
      (store.getWidgetById(widget.id)?.component.option as PageFrameConfig['option']).menuChildren,
    ).toHaveLength(originalCount)
    commands[0].redo()
    const restored = store.getWidgetById(widget.id)?.component.option as PageFrameConfig['option']
    expect(restored.title.text).toBe('修改后的标题')
    expect(restored.menuChildren).toHaveLength(originalCount + 1)
  })

  it('页面框架子项事件独立写入并进入统一二维撤销历史', () => {
    const store = useSceneWidgetStore()
    const component = new PageFrameConfig()
    const widget = { id: 'page-frame', component } as WidgetConfig
    const eventList = [{ id: 'weather-click' }] as InteractionEvent[]
    store.totalWidgets = [widget]
    store.setWidgetLayerTree([{ id: widget.id, type: 'widget' }])
    store.setCurrentWidgetChildSelection({
      frameId: widget.id,
      childId: component.option.weather.id,
    })

    expect(getSelectedWidgetEventTarget()).toMatchObject({
      id: widget.id,
      childId: component.option.weather.id,
    })
    setWidgetInteractiveEventList(widget.id, eventList, component.option.weather.id)

    expect(getWidgetInteractiveEventList(widget.id, component.option.weather.id)).toEqual(eventList)
    expect(component.interactiveEvent).toEqual([])
    expect(commands).toHaveLength(1)

    commands[0].undo()
    expect(
      (store.getWidgetById(widget.id)?.component.option as PageFrameConfig['option']).weather
        .interactiveEvent,
    ).toEqual([])
  })

  it('复制部件会深复制配置、保留父分组并插入原节点下方', () => {
    const store = useSceneWidgetStore()
    const source = createWidget('widget-source', 0, {
      label: '原组件',
      nested: { value: 1 },
    })
    const sibling = createWidget('widget-sibling', 1)
    store.totalWidgets = [source, sibling]
    store.setWidgetLayerTree([
      {
        id: 'group-1',
        type: 'group',
        name: '分组1',
        children: ['widget-sibling', 'widget-source'],
      },
    ])
    store.setCurrentWidgetsIds(['widget-source'])

    const duplicatedIds = store.duplicateWidgets()
    expect(duplicatedIds).toHaveLength(1)
    const duplicate = store.getWidgetById(duplicatedIds[0])
    expect(duplicate).toBeTruthy()
    expect(duplicate?.component.option).toEqual(source.component.option)
    expect(duplicate?.component.option).not.toBe(source.component.option)
    expect(store.widgetLayerTree[0]).toMatchObject({
      type: 'group',
      children: ['widget-sibling', 'widget-source', duplicatedIds[0]],
    })
    expect(store.currentWidgetsIds).toEqual(duplicatedIds)
    expect(commands).toHaveLength(1)

    commands[0].undo()
    expect(store.getWidgetById(duplicatedIds[0])).toBeNull()
    expect(store.widgetLayerTree[0]).toMatchObject({
      type: 'group',
      children: ['widget-sibling', 'widget-source'],
    })
    commands[0].redo()
    expect(store.getWidgetById(duplicatedIds[0])).toBeTruthy()
  })

  it('复制父组件会递归复制完整子树并重建副本父子关系', () => {
    const store = useSceneWidgetStore()
    const parent = createWidget('widget-parent', 0, { label: '父组件' })
    const child = { ...createWidget('widget-child', 1, { label: '子组件' }), parentId: parent.id }
    const grandchild = {
      ...createWidget('widget-grandchild', 2, { label: '孙组件' }),
      parentId: child.id,
    }
    const sibling = createWidget('widget-sibling', 3, { label: '同级组件' })
    store.totalWidgets = [parent, child, grandchild, sibling]
    store.setWidgetLayerTree([
      {
        id: 'group-1',
        type: 'group',
        name: '分组1',
        children: [parent.id, child.id, grandchild.id, sibling.id],
      },
    ])
    store.setCurrentWidgetsIds([parent.id])

    const duplicatedIds = store.duplicateWidgets()
    expect(duplicatedIds).toHaveLength(3)

    const [duplicatedParentId, duplicatedChildId, duplicatedGrandchildId] = duplicatedIds
    const duplicatedParent = store.getWidgetById(duplicatedParentId)
    const duplicatedChild = store.getWidgetById(duplicatedChildId)
    const duplicatedGrandchild = store.getWidgetById(duplicatedGrandchildId)
    expect(duplicatedParent?.parentId).toBeUndefined()
    expect(duplicatedChild?.parentId).toBe(duplicatedParentId)
    expect(duplicatedGrandchild?.parentId).toBe(duplicatedChildId)
    expect(duplicatedParent?.component.option).toEqual(parent.component.option)
    expect(duplicatedChild?.component.option).toEqual(child.component.option)
    expect(duplicatedGrandchild?.component.option).toEqual(grandchild.component.option)
    expect(duplicatedParent?.component.option).not.toBe(parent.component.option)
    expect(duplicatedChild?.component.option).not.toBe(child.component.option)
    expect(duplicatedGrandchild?.component.option).not.toBe(grandchild.component.option)
    expect(store.getWidgetParentId(duplicatedChildId)).toBe(duplicatedParentId)
    expect(store.getWidgetParentId(duplicatedGrandchildId)).toBe(duplicatedChildId)
    expect(store.getOrderedWidgets().map((widget) => widget.id)).toEqual([
      parent.id,
      child.id,
      grandchild.id,
      duplicatedParentId,
      duplicatedChildId,
      duplicatedGrandchildId,
      sibling.id,
    ])
    expect(store.currentWidgetsIds).toEqual(duplicatedIds)
    expect(commands).toHaveLength(1)

    commands[0].undo()
    expect(store.getWidgetById(duplicatedParentId)).toBeNull()
    expect(store.getWidgetById(duplicatedChildId)).toBeNull()
    expect(store.getWidgetById(duplicatedGrandchildId)).toBeNull()
    expect(store.getWidgetParentId(child.id)).toBe(parent.id)
    expect(store.getWidgetParentId(grandchild.id)).toBe(child.id)

    commands[0].redo()
    expect(store.getWidgetParentId(duplicatedChildId)).toBe(duplicatedParentId)
    expect(store.getWidgetParentId(duplicatedGrandchildId)).toBe(duplicatedChildId)
  })

  it('创建分组会把多个选中父组件的完整子树一起收纳，并可撤销恢复', () => {
    const store = useSceneWidgetStore()
    const parentA = createWidget('parent-a', 0)
    const childA = { ...createWidget('child-a', 1), parentId: parentA.id }
    const parentB = createWidget('parent-b', 2)
    const childB = { ...createWidget('child-b', 3), parentId: parentB.id }
    const sibling = createWidget('sibling', 4)
    store.totalWidgets = [parentA, childA, parentB, childB, sibling]
    store.setWidgetLayerTree([
      { id: parentA.id, type: 'widget' },
      { id: childA.id, type: 'widget' },
      { id: parentB.id, type: 'widget' },
      { id: childB.id, type: 'widget' },
      { id: sibling.id, type: 'widget' },
    ])
    store.setCurrentWidgetsIds([parentA.id, parentB.id])

    expect(store.canCreateWidgetGroup(store.currentWidgetsIds || [])).toBe(true)
    const groupId = store.createWidgetGroup(store.currentWidgetsIds || [])
    expect(groupId).toBeTruthy()
    expect(store.getWidgetGroupMemberIds([parentA.id, parentB.id])).toEqual([
      parentA.id,
      childA.id,
      parentB.id,
      childB.id,
    ])
    expect(store.widgetLayerTree).toEqual([
      {
        id: groupId,
        type: 'group',
        name: '分组1',
        children: [parentA.id, childA.id, parentB.id, childB.id],
      },
      { id: sibling.id, type: 'widget' },
    ])
    expect(store.currentWidgetsIds).toBeNull()
    expect(store.currentWidgetGroupId).toBe(groupId)
    expect(commands).toHaveLength(1)

    commands[0].undo()
    expect(store.widgetLayerTree).toEqual([
      { id: parentA.id, type: 'widget' },
      { id: childA.id, type: 'widget' },
      { id: parentB.id, type: 'widget' },
      { id: childB.id, type: 'widget' },
      { id: sibling.id, type: 'widget' },
    ])
    commands[0].redo()
    expect(
      store.widgetLayerTree.find((node) => node.type === 'group' && node.id === groupId),
    ).toMatchObject({ children: [parentA.id, childA.id, parentB.id, childB.id] })
  })

  it('组内父组件再次分组时保留原分组，并让完整子树显示在嵌套新组中', () => {
    const store = useSceneWidgetStore()
    const overview = createWidget('overview', 0)
    const altitude = { ...createWidget('altitude', 1), parentId: overview.id }
    const altitudeChild = { ...createWidget('altitude-child', 2), parentId: altitude.id }
    const magnetic = { ...createWidget('magnetic', 3), parentId: overview.id }
    store.totalWidgets = [overview, altitude, altitudeChild, magnetic]
    store.setWidgetLayerTree([
      {
        id: 'overview-group',
        type: 'group',
        name: '基地概览',
        children: [overview.id, altitude.id, altitudeChild.id, magnetic.id],
      },
    ])

    const groupId = store.createWidgetGroup([altitude.id, magnetic.id])
    expect(groupId).toBeTruthy()
    expect(store.widgetLayerTree).toEqual([
      {
        id: 'overview-group',
        type: 'group',
        name: '基地概览',
        visible: true,
        locked: false,
        children: [overview.id],
        childGroupIds: [groupId],
      },
      {
        id: groupId,
        type: 'group',
        name: '分组1',
        children: [altitude.id, altitudeChild.id, magnetic.id],
      },
    ])
    // 视觉分组只改变结构树归属，不破坏组件原有 parentId 层级。
    expect(store.getWidgetParentId(altitude.id)).toBe(overview.id)
    expect(store.getWidgetParentId(magnetic.id)).toBe(overview.id)
    expect(store.getWidgetParentId(altitudeChild.id)).toBe(altitude.id)
    expect(store.getGroupWidgetIds('overview-group')).toEqual([
      overview.id,
      altitude.id,
      altitudeChild.id,
      magnetic.id,
    ])

    commands[0].undo()
    expect(store.getWidgetParentId(altitude.id)).toBe(overview.id)
    expect(store.getWidgetParentId(magnetic.id)).toBe(overview.id)
    expect(store.widgetLayerTree).toEqual([
      {
        id: 'overview-group',
        type: 'group',
        name: '基地概览',
        visible: true,
        locked: false,
        children: [overview.id, altitude.id, altitudeChild.id, magnetic.id],
      },
    ])
  })

  it('Ctrl 多选的已有分组创建父组时不拆旧组，并支持撤销恢复', () => {
    const store = useSceneWidgetStore()
    const left = createWidget('left', 0)
    const bottom = createWidget('bottom', 1)
    store.totalWidgets = [left, bottom]
    store.setWidgetLayerTree([
      { id: 'group-left', type: 'group', name: '左侧数据看板', children: [left.id] },
      { id: 'group-bottom', type: 'group', name: '底部数据面板', children: [bottom.id] },
    ])
    store.setCurrentWidgetGroupIds(['group-left', 'group-bottom'])

    expect(store.canCreateWidgetGroupFromGroups(store.currentWidgetGroupIds)).toBe(true)
    const groupId = store.createWidgetGroupFromGroups(store.currentWidgetGroupIds)
    expect(groupId).toBeTruthy()
    expect(store.widgetLayerTree).toEqual([
      {
        id: groupId,
        type: 'group',
        name: '分组1',
        children: [],
        childGroupIds: ['group-left', 'group-bottom'],
      },
      {
        id: 'group-left',
        type: 'group',
        name: '左侧数据看板',
        visible: true,
        locked: false,
        children: [left.id],
      },
      {
        id: 'group-bottom',
        type: 'group',
        name: '底部数据面板',
        visible: true,
        locked: false,
        children: [bottom.id],
      },
    ])
    expect(store.getGroupWidgetIds(groupId!)).toEqual([left.id, bottom.id])
    expect(store.currentWidgetGroupId).toBe(groupId)

    commands[0].undo()
    expect(store.widgetLayerTree).toEqual([
      {
        id: 'group-left',
        type: 'group',
        name: '左侧数据看板',
        visible: true,
        locked: false,
        children: [left.id],
      },
      {
        id: 'group-bottom',
        type: 'group',
        name: '底部数据面板',
        visible: true,
        locked: false,
        children: [bottom.id],
      },
    ])
  })

  it('混选已有分组和普通组件时一次创建父组，并在撤销后恢复混合选中态', () => {
    const store = useSceneWidgetStore()
    const left = createWidget('left', 0)
    const bottom = createWidget('bottom', 1)
    const overview = createWidget('overview', 2)
    const overviewChild = { ...createWidget('overview-child', 3), parentId: overview.id }
    const environment = createWidget('environment', 4)
    const sibling = createWidget('sibling', 5)
    store.totalWidgets = [left, bottom, overview, overviewChild, environment, sibling]
    store.setWidgetLayerTree([
      { id: 'group-left', type: 'group', name: '左侧数据看板', children: [left.id] },
      { id: 'group-bottom', type: 'group', name: '底部数据面板', children: [bottom.id] },
      { id: overview.id, type: 'widget' },
      { id: overviewChild.id, type: 'widget' },
      { id: environment.id, type: 'widget' },
      { id: sibling.id, type: 'widget' },
    ])
    store.setCurrentWidgetMixedSelection(
      [overview.id, environment.id],
      ['group-left', 'group-bottom'],
    )

    expect(store.currentWidgetsIds).toEqual([overview.id, environment.id])
    expect(store.currentWidgetGroupIds).toEqual(['group-left', 'group-bottom'])
    expect(store.currentWidgetGroupId).toBeNull()
    expect(
      store.canCreateWidgetGroupFromMixedSelection(
        store.currentWidgetsIds || [],
        store.currentWidgetGroupIds,
      ),
    ).toBe(true)

    const groupId = store.createWidgetGroupFromMixedSelection(
      store.currentWidgetsIds || [],
      store.currentWidgetGroupIds,
    )
    expect(groupId).toBeTruthy()
    expect(store.widgetLayerTree).toEqual([
      {
        id: groupId,
        type: 'group',
        name: '分组1',
        children: [overview.id, overviewChild.id, environment.id],
        childGroupIds: ['group-left', 'group-bottom'],
      },
      {
        id: 'group-left',
        type: 'group',
        name: '左侧数据看板',
        visible: true,
        locked: false,
        children: [left.id],
      },
      {
        id: 'group-bottom',
        type: 'group',
        name: '底部数据面板',
        visible: true,
        locked: false,
        children: [bottom.id],
      },
      { id: sibling.id, type: 'widget' },
    ])
    expect(store.getGroupWidgetIds(groupId!)).toEqual([
      overview.id,
      overviewChild.id,
      environment.id,
      left.id,
      bottom.id,
    ])
    expect(store.getWidgetParentId(overviewChild.id)).toBe(overview.id)
    expect(store.currentWidgetGroupId).toBe(groupId)
    expect(commands).toHaveLength(1)

    commands[0].undo()
    expect(store.currentWidgetsIds).toEqual([overview.id, environment.id])
    expect(store.currentWidgetGroupIds).toEqual(['group-left', 'group-bottom'])
    expect(store.currentWidgetGroupId).toBeNull()
    expect(store.widgetLayerTree).toEqual([
      {
        id: 'group-left',
        type: 'group',
        name: '左侧数据看板',
        visible: true,
        locked: false,
        children: [left.id],
      },
      {
        id: 'group-bottom',
        type: 'group',
        name: '底部数据面板',
        visible: true,
        locked: false,
        children: [bottom.id],
      },
      { id: overview.id, type: 'widget' },
      { id: overviewChild.id, type: 'widget' },
      { id: environment.id, type: 'widget' },
      { id: sibling.id, type: 'widget' },
    ])
  })

  it('空组、拖入和删组分别只产生一条历史，并保持平铺组件配置', () => {
    const store = useSceneWidgetStore()
    const widgetA = createWidget('widget-a', 0)
    const widgetB = createWidget('widget-b', 1)
    store.totalWidgets = [widgetA, widgetB]
    store.setWidgetLayerTree([
      { id: 'widget-a', type: 'widget' },
      { id: 'widget-b', type: 'widget' },
    ])

    const groupId = store.createEmptyWidgetGroup()
    expect(commands).toHaveLength(1)
    expect(store.moveWidgetToGroup('widget-a', groupId)).toBe(true)
    expect(commands).toHaveLength(2)
    expect(store.getWidgetParentGroupId('widget-a')).toBe(groupId)
    expect(widgetA.component.attr).toMatchObject({ l: 10, t: 20, w: 100, h: 60 })
    /** 结构树越靠下层级越高；位于分组下方的 widget-a 应覆盖根级 widget-b。 */
    expect(widgetB.component.attr.zIndex).toBe(0)
    expect(widgetA.component.attr.zIndex).toBe(1)

    expect(store.deleteWidgetGroup(groupId)).toEqual(['widget-a'])
    expect(commands).toHaveLength(3)
    expect(store.getWidgetParentGroupId('widget-a')).toBeNull()
    expect(store.totalWidgets).toHaveLength(2)
    expect(store.getOrderedWidgets().map((widget) => widget.id)).toEqual(['widget-b', 'widget-a'])
  })

  it('删除组件后画布有序列表会在同一轮响应式更新中移除对应节点', async () => {
    const store = useSceneWidgetStore()
    store.totalWidgets = [createWidget('widget-a', 0), createWidget('widget-b', 1)]
    store.setWidgetLayerTree([
      { id: 'widget-a', type: 'widget' },
      { id: 'widget-b', type: 'widget' },
    ])

    store.setCurrentWidgetsIds(['widget-a'])
    /**
     * 完整复刻 LayerDOM 的订阅方式：渲染列表通过 storeToRefs 保留计算属性依赖，
     * 选中框再从同一有序列表过滤，保证删除后 DOM 和选中框同步失效且不重复排序。
     */
    const { orderedWidgets } = storeToRefs(store)
    const renderedWidgetIds = computed(() => orderedWidgets.value.map((item) => item.id))
    const activeWidgetIds = computed(() =>
      orderedWidgets.value
        .filter((item) => store.currentWidgetsIds?.includes(item.id))
        .map((item) => item.id),
    )
    expect(renderedWidgetIds.value).toEqual(['widget-a', 'widget-b'])
    expect(activeWidgetIds.value).toEqual(['widget-a'])

    store.deleteWidgets(['widget-a'])

    /** Pinia 计算状态在当前同步轮次即可反映删除，不需要等待其他交互触发刷新。 */
    expect(renderedWidgetIds.value).toEqual(['widget-b'])
    expect(activeWidgetIds.value).toEqual([])
    expect(store.currentWidgetsIds).toBeNull()
    await nextTick()

    expect(renderedWidgetIds.value).toEqual(['widget-b'])
    expect(activeWidgetIds.value).toEqual([])
  })

  it('组锁定和组显隐只参与有效状态计算，不覆盖成员原始状态', () => {
    const store = useSceneWidgetStore()
    const widgetA = createWidget('widget-a', 0, { visible: false, locked: true })
    store.totalWidgets = [widgetA]
    store.setWidgetLayerTree([
      {
        id: 'group-1',
        type: 'group',
        name: '分组1',
        visible: true,
        locked: false,
        children: ['widget-a'],
      },
    ])

    expect(store.isWidgetLocked('widget-a')).toBe(true)
    expect(store.isWidgetEffectivelyVisible('widget-a', false)).toBe(false)

    expect(store.setWidgetGroupLocked('group-1', true)).toBe(true)
    store.setGroupVisible('group-1', false)
    expect((widgetA.component.option as Record<string, unknown>).locked).toBe(true)
    expect((widgetA.component.option as Record<string, unknown>).visible).toBe(false)

    expect(store.setWidgetGroupLocked('group-1', false)).toBe(true)
    expect(store.isWidgetLocked('widget-a')).toBe(true)
    expect(store.getGroupVisible('group-1')).toBe(false)
  })

  it('组件、装饰、图标和图表切换自身显隐时只刷新对应画布缓存', () => {
    const store = useSceneWidgetStore()
    const widgetCases = [
      { id: 'component', packageName: 'Widget', keyName: 'TextCommon' },
      { id: 'decorate', packageName: 'Decorate', keyName: 'VDecoration01' },
      { id: 'icon', packageName: 'Widget', keyName: 'VIcon' },
      { id: 'chart', packageName: 'Chart', keyName: 'VBar' },
    ]
    const widgets = widgetCases.map(({ id, packageName, keyName }, index) => {
      const widget = createWidget(id, index, { visible: true })
      widget.component.info.packageName = packageName
      widget.component.info.keyName = keyName
      return widget
    })
    store.totalWidgets = widgets

    widgetCases.forEach(({ id }) => {
      expect(store.setWidgetVisible(id, false)).toBe(true)
      expect((store.getWidgetById(id)?.component.option as Record<string, unknown>).visible).toBe(
        false,
      )
      expect(store.widgetRenderVersionMap[id]).toBe(1)
    })

    /** 重复写入相同状态不得再次递增版本，避免无效开关事件造成组件重挂载。 */
    expect(store.setWidgetVisible('component', false)).toBe(true)
    expect(store.widgetRenderVersionMap.component).toBe(1)
  })

  it('根级、组内和跨组拖拽均只写一条历史，并精确恢复父级与顺序', () => {
    const store = useSceneWidgetStore()
    store.totalWidgets = [
      createWidget('widget-a', 0),
      createWidget('widget-b', 1),
      createWidget('widget-c', 2),
      createWidget('widget-d', 3),
    ]
    store.setWidgetLayerTree([
      { id: 'widget-c', type: 'widget' },
      { id: 'group-1', type: 'group', name: '分组1', children: ['widget-a', 'widget-b'] },
      { id: 'group-2', type: 'group', name: '分组2', children: ['widget-d'] },
    ])

    /** 组内 moved 直接由归属动作按最终索引重排，不再先写一次投影数组。 */
    expect(store.moveWidgetToGroup('widget-a', 'group-1', 1)).toBe(true)
    expect(commands).toHaveLength(1)
    const groupReorderedTree = snapshotWidgetLayerTree(store.widgetLayerTree)
    expect(groupReorderedTree).toEqual([
      { id: 'widget-c', type: 'widget' },
      { id: 'group-1', type: 'group', name: '分组1', children: ['widget-b', 'widget-a'] },
      { id: 'group-2', type: 'group', name: '分组2', children: ['widget-d'] },
    ])
    commands[0].undo()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual([
      { id: 'widget-c', type: 'widget' },
      { id: 'group-1', type: 'group', name: '分组1', children: ['widget-a', 'widget-b'] },
      { id: 'group-2', type: 'group', name: '分组2', children: ['widget-d'] },
    ])
    commands[0].redo()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual(groupReorderedTree)

    /** 跨组 added 只由目标组提交，撤销时同时恢复来源父级和两侧顺序。 */
    commands = []
    expect(store.moveWidgetToGroup('widget-a', 'group-2', 0)).toBe(true)
    expect(commands).toHaveLength(1)
    const crossGroupTree = snapshotWidgetLayerTree(store.widgetLayerTree)
    expect(crossGroupTree).toEqual([
      { id: 'widget-c', type: 'widget' },
      { id: 'group-1', type: 'group', name: '分组1', children: ['widget-b'] },
      { id: 'group-2', type: 'group', name: '分组2', children: ['widget-a', 'widget-d'] },
    ])
    commands[0].undo()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual(groupReorderedTree)
    commands[0].redo()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual(crossGroupTree)

    /** 组内成员拖回根级时，根列表 added 同样只产生一条可逆历史。 */
    commands = []
    expect(store.moveWidgetToGroup('widget-a', null, 1)).toBe(true)
    expect(commands).toHaveLength(1)
    const movedToRootTree = snapshotWidgetLayerTree(store.widgetLayerTree)
    expect(movedToRootTree).toEqual([
      { id: 'widget-c', type: 'widget' },
      { id: 'widget-a', type: 'widget' },
      { id: 'group-1', type: 'group', name: '分组1', children: ['widget-b'] },
      { id: 'group-2', type: 'group', name: '分组2', children: ['widget-d'] },
    ])
    commands[0].undo()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual(crossGroupTree)
    commands[0].redo()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual(movedToRootTree)

    /** 根级 moved 支持组件和分组节点，按最终 newIndex 一次写入完整树快照。 */
    commands = []
    expect(store.moveWidgetLayerNodeAtRoot('group-2', 0)).toBe(true)
    expect(commands).toHaveLength(1)
    const rootReorderedTree = snapshotWidgetLayerTree(store.widgetLayerTree)
    expect(rootReorderedTree).toEqual([
      { id: 'group-2', type: 'group', name: '分组2', children: ['widget-d'] },
      { id: 'widget-c', type: 'widget' },
      { id: 'widget-a', type: 'widget' },
      { id: 'group-1', type: 'group', name: '分组1', children: ['widget-b'] },
    ])
    commands[0].undo()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual(movedToRootTree)
    commands[0].redo()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual(rootReorderedTree)
  })

  it('把按钮触发组移为展厅组首个子组，并可撤销与重做', () => {
    const store = useSceneWidgetStore()
    store.totalWidgets = [createWidget('button-widget', 0), createWidget('center-widget', 1)]
    store.setWidgetLayerTree([
      { id: 'button', type: 'group', name: '按钮触发', children: ['button-widget'] },
      {
        id: 'showroom',
        type: 'group',
        name: '孪生展厅UI_全局沙盘',
        children: [],
        childGroupIds: ['center'],
      },
      { id: 'center', type: 'group', name: '中央介绍面板', children: ['center-widget'] },
    ])
    const before = snapshotWidgetLayerTree(store.widgetLayerTree)

    expect(store.moveWidgetGroupToGroup('button', 'showroom', 0)).toBe(true)
    expect(commands).toHaveLength(1)
    expect(store.getWidgetGroupParentGroupId('button')).toBe('showroom')
    expect(
      store.widgetLayerTree.find((node) => node.id === 'showroom' && node.type === 'group'),
    ).toMatchObject({ childGroupIds: ['button', 'center'] })
    expect(store.moveWidgetGroupToGroup('showroom', 'button')).toBe(false)

    const after = snapshotWidgetLayerTree(store.widgetLayerTree)
    commands[0].undo()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual(before)
    commands[0].redo()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual(after)
  })

  it('把单选或多选组件挂到另一组件下，并用一条历史恢复父子关系与图层顺序', () => {
    const store = useSceneWidgetStore()
    const widgetA = createWidget('widget-a', 3)
    const widgetB = createWidget('widget-b', 2)
    const widgetC = createWidget('widget-c', 1)
    const widgetD = createWidget('widget-d', 0)
    store.totalWidgets = [widgetA, widgetB, widgetC, widgetD]
    store.setWidgetLayerTree([
      { id: 'group-1', type: 'group', name: '分组1', children: ['widget-a', 'widget-b'] },
      { id: 'widget-c', type: 'widget' },
      { id: 'widget-d', type: 'widget' },
    ])

    expect(store.moveWidgetsUnderParent(['widget-a', 'widget-b'], 'widget-c')).toBe(true)
    expect(commands).toHaveLength(1)
    expect(store.getWidgetParentId('widget-a')).toBe('widget-c')
    expect(store.getWidgetParentId('widget-b')).toBe('widget-c')
    expect(store.getWidgetChildIds('widget-c')).toEqual(['widget-a', 'widget-b'])
    expect(widgetA.component.attr.zIndex).toBeGreaterThan(widgetC.component.attr.zIndex)
    expect(widgetB.component.attr.zIndex).toBeGreaterThan(widgetC.component.attr.zIndex)
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual([
      { id: 'group-1', type: 'group', name: '分组1', children: [] },
      { id: 'widget-c', type: 'widget' },
      { id: 'widget-a', type: 'widget' },
      { id: 'widget-b', type: 'widget' },
      { id: 'widget-d', type: 'widget' },
    ])
    ;(widgetC.component.option as Record<string, unknown>).visible = false
    expect(store.isWidgetEffectivelyVisible('widget-a', true)).toBe(false)
    ;(widgetC.component.option as Record<string, unknown>).visible = true
    ;(widgetC.component.option as Record<string, unknown>).locked = true
    expect(store.isWidgetLocked('widget-b')).toBe(true)

    commands[0].undo()
    expect(store.getWidgetParentId('widget-a')).toBeNull()
    expect(store.getWidgetParentId('widget-b')).toBeNull()
    expect(snapshotWidgetLayerTree(store.widgetLayerTree)).toEqual([
      {
        id: 'group-1',
        type: 'group',
        name: '分组1',
        children: ['widget-a', 'widget-b'],
      },
      { id: 'widget-c', type: 'widget' },
      { id: 'widget-d', type: 'widget' },
    ])

    commands[0].redo()
    /** 目标不能再挂到自己的后代下，避免形成无法渲染的循环结构。 */
    ;(store.getWidgetById('widget-c')!.component.option as Record<string, unknown>).locked = false
    expect(store.moveWidgetsUnderParent(['widget-c'], 'widget-a')).toBe(false)
    expect(commands).toHaveLength(1)
  })

  it('按虚线目标一次性插入单个或多个组件，并用一条历史保持原有相对顺序', () => {
    const store = useSceneWidgetStore()
    store.totalWidgets = [
      createWidget('widget-a', 0),
      createWidget('widget-b', 1),
      createWidget('widget-c', 2),
      createWidget('widget-d', 3),
    ]
    store.setWidgetLayerTree([
      { id: 'widget-a', type: 'widget' },
      { id: 'widget-b', type: 'widget' },
      { id: 'widget-c', type: 'widget' },
      { id: 'widget-d', type: 'widget' },
    ])

    expect(store.moveWidgetsAroundWidget(['widget-a'], 'widget-b', true)).toBe(true)
    expect(commands).toHaveLength(1)
    expect(store.getOrderedWidgets().map((widget) => widget.id)).toEqual([
      'widget-b',
      'widget-a',
      'widget-c',
      'widget-d',
    ])
    commands[0].undo()
    expect(store.getOrderedWidgets().map((widget) => widget.id)).toEqual([
      'widget-a',
      'widget-b',
      'widget-c',
      'widget-d',
    ])

    commands = []
    expect(store.moveWidgetsAroundWidget(['widget-b', 'widget-a'], 'widget-d', false)).toBe(true)
    expect(commands).toHaveLength(1)
    expect(store.getOrderedWidgets().map((widget) => widget.id)).toEqual([
      'widget-c',
      'widget-a',
      'widget-b',
      'widget-d',
    ])
  })

  it('子树拖到父节点后方时即使顺序不变也能脱离父级，并完整撤销重做', () => {
    const store = useSceneWidgetStore()
    store.totalWidgets = [
      createWidget('parent', 0),
      { ...createWidget('child', 1), parentId: 'parent' },
      { ...createWidget('grandchild', 2), parentId: 'child' },
    ]
    store.setWidgetLayerTree(store.totalWidgets.map(({ id }) => ({ id, type: 'widget' })))

    // 旧实现只比较扁平数组，漏掉“数组不变但父级已变”的有效移动。
    expect(store.moveWidgetsAroundWidget(['child'], 'parent', true)).toBe(true)
    expect(store.getWidgetParentId('child')).toBeNull()
    expect(store.getWidgetParentId('grandchild')).toBe('child')
    expect(commands).toHaveLength(1)
    commands[0].undo()
    expect(store.getWidgetParentId('child')).toBe('parent')
    commands[0].redo()
    expect(store.getWidgetParentId('child')).toBeNull()
    expect(store.getOrderedWidgets().map(({ id }) => id)).toEqual(['parent', 'child', 'grandchild'])
  })

  it('跨父级排序成为目标同级，并拒绝拖入自己的后代', () => {
    const store = useSceneWidgetStore()
    store.totalWidgets = [
      createWidget('first', 0),
      { ...createWidget('child', 1), parentId: 'first' },
      createWidget('second', 2),
      { ...createWidget('target', 3), parentId: 'second' },
    ]
    store.setWidgetLayerTree(store.totalWidgets.map(({ id }) => ({ id, type: 'widget' })))
    expect(store.moveWidgetsAroundWidget(['child'], 'target', false)).toBe(true)
    expect(store.getWidgetParentId('child')).toBe('second')
    expect(store.getOrderedWidgets().map(({ id }) => id)).toEqual([
      'first',
      'second',
      'child',
      'target',
    ])
    expect(store.moveWidgetsAroundWidget(['second'], 'child', true)).toBe(false)
    expect(commands).toHaveLength(1)
  })

  it('画布和左树都按从上到下层级递增，并强制整棵子树排在父组件之后', () => {
    const store = useSceneWidgetStore()
    const parent = createWidget('parent', 9)
    const child = { ...createWidget('child', 9), parentId: 'parent' }
    const grandchild = { ...createWidget('grandchild', 9), parentId: 'child' }
    const sibling = createWidget('sibling', 9)
    store.totalWidgets = [parent, child, grandchild, sibling]
    store.setWidgetLayerTree([
      {
        id: 'group-1',
        type: 'group',
        name: '分组1',
        children: ['parent', 'sibling', 'grandchild', 'child'],
      },
    ])

    expect(store.getOrderedWidgets().map((widget) => widget.id)).toEqual([
      'parent',
      'child',
      'grandchild',
      'sibling',
    ])
    expect(parent.component.attr.zIndex).toBe(0)
    expect(child.component.attr.zIndex).toBe(1)
    expect(grandchild.component.attr.zIndex).toBe(2)
    expect(sibling.component.attr.zIndex).toBe(3)
  })

  it('删除父组件时提升直属子组件，并可撤销恢复原父级', () => {
    const store = useSceneWidgetStore()
    const parent = createWidget('parent', 1)
    const child = { ...createWidget('child', 0), parentId: 'parent' }
    store.totalWidgets = [parent, child]
    store.setWidgetLayerTree([
      { id: 'parent', type: 'widget' },
      { id: 'child', type: 'widget' },
    ])

    store.deleteWidgets(['parent'])
    expect(store.getWidgetById('parent')).toBeNull()
    expect(store.getWidgetParentId('child')).toBeNull()
    expect(commands).toHaveLength(1)

    commands[0].undo()
    expect(store.getWidgetParentId('child')).toBe('parent')
  })

  it('分组代理移动仅改变成员坐标，并尊重组锁和成员锁', () => {
    const store = useSceneWidgetStore()
    const widgetA = createWidget('widget-a', 0)
    const widgetB = createWidget('widget-b', 1)
    widgetB.component.attr = { l: 140, t: 100, w: 80, h: 40, zIndex: 1 }
    store.totalWidgets = [widgetA, widgetB]
    store.setWidgetLayerTree([
      {
        id: 'group-1',
        type: 'group',
        name: '分组1',
        locked: false,
        children: ['widget-a', 'widget-b'],
      },
    ])

    expect(store.getGroupBounds('group-1', true)).toEqual({ l: 10, t: 20, w: 210, h: 120 })
    store.moveWidgetGroup('group-1', 20, -10)
    expect(widgetA.component.attr).toMatchObject({ l: 30, t: 10, w: 100, h: 60, zIndex: 0 })
    expect(widgetB.component.attr).toMatchObject({ l: 160, t: 90, w: 80, h: 40, zIndex: 1 })

    /** 成员自身锁定后，整组代理也不得绕过锁定继续移动。 */
    store.setWidgetLocked('widget-a', true)
    expect(store.isWidgetGroupTransformLocked('group-1')).toBe(true)
    store.moveWidgetGroup('group-1', 50, 50)
    expect(widgetA.component.attr).toMatchObject({ l: 30, t: 10 })
    expect(widgetB.component.attr).toMatchObject({ l: 160, t: 90 })
  })

  it('方向键按一个逻辑画布单位微调选中部件，并为每次按键建立独立历史', () => {
    const store = useSceneWidgetStore()
    const widgetA = createWidget('widget-a', 0)
    const widgetB = createWidget('widget-b', 1)
    widgetB.component.attr = { l: 200, t: 100, w: 50, h: 40, zIndex: 1 }
    store.totalWidgets = [widgetA, widgetB]
    store.setWidgetLayerTree([
      { id: widgetA.id, type: 'widget' },
      { id: widgetB.id, type: 'widget' },
    ])
    store.setCurrentWidgetsIds([widgetA.id, widgetB.id])

    expect(store.nudgeCurrentWidgets('right')).toBe(true)
    expect(widgetA.component.attr).toMatchObject({ l: 11, t: 20 })
    expect(widgetB.component.attr).toMatchObject({ l: 201, t: 100 })
    expect(commands).toHaveLength(1)

    expect(store.nudgeCurrentWidgets('up')).toBe(true)
    expect(widgetA.component.attr.t).toBe(19)
    expect(widgetB.component.attr.t).toBe(99)
    expect(commands).toHaveLength(2)

    commands[1].undo()
    expect(store.getWidgetById(widgetA.id)?.component.attr.t).toBe(20)
    expect(store.getWidgetById(widgetB.id)?.component.attr.t).toBe(100)
    commands[1].redo()
    expect(store.getWidgetById(widgetA.id)?.component.attr.t).toBe(19)
    expect(store.getWidgetById(widgetB.id)?.component.attr.t).toBe(99)
  })

  it('方向键微调支持分组、边界限制和锁定保护', () => {
    const store = useSceneWidgetStore()
    const widgetA = createWidget('widget-a', 0)
    const widgetB = createWidget('widget-b', 1)
    widgetA.component.attr = { l: 0, t: 10, w: 40, h: 30, zIndex: 0 }
    widgetB.component.attr = { l: 70, t: 20, w: 30, h: 30, zIndex: 1 }
    store.totalWidgets = [widgetA, widgetB]
    store.setWidgetLayerTree([
      { id: 'group-1', type: 'group', name: '分组1', children: [widgetA.id, widgetB.id] },
    ])
    store.setWidgetCanvasSizeFromConfig({ width: 100, height: 100 })
    store.setCurrentWidgetGroupId('group-1')

    /** 分组右边已贴到画布边缘，继续向右不应产生反向位移或空历史。 */
    expect(store.nudgeCurrentWidgets('right')).toBe(false)
    expect(commands).toHaveLength(0)

    expect(store.nudgeCurrentWidgets('down')).toBe(true)
    expect(widgetA.component.attr.t).toBe(11)
    expect(widgetB.component.attr.t).toBe(21)
    expect(commands).toHaveLength(1)

    store.setWidgetLocked(widgetA.id, true)
    commands = []
    expect(store.nudgeCurrentWidgets('left')).toBe(false)
    expect(widgetA.component.attr.l).toBe(0)
    expect(widgetB.component.attr.l).toBe(70)
    expect(commands).toHaveLength(0)
  })
})
