import { afterEach, describe, expect, it } from 'vitest'
import { preserveUneditedThreeDDomain, releaseOriginalScenePackages, retainOriginalScenePackages } from '../twoDPackagePreservation'
import type { SceneFourPackagePayload } from '../sceneFourPackage'

const sceneId = 'migration-preservation'
const payload = (dependencies: object): SceneFourPackagePayload => ({
  sceneJson: JSON.stringify({ name: '原场景', customSceneExtension: { keep: true } }),
  threeDJson: '{ "objects": [{"instanceId":"三维模型","unknownFutureField":true}], "customRenderer": {"version":9} }',
  twoDJson: JSON.stringify({ canvas: { width: 1920, height: 1080 }, components: [], layerTree: [], customTwoDExtension: true }),
  dependenciesJson: JSON.stringify(dependencies),
})
afterEach(() => releaseOriginalScenePackages(sceneId))

describe('二维编辑的三维无损保存保护', () => {
  it('三维原文和未知扩展字段不受二维修改影响', () => {
    const before = payload({ futureDependency: { keep: true }, behaviors: [{ owner: { domain: 'threeD', instanceId: '三维模型' }, privateData: 42 }] })
    retainOriginalScenePackages(sceneId, before)
    const generated = { ...payload({ behaviors: [{ owner: { domain: 'twoD', instanceId: '二维按钮' }, click: true }] }),
      threeDJson: '{}', sceneJson: '{"name":"修改名称"}', twoDJson: '{"components":[{"instanceId":"二维按钮"}]}' }
    const result = preserveUneditedThreeDDomain(sceneId, generated)
    expect(result.threeDJson).toBe(before.threeDJson)
    expect(JSON.parse(result.sceneJson)).toEqual({ name: '修改名称', customSceneExtension: { keep: true } })
    expect(JSON.parse(result.twoDJson).customTwoDExtension).toBe(true)
    expect(JSON.parse(result.dependenciesJson).behaviors).toHaveLength(2)
    expect(JSON.parse(result.dependenciesJson).futureDependency).toEqual({ keep: true })
  })

  it('删除二维资源引用时保留共享资源的三维拥有者', () => {
    const owner3d = { domain: 'threeD', ownerType: 'instance', instanceId: '三维模型' }
    const owner2d = { domain: 'twoD', ownerType: 'instance', instanceId: '已删除部件' }
    retainOriginalScenePackages(sceneId, payload({ resources: [{ resourceKey: '共享图片', assetId: '图片编号', owners: [owner3d, owner2d] }] }))
    const result = preserveUneditedThreeDDomain(sceneId, payload({ resources: [] }))
    expect(JSON.parse(result.dependenciesJson).resources).toEqual([{ resourceKey: '共享图片', assetId: '图片编号', owners: [owner3d] }])
  })

  it('当前二维拥有者和原有三维拥有者合并到同一资源', () => {
    const owner3d = { domain: 'threeD', instanceId: '三维模型' }
    const owner2d = { domain: 'twoD', instanceId: '新图片' }
    retainOriginalScenePackages(sceneId, payload({ resources: [{ resourceKey: '共享图片', assetId: '编号', unknown: 1, owners: [owner3d] }] }))
    const result = preserveUneditedThreeDDomain(sceneId, payload({ resources: [{ resourceKey: '共享图片', assetId: '编号', owners: [owner2d] }] }))
    expect(JSON.parse(result.dependenciesJson).resources).toEqual([{ resourceKey: '共享图片', assetId: '编号', unknown: 1, owners: [owner3d, owner2d] }])
  })

  it('没有原始混合场景时不保留上一张场景的数据，损坏数据禁止进入编辑', () => {
    const generated = payload({ resources: [] })
    expect(preserveUneditedThreeDDomain(sceneId, generated)).toBe(generated)
    expect(() => retainOriginalScenePackages(sceneId, { ...generated, threeDJson: '[' })).toThrow()
  })
})
