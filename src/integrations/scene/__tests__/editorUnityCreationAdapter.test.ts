import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { DRAG_MODEL_ENUM, MODEL_ENUM } from '@/enums'
import { createSceneDefinition, createViewportHost, type ViewportHost } from '@/scene-platform'
import type { SceneDefinition as UnityScene } from '@/scene-core'
import type { FileModel } from '@/types/threeScene'
import { UnityEditorSceneRuntime } from '@/unity-runtime/runtime/UnityEditorSceneRuntime'
import { serializeSceneDefinitionToFourPackages } from '../sceneFourPackage'
import { createEditorUnityObject } from '../editorUnityCreationAdapter'
import { preserveUneditedThreeDDomain, releaseOriginalScenePackages, retainOriginalScenePackages } from '../twoDPackagePreservation'
import { saveEditorSceneToDim3d } from '../editorDim3dSceneSaveService'

/** 只替换播放器边界，实际执行对象映射、命令历史、桥接、双端投影和保存序列化。 */
const hosts: ViewportHost[] = []
const sceneId = '2089645792212000769'
afterEach(() => {
  hosts.splice(0).forEach((host) => host.dispose())
  releaseOriginalScenePackages(sceneId)
})
const setup = async (type: 'local3d' | 'gis' = 'local3d', mode: 'cloud' | 'webgpu' = 'webgpu') => {
  const scene = createSceneDefinition({ id: sceneId, name: '拖拽场景', type,
    coordinateSystem: type === 'gis'
      ? { kind: 'wgs84', defaultLongitude: 110, defaultLatitude: 19, defaultHeight: 5, terrainEnabled: false }
      : { kind: 'local', unit: 'meter', upAxis: 'Y', gridEnabled: true } })
  let host: ViewportHost
  const onWarnings = vi.fn()
  const runtime = new UnityEditorSceneRuntime(type, { mode, getHost: () => host, onStatus: vi.fn(), onWarnings })
  const unity = { loadScene: vi.fn(async (_draft: UnityScene) => {}), updateObject: vi.fn(async () => {}),
    setSelection: vi.fn(), disconnect: vi.fn(async () => {}) }
  Object.assign(runtime, { unity })
  vi.spyOn(runtime, 'mount').mockResolvedValue(undefined)
  host = createViewportHost({ container: {} as HTMLElement, scene, runtimeFactory: () => runtime })
  // 与正式仓储加载保持一致，验证新增模型能穿过保存服务的原三维包保护。
  retainOriginalScenePackages(scene.id, serializeSceneDefinitionToFourPackages(scene))
  hosts.push(host)
  await host.mount()
  unity.loadScene.mockClear()
  const model: FileModel = reactive({ name: '资源模型', modelType: DRAG_MODEL_ENUM.CustomModel, icon: '',
    filePath: 'https://assets.test/model.glb', fileType: MODEL_ENUM.GLB,
    resourceAsset: { id: 'published-model', url: 'https://assets.test/model.glb', version: 'v1' } })
  const create = (item = model, isActive = () => true) => createEditorUnityObject(item,
    { clientX: 250, clientY: 180 }, { host, isActive })
  return { host, runtime, unity, model, create, onWarnings }
}

describe('画布模型拖拽入口', () => {
  it('将三维资源交给正式创建链路，不再被二维阶段的占位提示拦截', () => {
    // 入口契约防止后续迁移再次留下硬编码返回；运行时行为由下方的集成用例覆盖。
    const canvas = readFileSync(new URL('../../../views/sceneEdit/SceneCenter/SceneCanvas/index.vue', import.meta.url), 'utf8')
    expect(canvas.includes('三维资源将在二维验收后接入 Unity')).toBe(false)
    expect(canvas).toContain('await createEditorUnityObject(')
  })
})

