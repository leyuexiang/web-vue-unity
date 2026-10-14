import { describe, expect, it } from 'vitest'
import {
  createCommandBus,
  createDefaultTransform,
  createEmptyScene,
  createObjectCommand,
  createSceneStore,
  updateObjectTransformCommand,
  type SceneObject,
} from '@/scene-core'

const createObject = (): SceneObject => ({
  instanceId: '1001',
  objectType: 'model',
  name: '水泵',
  visible: true,
  locked: false,
  transform: createDefaultTransform(),
  resourceRefKeys: ['pump'],
  properties: {},
})

describe('SceneStore and CommandBus', () => {
  it('creates and undoes an object without a rendering engine', () => {
    const store = createSceneStore(createEmptyScene('scene-1'))
    const bus = createCommandBus(store)
    bus.execute(createObjectCommand(createObject()))
    expect(store.getObject('1001')?.name).toBe('水泵')
    expect(bus.undo()).toBe(true)
    expect(store.getObject('1001')).toBeNull()
    expect(bus.redo()).toBe(true)
    expect(store.getObject('1001')?.name).toBe('水泵')
  })

  it('merges consecutive transforms for the same object into one undo step', () => {
    const store = createSceneStore(createEmptyScene('scene-1'))
    const bus = createCommandBus(store)
    const object = createObject()
    bus.execute(createObjectCommand(object))
    const first = { ...object.transform, position: [1, 0, 0] as [number, number, number] }
    const last = { ...object.transform, position: [3, 2, 1] as [number, number, number] }

    bus.execute(updateObjectTransformCommand(object.instanceId, object.transform, first))
    bus.execute(updateObjectTransformCommand(object.instanceId, first, last))

    expect(bus.getUndoSize()).toBe(2)
    expect(bus.undo()).toBe(true)
    expect(store.getObject(object.instanceId)?.transform).toEqual(object.transform)
    expect(bus.redo()).toBe(true)
    expect(store.getObject(object.instanceId)?.transform).toEqual(last)
  })

  it('does not merge transforms for different objects', () => {
    const store = createSceneStore(createEmptyScene('scene-1'))
    const bus = createCommandBus(store)
    const firstObject = createObject()
    const secondObject = { ...createObject(), instanceId: '1002', name: '风机' }
    bus.execute(createObjectCommand(firstObject))
    bus.execute(createObjectCommand(secondObject))
    const firstTransform = { ...firstObject.transform, position: [1, 0, 0] as [number, number, number] }
    const secondTransform = { ...secondObject.transform, position: [0, 2, 0] as [number, number, number] }

    bus.execute(updateObjectTransformCommand(firstObject.instanceId, firstObject.transform, firstTransform))
    bus.execute(updateObjectTransformCommand(secondObject.instanceId, secondObject.transform, secondTransform))

    expect(bus.getUndoSize()).toBe(4)
    bus.undo()
    expect(store.getObject(secondObject.instanceId)?.transform).toEqual(secondObject.transform)
    expect(store.getObject(firstObject.instanceId)?.transform).toEqual(firstTransform)
  })

  it('updates and restores a transform', () => {
    const store = createSceneStore(createEmptyScene('scene-1'))
    const bus = createCommandBus(store)
    const object = createObject()
    bus.execute(createObjectCommand(object))
    const after = { ...object.transform, position: [1, 2, 3] as [number, number, number] }
    bus.execute(updateObjectTransformCommand(object.instanceId, object.transform, after))
    expect(store.getObject('1001')?.transform.position).toEqual([1, 2, 3])
    bus.undo()
    expect(store.getObject('1001')?.transform.position).toEqual([0, 0, 0])
  })
})
