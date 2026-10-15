import { describe, expect, it, vi } from 'vitest'
import { createDefaultTransform, createEmptyScene } from '@/scene-core'
import type {
  UnityEventEnvelope,
  UnityRuntimeCapabilities,
  UnityTransport,
} from '@/unity-runtime'
import { JsonRpcUnityCloudRuntime, UNITY_EDITOR_PROTOCOL_VERSION } from '@/unity-runtime'

const capabilities: UnityRuntimeCapabilities = {
  sceneTypes: ['local3d'],
  objectTypes: ['model'],
  gizmoModes: ['translate', 'rotate', 'scale'],
  features: {},
}

type EventListener = (event: UnityEventEnvelope<unknown>) => void

type TransportOptions = {
  responseProtocolVersion?: number
  responseRequestId?: string
  initializeSuccess?: boolean
  gizmoSuccess?: boolean
}

const createTransport = (options: TransportOptions = {}) => {
  const subscribers = new Map<string, EventListener>()
  const request = vi.fn(async (method: string, envelope: { requestId: string }) => ({
    protocolVersion: options.responseProtocolVersion ?? UNITY_EDITOR_PROTOCOL_VERSION,
    requestId: options.responseRequestId ?? envelope.requestId,
    success: method === 'editor.v1.session.initialize'
      ? options.initializeSuccess !== false
      : method !== 'editor.v1.gizmo.mode.set' || options.gizmoSuccess !== false,
    payload: method === 'editor.v1.session.initialize'
      ? {
          protocolVersion: UNITY_EDITOR_PROTOCOL_VERSION,
          capabilities,
        }
      : {},
    error: options.initializeSuccess === false
      ? { code: 'INITIALIZE_FAILED', message: '初始化失败' }
      : options.gizmoSuccess === false && method === 'editor.v1.gizmo.mode.set'
        ? { code: 'RUNTIME_BUSY', message: 'Runtime 忙碌' }
        : undefined,
  }))
  const transport: UnityTransport = {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    request: request as UnityTransport['request'],
    notify: vi.fn(),
    subscribe: vi.fn((type, listener) => {
      subscribers.set(type, listener as EventListener)
      return () => subscribers.delete(type)
    }) as UnityTransport['subscribe'],
  }
  return { transport, request, subscribers }
}

const createEvent = (
  request: ReturnType<typeof vi.fn>,
  overrides: Partial<UnityEventEnvelope<{ instanceId: string | null }>> = {},
): UnityEventEnvelope<{ instanceId: string | null }> => {
  const loadEnvelope = request.mock.calls[1]?.[1] as {
    sessionId: string
    sceneId: string
    sceneGeneration: number
  }
  return {
    protocolVersion: UNITY_EDITOR_PROTOCOL_VERSION,
    sessionId: loadEnvelope.sessionId,
    sceneId: loadEnvelope.sceneId,
    sceneGeneration: loadEnvelope.sceneGeneration,
    eventId: 'event-1',
    type: 'editor.v1.selection.changed',
    payload: { instanceId: 'object-1' },
    ...overrides,
  }
}

