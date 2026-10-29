import { describe, expect, it, vi } from 'vitest'
import { createSceneDefinition, type SceneObject } from '@/scene-platform'
import { UnityEditorSceneRuntime } from '../runtime/UnityEditorSceneRuntime'

const deferredTypes = ['camera', 'effect', 'image', 'tileset', 'light', 'annotation'] as const

describe('Unity deferred objects', () => {
  it.each(deferredTypes)('retains %s configuration without selecting, updating or deleting a nonexistent Unity object', async (type) => {
    const onWarnings = vi.fn()
    const runtime = new UnityEditorSceneRuntime('gis', { mode: 'webgpu', getHost: () => null, onStatus: vi.fn(), onWarnings })
    const unity = { loadScene: vi.fn(async () => {}), updateObject: vi.fn(async () => {}), setSelection: vi.fn() }
    Object.assign(runtime, { unity })
    const scene = createSceneDefinition({ id: 'gis', name: 'GIS', type: 'gis', coordinateSystem: {
      kind: 'wgs84', defaultLongitude: 110, defaultLatitude: 19, defaultHeight: 0, terrainEnabled: false,
    } })
    const effect: SceneObject = { id: 'heat', name: '原有对象', type, visible: true, locked: false, order: 0,
      transform: { kind: 'geo', longitude: 110, latitude: 19, height: 0, heading: 0, pitch: 0, roll: 0, scale: 1, altitudeMode: 'absolute' },
      ...(type === 'effect' ? { effect: { id: 'heat', type: 'volume-heatmap' as const, params: { enabled: true } } } : {}) }
    scene.objects = [effect]
    await runtime.loadScene(scene)
    expect(runtime.hasObject('heat')).toBe(true)
    expect(unity.loadScene).toHaveBeenLastCalledWith(expect.objectContaining({ objects: [] }))
    expect(onWarnings).toHaveBeenLastCalledWith([expect.stringContaining(`（${type}）`)])
    runtime.setSelectedObject('heat')
    expect(unity.setSelection).toHaveBeenLastCalledWith(null)
    await runtime.upsertObject({ ...effect, name: '更新对象' })
    expect(onWarnings).toHaveBeenLastCalledWith([expect.stringContaining('更新对象')])
    expect(unity.updateObject).not.toHaveBeenCalled()
    runtime.removeObject('heat')
    expect(onWarnings).toHaveBeenLastCalledWith([])
    expect(unity.loadScene).toHaveBeenCalledTimes(1)
    expect(runtime.capabilities.effects.weatherRuntime).toBe(false)
    expect(runtime.capabilities.effects.threeMapTakeover).toBe(false)
  })

  it.each(['cloud', 'webgpu'] as const)('handles camera/primitive type changes without updating a nonexistent object (%s)', async (mode) => {
    const runtime = new UnityEditorSceneRuntime('local3d', { mode, getHost: () => null, onStatus: vi.fn() })
    const unity = { loadScene: vi.fn(async () => {}), updateObject: vi.fn(async () => {}), setSelection: vi.fn() }
    Object.assign(runtime, { unity })
    const scene = createSceneDefinition({ id: 'local', name: 'Local', type: 'local3d', coordinateSystem: {
      kind: 'local', unit: 'meter', upAxis: 'Y', gridEnabled: true,
    } })
    const camera: SceneObject = { id: 'object', name: 'Camera', type: 'camera', visible: true, locked: false, order: 0,
      transform: { kind: 'local', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 } }
    scene.objects = [camera]
    await runtime.loadScene(scene)
    const primitive: SceneObject = { ...camera, type: 'primitive', metadata: { editorGeometryType: 'BoxGeometry' } }
    await runtime.upsertObject(primitive)
    expect(unity.loadScene).toHaveBeenLastCalledWith(expect.objectContaining({ objects: [expect.objectContaining({ instanceId: 'object', objectType: 'primitive' })] }))
    await runtime.upsertObject(camera)
    expect(unity.loadScene).toHaveBeenLastCalledWith(expect.objectContaining({ objects: [] }))
    expect(unity.updateObject).not.toHaveBeenCalled()
  })
})
