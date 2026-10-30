import { describe, expect, it } from 'vitest'
import { createSceneDefinition } from '../../core/sceneDefinition'
import { createCommandBus } from '../../store/commandBus'
import { createSceneStore } from '../../store/sceneStore'
import { createUpdateObjectLockCommand } from '../objectLayerCommands'

describe('三维对象锁定命令', () => {
  it('切换锁定状态时保留独立配置的可拾取值', () => {
    const scene = createSceneDefinition({
      id: 'selection-scene',
      name: '选择场景',
      type: 'local3d',
      coordinateSystem: { kind: 'local', unit: 'meter', upAxis: 'Y', gridEnabled: true },
    })
    const store = createSceneStore(scene)
    store.upsertObject({
      id: 'model-1',
      name: '模型',
      type: 'model',
      visible: true,
      locked: false,
      order: 0,
      transform: { kind: 'local', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
      asset: { id: 'asset-1', kind: 'glb', url: '' },
      metadata: { pickable: false },
    })
    const commandBus = createCommandBus(store)

    commandBus.execute(createUpdateObjectLockCommand('model-1', true))
    expect(store.getObject('model-1')).toMatchObject({ locked: true, metadata: { pickable: false } })

    commandBus.execute(createUpdateObjectLockCommand('model-1', false))
    expect(store.getObject('model-1')).toMatchObject({ locked: false, metadata: { pickable: false } })
  })
})