describe('JsonRpcUnityCloudRuntime', () => {
  it('negotiates capabilities and sends a versioned scene load', async () => {
    const { transport, request } = createTransport()
    const runtime = new JsonRpcUnityCloudRuntime(transport)
    await runtime.connect()
    await runtime.loadScene(createEmptyScene('scene-1'))
    expect(runtime.capabilities?.sceneTypes).toEqual(['local3d'])
    expect(request).toHaveBeenNthCalledWith(
      2,
      'editor.v1.scene.loadDraft',
      expect.objectContaining({
        protocolVersion: UNITY_EDITOR_PROTOCOL_VERSION,
        sceneId: 'scene-1',
        sceneGeneration: 1,
        payload: {
          sceneId: 'scene-1',
          revisionNo: 0,
          sceneType: 'local3d',
          objects: [],
          resources: [],
        },
      }),
    )
  })

  it('sends supported gizmo modes to Unity and keeps select mode local', async () => {
    const { transport, request } = createTransport()
    const runtime = new JsonRpcUnityCloudRuntime(transport)
    await runtime.connect()

    await runtime.setGizmoMode('select')
    expect(request).toHaveBeenCalledOnce()

    await runtime.setGizmoMode('rotate')
    expect(request).toHaveBeenNthCalledWith(
      2,
      'editor.v1.gizmo.mode.set',
      expect.objectContaining({ payload: { mode: 'rotate' } }),
    )
  })

  it('rejects gizmo modes that Unity did not advertise', async () => {
    const { transport, request } = createTransport()
    const runtime = new JsonRpcUnityCloudRuntime(transport)
    await runtime.connect()
    runtime.capabilities = { ...capabilities, gizmoModes: ['translate'] }

    await expect(runtime.setGizmoMode('rotate')).rejects.toThrow('不支持 Gizmo 模式')
    expect(request).toHaveBeenCalledOnce()
  })

  it('reports Unity failures when changing gizmo mode', async () => {
    const { transport } = createTransport({ gizmoSuccess: false })
    const runtime = new JsonRpcUnityCloudRuntime(transport)
    await runtime.connect()
    await expect(runtime.setGizmoMode('translate')).rejects.toThrow('Runtime 忙碌')
  })

  it('loads and clears the current Unity scene without changing the web scene store', async () => {
    const { transport, request } = createTransport()
    const runtime = new JsonRpcUnityCloudRuntime(transport)
    await runtime.connect()
    await runtime.loadScene(createEmptyScene('scene-1'))
    await runtime.clearScene()
    expect(request).toHaveBeenNthCalledWith(3, 'editor.v1.scene.clear', expect.objectContaining({
      sceneId: 'scene-1',
      sceneGeneration: 2,
      payload: {},
    }))
  })

  it('sends selection and object transform edits against the current scene generation', async () => {
    const { transport, request } = createTransport()
    const runtime = new JsonRpcUnityCloudRuntime(transport)
    const scene = createEmptyScene('scene-1')
    const object = {
      instanceId: 'object-1',
      objectType: 'primitive' as const,
      name: '演示立方体',
      visible: true,
      locked: false,
      transform: createDefaultTransform(),
      resourceRefKeys: [],
      properties: { primitiveType: 'cube' },
    }
    scene.objects.push(object)

    await runtime.connect()
    await runtime.loadScene(scene)
    runtime.setSelection(object.instanceId)
    await runtime.updateObject({ ...object, transform: { ...object.transform, position: [1, 2, 3] } })

    expect(transport.notify).toHaveBeenCalledWith('editor.v1.selection.set', expect.objectContaining({
      sceneId: 'scene-1',
      sceneGeneration: 1,
      payload: { instanceId: 'object-1' },
    }))
    expect(request).toHaveBeenNthCalledWith(3, 'editor.v1.object.update', expect.objectContaining({
      sceneId: 'scene-1',
      sceneGeneration: 1,
      payload: expect.objectContaining({ instanceId: 'object-1', transform: expect.objectContaining({ position: [1, 2, 3] }) }),
    }))
  })

  it('disconnects and removes event subscriptions when initialization fails', async () => {
    const { transport, subscribers } = createTransport({ initializeSuccess: false })
    const runtime = new JsonRpcUnityCloudRuntime(transport)
    await expect(runtime.connect()).rejects.toThrow('初始化失败')
    expect(transport.disconnect).toHaveBeenCalledOnce()
    expect(subscribers.size).toBe(0)
    expect(runtime.capabilities).toBeNull()
  })

  it('rejects mismatched response protocol versions and request ids', async () => {
    const wrongVersion = createTransport({ responseProtocolVersion: 2 })
    await expect(new JsonRpcUnityCloudRuntime(wrongVersion.transport).connect())
      .rejects.toThrow('响应协议版本不兼容')

    const wrongRequest = createTransport({ responseRequestId: 'wrong-request' })
    await expect(new JsonRpcUnityCloudRuntime(wrongRequest.transport).connect())
      .rejects.toThrow('requestId')
  })

  it('accepts only current protocol, session and scene generation events', async () => {
    const { transport, request, subscribers } = createTransport()
    const runtime = new JsonRpcUnityCloudRuntime(transport)
    const listener = vi.fn()
    runtime.on('selectionChanged', listener)
    await runtime.connect()
    await runtime.loadScene(createEmptyScene('scene-1'))

    const selectionListener = subscribers.get('editor.v1.selection.changed')
    expect(selectionListener).toBeDefined()
    selectionListener?.(createEvent(request))
    selectionListener?.(createEvent(request, { protocolVersion: 2 }))
    selectionListener?.(createEvent(request, { sceneGeneration: 0 }))
    selectionListener?.(createEvent(request, { sessionId: 'stale-session' }))

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({ instanceId: 'object-1' })
  })
})
