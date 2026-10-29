import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegacyConnectionSnapshot } from '../connection/LegacyUnityTransport'
import { waitForCloudRuntimeReady } from '../connection/waitForCloudRuntimeReady'

const createSource = (ready = false) => {
  let listener: (snapshot: LegacyConnectionSnapshot) => void = () => {}
  const unsubscribe = vi.fn()
  const snapshot: LegacyConnectionSnapshot = {
    state: 'connected', message: 'channel open', connectionId: 'test',
    videoReady: false, inputReady: true, rpcReady: true, runtimeReady: ready, peerState: 'connected',
  }
  return {
    unsubscribe,
    emit: (patch: Partial<LegacyConnectionSnapshot>) => listener({ ...snapshot, ...patch }),
    onSnapshot: (callback: typeof listener) => { listener = callback; callback(snapshot); return unsubscribe },
  }
}

describe('cloud runtime receiver handshake', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('does not initialize on channel open before Unity binds its receiver', async () => {
    const source = createSource()
    const initialized = vi.fn()
    const pending = waitForCloudRuntimeReady(source).then(initialized)
    await vi.advanceTimersByTimeAsync(1000)
    expect(initialized).not.toHaveBeenCalled()
    source.emit({ runtimeReady: true })
    await pending
    expect(initialized).toHaveBeenCalledOnce()
    expect(source.unsubscribe).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('accepts a handshake received before subscribing and removes the listener', async () => {
    const source = createSource(true)
    await waitForCloudRuntimeReady(source)
    expect(source.unsubscribe).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports a disconnected renderer while waiting', async () => {
    const source = createSource()
    const pending = waitForCloudRuntimeReady(source)
    const rejected = expect(pending).rejects.toThrow('renderer stopped')
    source.emit({ state: 'closed', message: 'renderer stopped' })
    await rejected
    expect(source.unsubscribe).toHaveBeenCalledOnce()
  })

  it('bounds the wait when an older player never announces readiness', async () => {
    const source = createSource()
    const pending = waitForCloudRuntimeReady(source, 100)
    const rejected = expect(pending).rejects.toThrow('Runtime 就绪握手超时')
    await vi.advanceTimersByTimeAsync(100)
    await rejected
    expect(source.unsubscribe).toHaveBeenCalledOnce()
  })
})
