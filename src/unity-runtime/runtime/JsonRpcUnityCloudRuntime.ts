import type { SceneDefinition, SceneObject } from '@/scene-core'
import type { UnityTransport } from '@/unity-runtime/connection/UnityTransport'
import {
  UNITY_EDITOR_CLIENT,
  UNITY_EDITOR_PROTOCOL_VERSION,
  type UnityGizmoMode,
  type UnityRuntimeCapabilities,
  type UnitySessionInitializePayload,
  type UnitySessionInitializeResponse,
  type UnitySceneSnapshotDto,
} from '@/unity-runtime/protocol/types'
import type { UnityCloudRuntime, UnityRuntimeEventMap } from './UnityCloudRuntime'

const randomId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

export class JsonRpcUnityCloudRuntime implements UnityCloudRuntime {
  capabilities: UnityRuntimeCapabilities | null = null
  private sceneId = ''
  private sceneGeneration = 0
  private sequence = 0
  private readonly sessionId = randomId()
  private readonly listeners = new Map<keyof UnityRuntimeEventMap, Set<(payload: never) => void>>()
  private unsubscribeEvents: Array<() => void> = []

  constructor(private readonly transport: UnityTransport) {}

  async connect(): Promise<void> {
    await this.transport.connect()
    this.bindEvents()
    try {
      const response = await this.send<UnitySessionInitializePayload, UnitySessionInitializeResponse>(
        'editor.v1.session.initialize',
        {
          client: UNITY_EDITOR_CLIENT,
          supportedProtocolVersions: [UNITY_EDITOR_PROTOCOL_VERSION],
        },
      )
      if (!response.success || !response.payload) throw new Error(response.error?.message ?? 'Unity 能力协商失败')
      if (response.payload.protocolVersion !== UNITY_EDITOR_PROTOCOL_VERSION) {
        throw new Error(`Unity 协议版本不兼容：${response.payload.protocolVersion}`)
      }
      this.capabilities = response.payload.capabilities
      const transportWithSnapshot = this.transport as UnityTransport & { markRuntimeReady?: () => void }
      transportWithSnapshot.markRuntimeReady?.()
    } catch (error) {
      this.unsubscribeEvents.splice(0).forEach((unsubscribe) => unsubscribe())
      this.capabilities = null
      try {
        await this.transport.disconnect()
      } catch {
        // 保留能力协商的原始错误，断开失败由 Transport 自身记录。
      }
      throw error
    }
  }

  async disconnect(): Promise<void> {
    this.unsubscribeEvents.splice(0).forEach((unsubscribe) => unsubscribe())
    this.capabilities = null
    await this.transport.disconnect()
  }

  async loadScene(scene: SceneDefinition): Promise<void> {
    if (this.capabilities?.features['scene.loadDraft'] === false) throw new Error('当前 Unity 播放器尚未支持网页场景对象加载，请更新播放器')
    if (this.capabilities && !this.capabilities.sceneTypes.includes(scene.type)) {
      throw new Error(`当前 Unity 播放器不支持 ${scene.type} 场景，请更新对应端的播放器`)
    }
    this.sceneId = scene.id
    this.sceneGeneration += 1
    // Unity 只接收三维投影；二维组件和业务设置继续由 Web 保存，减少通道负载。
    const snapshot: UnitySceneSnapshotDto = {
      sceneId: scene.id,
      revisionNo: scene.revisionNo,
      sceneType: scene.type,
      objects: scene.objects,
      resources: scene.resources,
      ...(scene.geospatial ? { geospatial: scene.geospatial } : {}),
    }
    const response = await this.send<UnitySceneSnapshotDto, unknown>('editor.v1.scene.loadDraft', snapshot)
    this.assertSuccess(response)
  }

  async clearScene(): Promise<void> {
    // 清场也开启新代次，使尚未结束的加载和主动事件立即过期。
    this.sceneGeneration += 1
    const response = await this.send<Record<string, never>, unknown>('editor.v1.scene.clear', {})
    this.assertSuccess(response)
  }

  async createObject(object: SceneObject): Promise<void> {
    const response = await this.send<SceneObject, unknown>('editor.v1.object.create', object)
    this.assertSuccess(response)
  }

  async updateObject(object: SceneObject): Promise<void> {
    const response = await this.send<SceneObject, unknown>('editor.v1.object.update', object)
    this.assertSuccess(response)
  }

  async deleteObject(instanceId: string): Promise<void> {
    const response = await this.send<{ instanceId: string }, unknown>('editor.v1.object.delete', { instanceId })
    this.assertSuccess(response)
  }

