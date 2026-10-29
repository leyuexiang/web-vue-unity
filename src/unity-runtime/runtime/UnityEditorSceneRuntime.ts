import type { SceneDefinition, SceneLayer, SceneObject, ViewportHost } from '@/scene-platform'
import { createUpdateObjectTransformCommand } from '@/scene-platform'
import { BaseSceneRuntime } from '@/scene-platform/runtime/baseSceneRuntime'
import type { UnityTransport } from '../connection/UnityTransport'
import { LegacyUnityTransport, type LegacySessionConfig } from '../connection/LegacyUnityTransport'
import { waitForCloudRuntimeReady } from '../connection/waitForCloudRuntimeReady'
import { WebUnityTransport } from '../connection/WebUnityTransport'
import { JsonRpcUnityCloudRuntime } from './JsonRpcUnityCloudRuntime'
import { fromUnityTransform, getUnityDeferredRenderWarnings, getUnityModelAssetId, isUnityDeferredObject, projectObjectForUnity, projectSceneForUnity } from './projectSceneForUnity'
import type { UnityRenderMode } from '../renderMode'

export interface UnityEditorSceneRuntimeOptions {
  mode: UnityRenderMode
  cloudConfig?: LegacySessionConfig
  webBootstrapUrl?: string
  getHost: () => ViewportHost | null
  onStatus: (message: string) => void
  onWarnings?: (messages: string[]) => void
}

/** One SceneRuntime boundary for the Web player and the cloud video stream. */
export class UnityEditorSceneRuntime extends BaseSceneRuntime {
  private transport: UnityTransport | null = null
  private unity: JsonRpcUnityCloudRuntime | null = null
  private readonly unsubscribe: Array<() => void> = []
  private video: HTMLVideoElement | null = null
  private operations = Promise.resolve()
  private readonly programmaticUpdates = new Set<string>()
  private readonly missingModelAssetIds = new Set<string>()

