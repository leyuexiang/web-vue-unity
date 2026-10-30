import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LegacyUnityTransport, type LegacyConnectionSnapshot } from '../connection/LegacyUnityTransport'
import { waitForCloudRuntimeReady } from '../connection/waitForCloudRuntimeReady'

/** 回放信令消息而不连接真实服务，验证异常终态不会被正常关闭事件抢先消费。 */
class TestSocket extends EventTarget {
  static OPEN = 1
  static CLOSED = 3
  static current: TestSocket
  readyState = TestSocket.OPEN
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  constructor(_url: string) { super(); TestSocket.current = this }
  send(text: string) {
    if (JSON.parse(text).type === 'disconnect') {
      this.onmessage?.({ data: JSON.stringify({ type: 'disconnectAck' }) })
      this.close()
    }
  }
  close() { this.readyState = TestSocket.CLOSED; this.dispatchEvent(new Event('close')); this.onclose?.() }
  signal(type: string) { this.onmessage?.({ data: JSON.stringify({ type, message: '渲染机进程已关闭' }) }) }
}

describe('云渲染异常断开终态', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('WebSocket', TestSocket)
    vi.stubGlobal('MediaStream', class { getTracks() { return [] } })
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  const connect = async () => {
    const transport = new LegacyUnityTransport(
      { signalUrl: 'ws://test.invalid', appId: '1', sceneKey: 'test' },
      { dataset: {}, srcObject: null } as unknown as HTMLVideoElement,
    )
    const pending = transport.connect()
    TestSocket.current.onopen?.()
    await pending
    return transport
  }

  it.each(['rendererUnregister', 'launcherUnregister', 'launcherTempClose', 'WSClose'])(
    '%s 在初始化等待期间直接通知失败，不先发送正常关闭', async (signal) => {
      const transport = await connect()
      const terminal: LegacyConnectionSnapshot['state'][] = []
      const stop = transport.onSnapshot(({ state }) => {
        if (state === 'closed' || state === 'failed') terminal.push(state)
      })
      const waiting = expect(waitForCloudRuntimeReady(transport)).rejects.toThrow('渲染机进程已关闭')
      TestSocket.current.signal(signal)
      await waiting
      expect(terminal).toEqual(['failed'])
      stop()
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('主动退出只发送正常关闭终态', async () => {
    const transport = await connect()
    const terminal: string[] = []
    const stop = transport.onSnapshot(({ state }) => {
      if (state === 'closed' || state === 'failed') terminal.push(state)
    })
    await transport.disconnect()
    expect(terminal).toEqual(['closed'])
    stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
