import { describe, expect, it } from 'vitest'
import { createEmptyScene, createSceneStore } from '@/scene-core'

describe('scene store four-package recovery boundary', () => {
  it('replaces the local scene and clears stale selection when loading recovered data', () => {
    const store = createSceneStore(createEmptyScene('draft'))
    store.upsertObject({
      instanceId: 'old',
      objectType: 'model',
      name: '旧对象',
      visible: true,
      locked: false,
      transform: {
        space: 'local',
        position: [0, 0, 0],
        rotation: { kind: 'quaternion', value: [0, 0, 0, 1] },
        scale: [1, 1, 1],
      },
      resourceRefKeys: [],
      properties: {},
    })
    store.selectObject('old')

    const recovered = createEmptyScene('scene-1')
    recovered.name = '恢复场景'
    recovered.twoD.components.push({ id: 'panel-1' })
    store.loadScene(recovered)

    expect(store.getScene()).toEqual(recovered)
    expect(store.getSelectedObjectId()).toBeNull()
  })
})
