import { describe, expect, it } from 'vitest'
import {
  createDefaultTransform,
  createEmptyScene,
  deserializeSceneFromFourPackages,
  serializeSceneToFourPackages,
} from '@/scene-core'

describe('four package persistence', () => {
  it('round trips the engine-neutral scene data', () => {
    const scene = createEmptyScene('scene-1')
    scene.objects.push({
      instanceId: '1001',
      objectType: 'model',
      name: '设备',
      visible: true,
      locked: false,
      transform: createDefaultTransform(),
      resourceRefKeys: ['resource-1'],
      properties: { temperature: 26 },
    })
    scene.resources.push({ resourceKey: 'resource-1', assetId: 'asset-1', kind: 'model' })

    const payload = serializeSceneToFourPackages(scene)
    const restored = deserializeSceneFromFourPackages(scene.id, payload)
    expect(restored.objects).toEqual(scene.objects)
    expect(restored.resources).toEqual(scene.resources)
    expect(restored.type).toBe('local3d')
  })

  it('rejects values that JSON serialization would silently lose', () => {
    const scene = createEmptyScene('scene-1')
    scene.settings.onLoaded = () => undefined
    expect(() => serializeSceneToFourPackages(scene)).toThrow('不可序列化值')
  })

  it('rejects transient resource addresses and credentials', () => {
    const scene = createEmptyScene('scene-1')
    scene.resources.push({
      resourceKey: 'resource-1',
      assetId: 'asset-1',
      kind: 'model',
      signedUrl: 'https://example.invalid/temporary',
    } as typeof scene.resources[number] & { signedUrl: string })
    expect(() => serializeSceneToFourPackages(scene)).toThrow('不得写入资源 URL')
  })

  it('rejects unsupported schema versions', () => {
    const payload = serializeSceneToFourPackages(createEmptyScene('scene-1'))
    payload.sceneJson = JSON.stringify({ ...JSON.parse(payload.sceneJson), schemaVersion: 2 })
    expect(() => deserializeSceneFromFourPackages('scene-1', payload)).toThrow('不支持的场景版本')
  })

  it('rejects unsupported package versions and non-string package fields', () => {
    const payload = serializeSceneToFourPackages(createEmptyScene('scene-1'))
    expect(() => deserializeSceneFromFourPackages('scene-1', { ...payload, schemaVersion: 2 })).toThrow('不支持的四包版本')
    expect(() => deserializeSceneFromFourPackages('scene-1', { ...payload, twoDJson: {} as string })).toThrow('twoDJson 必须是 JSON 字符串')
  })
})
