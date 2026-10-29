import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudInputSender } from '../connection/CloudInputSender'
import { KEY_CODES } from '../connection/LegacyInputEncoder'

const rect = { left: 0, top: 0, width: 640, height: 360 } as DOMRect
const mouse = (type: string, x = 100, dx = 0, buttons = 0) =>
  ({ type, clientX: x, clientY: 100, movementX: dx, movementY: 0, buttons }) as MouseEvent
const state = (packet: ArrayBuffer) => new DataView(packet, 36)

describe('cloud input queue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = () => {
    const channel = { readyState: 'open' as RTCDataChannelState, bufferedAmount: 0, send: vi.fn() }
    return { channel, sender: new CloudInputSender(() => channel) }
  }

  it('coalesces high-frequency motion and preserves total relative movement', () => {
    const { channel, sender } = setup()
    for (let i = 1; i <= 20; i++) sender.pointer(mouse('mousemove', 100 + i, 1), rect, 1920, 1080)
    expect(channel.send).not.toHaveBeenCalled()
    vi.advanceTimersByTime(8)
    expect(channel.send).toHaveBeenCalledOnce()
    const packet = state(channel.send.mock.calls[0][0])
    expect(packet.getFloat32(0, true)).toBe(360)
    expect(packet.getFloat32(8, true)).toBe(60)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('flushes motion before button release and never replays a pressed button afterwards', () => {
    const { channel, sender } = setup()
    sender.pointer(mouse('mousedown', 100, 0, 1), rect, 640, 360)
    sender.pointer(mouse('mousemove', 110, 10, 1), rect, 640, 360)
    sender.pointer(mouse('mouseup', 110), rect, 640, 360)
    expect(channel.send).toHaveBeenCalledTimes(3)
    expect(channel.send.mock.calls.map(([packet]) => state(packet).getUint16(24, true))).toEqual([1, 1, 0])
    vi.advanceTimersByTime(100)
    expect(channel.send).toHaveBeenCalledTimes(3)
  })

  it('keeps only one motion sample during congestion and sends current position when drained', () => {
    const { channel, sender } = setup()
    channel.bufferedAmount = 8192
    sender.pointer(mouse('mousemove', 110, 10), rect, 640, 360)
    vi.advanceTimersByTime(80)
    sender.pointer(mouse('mousemove', 130, 20), rect, 640, 360)
    expect(channel.send).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)
    channel.bufferedAmount = 0
    vi.advanceTimersByTime(8)
    expect(channel.send).toHaveBeenCalledOnce()
    expect(state(channel.send.mock.calls[0][0]).getFloat32(0, true)).toBe(130)
    expect(state(channel.send.mock.calls[0][0]).getFloat32(8, true)).toBe(30)
  })

  it('delivers key-up and mouse-up even when motion is congested', () => {
    const { channel, sender } = setup()
    sender.keyboard({ type: 'keydown', code: 'KeyA' } as KeyboardEvent)
    channel.bufferedAmount = 300 * 1024
    sender.pointer(mouse('mousemove', 120, 20, 1), rect, 640, 360)
    sender.keyboard({ type: 'keyup', code: 'KeyA' } as KeyboardEvent)
    sender.pointer(mouse('mouseup', 120), rect, 640, 360)
    expect(channel.send).toHaveBeenCalledTimes(3)
    const keyboard = new Uint8Array(channel.send.mock.calls[1][0], 36)
    expect(keyboard[KEY_CODES.KeyA >> 3] & (1 << (KEY_CODES.KeyA & 7))).toBe(0)
    expect(state(channel.send.mock.calls[2][0]).getUint16(24, true)).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels pending motion on focus loss, disconnect and session reset', () => {
    const { channel, sender } = setup()
    sender.pointer(mouse('mousemove', 120, 20, 1), rect, 640, 360)
    sender.release()
    expect(channel.send).toHaveBeenCalledTimes(2)
    expect(state(channel.send.mock.calls[1][0]).getUint16(24, true)).toBe(0)
    sender.pointer(mouse('mousemove'), rect, 640, 360)
    channel.readyState = 'closed'
    vi.advanceTimersByTime(8)
    expect(vi.getTimerCount()).toBe(0)
    channel.readyState = 'open'
    sender.pointer(mouse('mousemove'), rect, 640, 360)
    sender.reset()
    expect(vi.getTimerCount()).toBe(0)
  })
})
