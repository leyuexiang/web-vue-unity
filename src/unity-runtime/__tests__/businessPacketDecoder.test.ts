import { describe, expect, it } from 'vitest'
import { BusinessPacketDecoder } from '@/unity-runtime/connection/BusinessPacketDecoder'

const packet = (mark: number, text: string) => {
  const body = new TextEncoder().encode(text)
  const value = new Uint8Array(body.length + 1)
  value[0] = mark
  value.set(body, 1)
  return value.buffer
}

describe('BusinessPacketDecoder', () => {
  it('decodes full and fragmented UTF-8 messages', () => {
    const decoder = new BusinessPacketDecoder()
    expect(decoder.decode(packet(2, '{"ok":true}'))).toBe('{"ok":true}')
    expect(decoder.decode(packet(0, '{"message":"你'))).toBeNull()
    expect(decoder.decode(packet(255, '好"}'))).toBe('{"message":"你好"}')
  })

  it('rejects invalid fragment order and oversized messages', () => {
    const decoder = new BusinessPacketDecoder(4)
    expect(() => decoder.decode(packet(1, 'a'))).toThrow('顺序')
    expect(() => decoder.decode(packet(2, '12345'))).toThrow('过大')
  })
})