  setSelection(instanceId: string | null): void {
    this.transport.notify('editor.v1.selection.set', this.envelope({ instanceId }))
  }

  async setGizmoMode(mode: UnityGizmoMode): Promise<void> {
    if (mode === 'select') return
    if (this.capabilities?.features['gizmo.mode.set'] === false) throw new Error('Unity 尚未接入 Gizmo 编辑协议')
    if (this.capabilities && !this.capabilities.gizmoModes.includes(mode)) {
      throw new Error(`Unity 不支持 Gizmo 模式：${mode}`)
    }
    const response = await this.send<{ mode: UnityGizmoMode }, unknown>('editor.v1.gizmo.mode.set', { mode })
    this.assertSuccess(response)
  }

  async setMode(mode: 'edit' | 'preview'): Promise<void> {
    const response = await this.send<{ mode: 'edit' | 'preview' }, unknown>('editor.v1.runtime.mode.set', { mode })
    this.assertSuccess(response)
  }

  on<TKey extends keyof UnityRuntimeEventMap>(
    type: TKey,
    listener: (payload: UnityRuntimeEventMap[TKey]) => void,
  ): () => void {
    let group = this.listeners.get(type)
    if (!group) {
      group = new Set()
      this.listeners.set(type, group)
    }
    group.add(listener as (payload: never) => void)
    return () => group?.delete(listener as (payload: never) => void)
  }

  private emit<TKey extends keyof UnityRuntimeEventMap>(type: TKey, payload: UnityRuntimeEventMap[TKey]): void {
    this.listeners.get(type)?.forEach((listener) => listener(payload as never))
  }

  private bindEvents(): void {
    if (this.unsubscribeEvents.length) return
    this.unsubscribeEvents.push(
      this.transport.subscribe<{ instanceId: string | null }>('editor.v1.selection.changed', (event) => {
        if (this.acceptEvent(event)) this.emit('selectionChanged', event.payload)
      }),
      this.transport.subscribe<UnityRuntimeEventMap['transformPreview']>('editor.v1.transform.preview', (event) => {
        if (this.acceptEvent(event)) this.emit('transformPreview', event.payload)
      }),
      this.transport.subscribe<UnityRuntimeEventMap['transformCommitted']>('editor.v1.transform.committed', (event) => {
        if (this.acceptEvent(event)) this.emit('transformCommitted', event.payload)
      }),
      this.transport.subscribe<UnityRuntimeEventMap['sceneProgress']>('editor.v1.scene.progress', (event) => {
        if (this.acceptEvent(event)) this.emit('sceneProgress', event.payload)
      }),
      this.transport.subscribe<UnityRuntimeEventMap['sceneLoaded']>('editor.v1.scene.loaded', (event) => {
        if (this.acceptEvent(event)) this.emit('sceneLoaded', event.payload)
      }),
      this.transport.subscribe<UnityRuntimeEventMap['sceneFailed']>('editor.v1.scene.failed', (event) => {
        if (this.acceptEvent(event)) this.emit('sceneFailed', event.payload)
      }),
      this.transport.subscribe<UnityRuntimeEventMap['runtimeError']>('editor.v1.runtime.error', (event) => {
        if (this.acceptEvent(event)) this.emit('runtimeError', event.payload)
      }),
    )
  }

  private acceptEvent(event: { protocolVersion: number; sessionId: string; sceneId: string; sceneGeneration: number }): boolean {
    return event.protocolVersion === UNITY_EDITOR_PROTOCOL_VERSION &&
      event.sessionId === this.sessionId &&
      event.sceneId === this.sceneId &&
      event.sceneGeneration === this.sceneGeneration
  }

  private envelope<T>(payload: T) {
    return {
      protocolVersion: UNITY_EDITOR_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      sceneId: this.sceneId,
      sceneGeneration: this.sceneGeneration,
      requestId: randomId(),
      clientSequence: ++this.sequence,
      payload,
    }
  }

  private async send<TRequest, TResponse>(
    method: Parameters<UnityTransport['request']>[0],
    payload: TRequest,
  ) {
    const envelope = this.envelope(payload)
    const response = await this.transport.request<TRequest, TResponse>(method, envelope)
    if (response.protocolVersion !== UNITY_EDITOR_PROTOCOL_VERSION) {
      throw new Error(`Unity 响应协议版本不兼容：${response.protocolVersion}`)
    }
    if (response.requestId !== envelope.requestId) {
      throw new Error('Unity 响应 requestId 与请求不匹配')
    }
    return response
  }

  private assertSuccess(response: { success: boolean; error?: { message: string } }): void {
    if (!response.success) throw new Error(response.error?.message ?? 'Unity 命令执行失败')
  }
}