describe('模型拖拽到双端运行时', () => {
  it.each([
    ['local3d', 'cloud'], ['local3d', 'webgpu'], ['gis', 'cloud'], ['gis', 'webgpu'],
  ] as const)('在%s场景通过%s创建、保存、撤销和重做同一模型', async (type, mode) => {
    const { host, unity, create } = await setup(type, mode)
    const id = await create()
    expect(id).toBeTruthy()
    const object = host.getStore().getObject(id!)!
    expect(object.asset).toMatchObject({ id: 'published-model', version: 'v1' })
    expect(host.getStore().getSelectedObjectId()).toBe(id)
    expect(unity.setSelection).toHaveBeenLastCalledWith(id)
    const draft = unity.loadScene.mock.calls[0]![0]
    expect(draft.resources).toEqual([{ resourceKey: 'published-model', assetId: 'published-model', kind: 'glb' }])
    expect(draft.objects[0]!.transform).toMatchObject({
      space: type === 'gis' ? 'wgs84' : 'local', position: type === 'gis' ? [110, 19, 5] : [0, 0, 0], scale: [1, 1, 1],
    })
    const packages = preserveUneditedThreeDDomain(sceneId, serializeSceneDefinitionToFourPackages(host.getStore().getScene()))
    expect(JSON.parse(packages.threeDJson).objects.map((item: { instanceId: string }) => item.instanceId)).toEqual([id])
    expect(JSON.parse(packages.dependenciesJson).resources[0]).toMatchObject({ assetId: 'published-model', owners: [{ domain: 'threeD', instanceId: id }] })
    expect(host.getCommandBus().getUndoSize()).toBe(1)
    host.getCommandBus().undo()
    await host.getBridge().flush()
    expect(host.getStore().getObject(id!)).toBeNull()
    const undone = preserveUneditedThreeDDomain(sceneId, serializeSceneDefinitionToFourPackages(host.getStore().getScene()))
    expect(JSON.parse(undone.threeDJson).objects).toEqual([])
    expect(JSON.parse(undone.dependenciesJson).resources).toEqual([])
    expect(unity.loadScene).toHaveBeenLastCalledWith(expect.objectContaining({ objects: [], resources: [] }))
    host.getCommandBus().redo()
    await host.getBridge().flush()
    expect(host.getStore().getObject(id!)).toMatchObject({ id, asset: object.asset })
    expect(unity.loadScene).toHaveBeenLastCalledWith(expect.objectContaining({ objects: [expect.objectContaining({ instanceId: id })] }))
  })

  it('同一资源重复拖入生成不同实例，但只登记一份资源', async () => {
    const { host, unity, create, model } = await setup()
    const first = await create({ ...model, modelType: DRAG_MODEL_ENUM.Model })
    const second = await create()
    expect(first).not.toBe(second)
    expect(host.getStore().getObjects()).toHaveLength(2)
    const latest = unity.loadScene.mock.calls.at(-1)![0]
    expect(latest.resources).toHaveLength(1)
    expect(latest.objects).toHaveLength(2)
  })

  it('正式保存服务提交的四包包含刚拖入的模型和依赖', async () => {
    const { host, create } = await setup()
    const id = await create()
    const saveAll = vi.fn(async () => ({ code: 200, data: { sceneId, conflict: false } }))
    await saveEditorSceneToDim3d(host.getStore().getScene(), { sceneId, lockToken: 'test-lock' }, {
      saveAll, createRequestId: () => 'drag-save',
    })
    const body = saveAll.mock.calls[0] as unknown as [Record<string, string>]
    expect(JSON.parse(body[0].threeDJson!).objects.map((item: { instanceId: string }) => item.instanceId)).toEqual([id])
    expect(JSON.parse(body[0].dependenciesJson!).resources[0].assetId).toBe('published-model')
  })

  it('加载失败移除本次对象和历史，恢复原选择，且后续拖拽仍能成功', async () => {
    const { host, unity, create } = await setup()
    const first = await create()
    unity.loadScene.mockRejectedValueOnce(new Error('资源包完整性校验失败'))
    await expect(create()).rejects.toThrow('资源包完整性校验失败')
    expect(host.getStore().getObjects().map((object) => object.id)).toEqual([first])
    expect(host.getStore().getSelectedObjectId()).toBe(first)
    expect(host.getCommandBus().getUndoSize()).toBe(1)
    expect(host.getCommandBus().getRedoSize()).toBe(0)
    expect(unity.loadScene).toHaveBeenLastCalledWith(expect.objectContaining({ objects: [expect.objectContaining({ instanceId: first })] }))
    expect(await create()).toBeTruthy()
    expect(host.getStore().getObjects()).toHaveLength(2)
  })

  it('缺少资源身份或不支持的几何体在写入状态前拒绝创建', async () => {
    const { host, unity, model, create } = await setup()
    await expect(create({ ...model, resourceAsset: undefined })).rejects.toThrow('稳定资源编号')
    await expect(createEditorUnityObject({ name: '圆环', type: 'TorusGeometry', modelType: DRAG_MODEL_ENUM.Geometry, icon: '' },
      { clientX: 0, clientY: 0 }, { host, isActive: () => true })).rejects.toThrow('暂不支持几何体')
    expect(host.getStore().getObjects()).toEqual([])
    expect(host.getCommandBus().getUndoSize()).toBe(0)
    expect(unity.loadScene).not.toHaveBeenCalled()
  })

  it('拖入未发布模型时沿用现有缺失提示，保留可保存配置', async () => {
    const { host, unity, create, onWarnings } = await setup()
    unity.loadScene.mockRejectedValueOnce(new Error('当前美术版本不存在资源键: model/published-model'))
    const id = await create()
    expect(host.getStore().getObject(id!)).not.toBeNull()
    expect(unity.setSelection).toHaveBeenLastCalledWith(null)
    expect(onWarnings).toHaveBeenLastCalledWith([expect.stringContaining('资源 published-model')])
    expect(unity.loadScene).toHaveBeenLastCalledWith(expect.objectContaining({ objects: [], resources: [] }))
  })

  it('页面卸载后不重新选中或写入已销毁宿主', async () => {
    const { host, unity, create } = await setup()
    let finish!: () => void
    let active = true
    unity.loadScene.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    const pending = create(undefined, () => active)
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    active = false
    host.dispose()
    unity.setSelection.mockClear()
    finish()
    expect(await pending).toBeNull()
    expect(unity.setSelection).not.toHaveBeenCalled()
    expect(host.getCommandBus().getUndoSize()).toBe(0)
  })
})