  constructor(type: SceneDefinition['type'], private readonly options: UnityEditorSceneRuntimeOptions) {
    super(type, `unity-${options.mode}-${type}`)
    this.capabilities.editing.objectPick = true
    this.capabilities.editing.gizmo = true
    this.capabilities.transform.local = type === 'local3d'
    this.capabilities.transform.geo = type === 'gis'
    this.capabilities.transform.terrainClamp = false
    this.capabilities.rendering.imagery = false
    this.capabilities.rendering.terrain = false
    this.capabilities.rendering.tileset = false
    this.capabilities.rendering.indoorLocalLights = false
    this.capabilities.editing.annotation = false
    this.capabilities.assets.glb = false
    this.capabilities.assets.particles = false
    for (const key of Object.keys(this.capabilities.effects) as Array<keyof typeof this.capabilities.effects>) {
      this.capabilities.effects[key] = false
    }
    this.capabilities.rendering.indoorLocalLightsUnavailableReason = '当前 Unity 渲染暂不支持灯光编辑'
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container)
    if (this.options.mode === 'cloud') {
      if (!this.options.cloudConfig) throw new Error('云渲染信令尚未配置')
      const video = document.createElement('video')
      video.className = 'unity-cloud-video'
      video.style.cssText = 'width:100%;height:100%;display:block;object-fit:contain;outline:none'
      video.autoplay = true
      video.playsInline = true
      video.muted = true
      video.tabIndex = 0
      video.addEventListener('playing', () => (this.transport as LegacyUnityTransport | null)?.markVideoPlaying())
      video.addEventListener('mousedown', () => video.focus())
      for (const name of ['mousedown', 'mouseup', 'mousemove', 'wheel'] as const) {
        video.addEventListener(name, (event) => {
          if (name === 'wheel') event.preventDefault()
          ;(this.transport as LegacyUnityTransport | null)?.sendPointerInput(event, video.getBoundingClientRect())
        }, { passive: false })
      }
      for (const name of ['keydown', 'keyup'] as const) {
        video.addEventListener(name, (event) => {
          event.preventDefault()
          ;(this.transport as LegacyUnityTransport | null)?.sendKeyboardInput(event)
        })
      }
      video.addEventListener('blur', () => (this.transport as LegacyUnityTransport | null)?.sendReleaseInput())
      container.append(video)
      this.video = video
      const transport = new LegacyUnityTransport(this.options.cloudConfig, video)
      this.transport = transport
      this.unsubscribe.push(transport.onSnapshot((snapshot) => this.options.onStatus(snapshot.message)))
      await transport.connect()
      await waitForCloudRuntimeReady(transport)
    } else {
      if (!this.options.webBootstrapUrl) throw new Error('Unity Web 部署配置尚未提供')
      this.transport = new WebUnityTransport(container, this.options.webBootstrapUrl, this.options.onStatus)
      await this.transport.connect()
    }
    if (this.disposed) throw new Error('Unity 视口已关闭')
    const unity = new JsonRpcUnityCloudRuntime(this.transport)
    this.unity = unity
    await unity.connect()
    if (!unity.capabilities?.sceneTypes.includes(this.type)) throw new Error(`当前 Unity 播放器不支持 ${this.type === 'gis' ? 'GIS' : '普通三维'} 场景，请更新对应端的播放器`)
    this.capabilities.rendering.imagery = this.type === 'gis' && unity.capabilities.features['gis.imagery'] === true
    this.capabilities.rendering.terrain = this.type === 'gis' && unity.capabilities.features['gis.terrain'] === true
    this.capabilities.rendering.tileset = this.type === 'gis' && unity.capabilities.features['gis.tileset'] === true
    this.capabilities.streaming.nativeTileStreaming = this.type === 'gis'
    this.capabilities.culling.nativeTileFrustum = this.type === 'gis'
    this.unsubscribe.push(unity.on('runtimeError', ({ message }) => this.options.onStatus(`Unity 渲染异常：${message}`)))
    this.unsubscribe.push(unity.on('selectionChanged', ({ instanceId }) => {
      this.options.getHost()?.getStore().setSelectedObjectId(instanceId)
    }))
    this.unsubscribe.push(unity.on('transformCommitted', ({ instanceId, transform }) => {
      if (this.programmaticUpdates.has(instanceId)) return
      const host = this.options.getHost()
      const current = host?.getStore().getObject(instanceId)
      if (!host || !current || (current.transform.kind === 'geo') !== (transform.space === 'wgs84')) return
      const next = fromUnityTransform(transform, current.transform)
      if (JSON.stringify(current.transform) === JSON.stringify(next)) return
      try { host.getCommandBus().execute(createUpdateObjectTransformCommand(instanceId, next)) }
      catch (error) { this.options.onStatus(error instanceof Error ? error.message : 'Unity 变换提交失败') }
    }))
    this.options.onStatus('Unity 运行时已连接')
  }

  override async loadScene(scene: SceneDefinition): Promise<void> {
    if (!this.unity) throw new Error('Unity 运行时尚未连接')
    this.options.onStatus('正在加载 Unity 场景')
    await this.loadUnityDraft(scene)
    await super.loadScene(scene)
    this.reportDeferredObjects()
    this.options.onStatus('Unity 场景已就绪')
  }

  override async upsertObject(object: SceneObject): Promise<void> {
    const previous = this.objectMap.get(object.id)
    const existedInUnity = previous !== undefined && !this.isDeferredInUnity(previous)
    await super.upsertObject(object)
    this.reportDeferredObjects()
    if (!this.unity || !this.scene) return
    if (this.isDeferredInUnity(object) && !existedInUnity) return
    await this.operations
    // SceneStore also holds deferred objects. A type change can enter or leave the Unity projection.
    const representationChanged = previous !== undefined && (previous.type !== object.type || getUnityModelAssetId(previous) !== getUnityModelAssetId(object))
    if (!existedInUnity || this.isDeferredInUnity(object) || representationChanged) {
      await this.loadUnityDraft(this.scene)
      this.reportDeferredObjects()
      return
    }
    this.programmaticUpdates.add(object.id)
    try { await this.unity.updateObject(projectObjectForUnity(object)) }
    finally { this.programmaticUpdates.delete(object.id) }
  }

  async updateSceneLayers(layers: SceneLayer[]): Promise<void> {
    if (!this.scene || this.type !== 'gis') return
    await this.operations
    const selection = this.selectedObjectId
    await this.loadScene({ ...this.scene, layers })
    this.setSelectedObject(selection)
  }

  override removeObject(objectId: string): void {
    const previous = this.objectMap.get(objectId)
    super.removeObject(objectId)
    this.reportDeferredObjects()
    if (!previous || this.isDeferredInUnity(previous)) return
    if (!this.scene || !this.unity) return
    const scene = this.scene
    this.operations = this.operations.then(() => this.loadUnityDraft(scene))
      .catch((error) => { this.options.onStatus(error instanceof Error ? error.message : 'Unity 对象删除同步失败') })
  }

  override setSelectedObject(objectId: string | null): void {
    super.setSelectedObject(objectId)
    const selected = objectId ? this.objectMap.get(objectId) : null
    this.unity?.setSelection(selected && this.isDeferredInUnity(selected) ? null : this.selectedObjectId)
  }

  override async upsertEffect(effect: SceneDefinition['effects'][number]): Promise<void> {
    await super.upsertEffect(effect)
    this.reportDeferredObjects()
  }

  override removeEffect(effectId: string): void {
    super.removeEffect(effectId)
    this.reportDeferredObjects()
  }

  private reportDeferredObjects(): void {
    if (!this.scene) return
    const warnings = getUnityDeferredRenderWarnings({ ...this.scene, effects: [...this.effectMap.values()] })
    const missing = this.scene.objects.filter((object) => object.type === 'model' && this.missingModelAssetIds.has(getUnityModelAssetId(object)))
    if (missing.length) {
      warnings.push(`以下模型未在当前 Unity 美术版本发布，暂未显示，配置仍保留：${missing.slice(0, 6).map((object) => `${object.name}（资源 ${getUnityModelAssetId(object)}）`).join('、')}${missing.length > 6 ? `等 ${missing.length} 项` : ''}。请发布对应 Unity 资源后重新进入场景。`)
    }
    this.options.onWarnings?.(warnings)
  }

  private isDeferredInUnity(object: SceneObject): boolean {
    return isUnityDeferredObject(object) || (object.type === 'model' && this.missingModelAssetIds.has(getUnityModelAssetId(object)))
  }

  private async loadUnityDraft(scene: SceneDefinition): Promise<void> {
    if (!this.unity) throw new Error('Unity 运行时尚未连接')
    const draft = projectSceneForUnity(scene)
    // Only an explicit catalog miss can degrade a model. Network, integrity and other load errors remain fatal.
    // Every retry removes at least one resource from this transient projection, bounding the loop by resource count.
    while (true) {
      const resources = draft.resources.filter((resource) => !this.missingModelAssetIds.has(resource.assetId))
      const resourceKeys = new Set(resources.map((resource) => resource.resourceKey))
      const objects = draft.objects.filter((object) => object.objectType !== 'model' || object.resourceRefKeys.every((key) => resourceKeys.has(key)))
      try { await this.unity.loadScene({ ...draft, objects, resources }); return }
      catch (error) {
        const match = error instanceof Error ? /^当前美术版本不存在资源键[:：]\s*(\S+)\s*$/u.exec(error.message) : null
        const missing = match ? resources.find((resource) => resource.assetId === match[1] || `model/${resource.assetId}` === match[1]) : undefined
        if (!missing) throw error
        this.missingModelAssetIds.add(missing.assetId)
        this.options.onStatus(`模型资源 ${missing.assetId} 尚未在 Unity 发布，正在加载其余场景`)
      }
    }
  }

  async setGizmoMode(mode: 'translate' | 'rotate' | 'scale'): Promise<void> {
    if (!this.unity) throw new Error('Unity 运行时尚未连接')
    await this.unity.setGizmoMode(mode)
  }

  override dispose(): void {
    this.unsubscribe.splice(0).forEach((stop) => stop())
    const unity = this.unity
    const transport = this.transport
    this.unity = null
    this.transport = null
    this.missingModelAssetIds.clear()
    this.video?.remove()
    this.video = null
    if (unity) void unity.disconnect()
    else void transport?.disconnect()
    super.dispose()
  }
}
