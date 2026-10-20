import { describe, expect, it } from 'vitest'
import {
  createCommandBus,
  createCreateObjectCommand,
  createSceneDefinition,
  createSceneStore,
  type SceneObject,
} from '@/scene-platform'
import WidgetCommand, {
  type WidgetHistorySnapshot,
} from '@/integrations/scene/widgetRuntime/widgetCommand'
import { createCommandBusWidgetCommandPort } from '../commandBusWidgetCommandAdapter'

const sceneObject: SceneObject = {
  id: 'history-order-model',
  name: '历史顺序模型',
  type: 'model',
  visible: true,
  locked: false,
  order: 0,
  transform: {
    kind: 'local',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
  },
}

const createWidgetSnapshot = (state: string): WidgetHistorySnapshot => ({
  widgetIds: ['history-order-widget'],
  widgets: [],
  currentWidgetsIds: state === '不存在' ? null : ['history-order-widget'],
  currentWidgetGroupId: state,
  currentWidgetGroupIds: state === '不存在' ? [] : [state],
})

describe('二维命令总线适配器', () => {
  it('按三维新增、二维新增、二维编辑的真实顺序撤销和重做', () => {
    const sceneStore = createSceneStore(
      createSceneDefinition({
        id: 'widget-command-bus-order',
        name: '二维命令顺序测试',
        type: 'local3d',
        coordinateSystem: {
          kind: 'local',
          unit: 'meter',
          upAxis: 'Y',
          gridEnabled: true,
        },
      }),
    )
    const commandBus = createCommandBus(sceneStore)
    const commandPort = createCommandBusWidgetCommandPort(() => commandBus)
    let widgetState = '不存在'
    const appliedHistoryFlags: boolean[] = []
    const createWidgetCommand = (name: string, oldState: string, newState: string) =>
      new WidgetCommand(name, createWidgetSnapshot(oldState), createWidgetSnapshot(newState), {
        applyWidgetHistorySnapshot: (snapshot) => {
          appliedHistoryFlags.push(commandPort.isApplyingWidgetHistory())
          widgetState = snapshot.currentWidgetGroupId || '不存在'
        },
      })

    commandBus.execute(createCreateObjectCommand(sceneObject))
    widgetState = '已新增'
    commandPort.executeWidgetCommand(createWidgetCommand('新增二维对象', '不存在', '已新增'))
    widgetState = '已编辑'
    commandPort.executeWidgetCommand(createWidgetCommand('编辑二维对象', '已新增', '已编辑'))

    expect(commandBus.getUndoSize()).toBe(3)
    expect(sceneStore.getObject(sceneObject.id)).not.toBeNull()
    expect(widgetState).toBe('已编辑')

    commandBus.undo()
    expect(widgetState).toBe('已新增')
    expect(sceneStore.getObject(sceneObject.id)).not.toBeNull()
    commandBus.undo()
    expect(widgetState).toBe('不存在')
    expect(sceneStore.getObject(sceneObject.id)).not.toBeNull()
    commandBus.undo()
    expect(sceneStore.getObject(sceneObject.id)).toBeNull()

    commandBus.redo()
    expect(sceneStore.getObject(sceneObject.id)).not.toBeNull()
    expect(widgetState).toBe('不存在')
    commandBus.redo()
    expect(widgetState).toBe('已新增')
    commandBus.redo()
    expect(widgetState).toBe('已编辑')
    expect(appliedHistoryFlags).toEqual([true, true, true, true])
  })

  it('登记已经完成的二维变更时不重复应用新快照', () => {
    const sceneStore = createSceneStore(
      createSceneDefinition({
        id: 'widget-command-bus-register',
        name: '二维命令登记测试',
        type: 'local3d',
        coordinateSystem: {
          kind: 'local',
          unit: 'meter',
          upAxis: 'Y',
          gridEnabled: true,
        },
      }),
    )
    const commandBus = createCommandBus(sceneStore)
    const commandPort = createCommandBusWidgetCommandPort(() => commandBus)
    let applyCount = 0
    const command = new WidgetCommand(
      '登记二维编辑',
      createWidgetSnapshot('旧状态'),
      createWidgetSnapshot('新状态'),
      {
        applyWidgetHistorySnapshot: () => {
          applyCount += 1
        },
      },
    )

    commandPort.executeWidgetCommand(command)

    expect(commandBus.getUndoSize()).toBe(1)
    expect(applyCount).toBe(0)
  })
})
