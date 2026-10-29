import { describe, expect, it, vi } from 'vitest'
import { createSceneDefinition, createSceneStore, type SceneLayer } from '@/scene-platform'
import { createRuntimeBridge } from '@/scene-platform/runtime/runtimeBridge'
import { MemorySceneRuntime } from '@/scene-platform/runtime/memory/memorySceneRuntime'

describe('GIS data layer runtime bridge', () => {
  it('synchronizes imagery changes and deletion while keeping object grouping on the object path', async () => {
    const scene = createSceneDefinition({ id: 'gis', name: 'GIS', type: 'gis', coordinateSystem: {
      kind: 'wgs84', defaultLongitude: 110, defaultLatitude: 19, defaultHeight: 0, terrainEnabled: false,
    } })
    const store = createSceneStore(scene)
    const updateSceneLayers = vi.fn(async (_layers: SceneLayer[]) => {})
    const runtime = Object.assign(new MemorySceneRuntime('gis'), { updateSceneLayers })
    const bridge = createRuntimeBridge(store, runtime)
    bridge.start()
    await bridge.flush()
    expect(updateSceneLayers).not.toHaveBeenCalled()
    const layer: SceneLayer = { id: 'imagery', name: '影像', type: 'imagery', provider: 'xyz',
      url: 'https://example.test/{z}/{x}/{y}.png', visible: true, locked: false, order: 0 }
    store.upsertLayer(layer)
    await bridge.flush()
    expect(updateSceneLayers).toHaveBeenLastCalledWith([layer])
    store.upsertLayer({ ...layer, visible: false })
    await bridge.flush()
    expect(updateSceneLayers).toHaveBeenLastCalledWith([{ ...layer, visible: false }])
    store.removeLayer('imagery')
    await bridge.flush()
    expect(updateSceneLayers).toHaveBeenLastCalledWith([])
    updateSceneLayers.mockClear()
    store.upsertLayer({ id: 'group', name: '分组', type: 'object', visible: true, locked: false, order: 0 })
    await bridge.flush()
    expect(updateSceneLayers).not.toHaveBeenCalled()
    bridge.stop()
  })
})
