// Unity sends a one-byte PacketMark before UTF-8 JSON; browser requests are plain JSON.
export class BusinessPacketDecoder {
  private chunks: Uint8Array[] = []
  private size = 0
  private startedAt = 0
  constructor(private readonly maxBytes = 4 * 1024 * 1024) {}

  reset(): void { this.chunks = []; this.size = 0; this.startedAt = 0 }

  decode(data: string | ArrayBuffer): string | null {
    if (typeof data === 'string') { this.reset(); return data }
    const bytes = new Uint8Array(data)
    if (!bytes.length) throw new Error('空 RPC 数据包')
    const mark = bytes[0]
    const body = bytes.slice(1)
    if (mark === 2) {
      this.reset()
      if (body.length > this.maxBytes) throw new Error('RPC 数据包过大')
      return new TextDecoder('utf-8', { fatal: true }).decode(body)
    }
    if (mark === 0) { this.reset(); this.startedAt = Date.now() }
    else if ((mark !== 1 && mark !== 255) || !this.chunks.length) {
      this.reset(); throw new Error('RPC 分片顺序或标记无效')
    }
    this.size += body.length
    if (this.size > this.maxBytes || Date.now() - this.startedAt > 10000) {
      this.reset(); throw new Error('RPC 分片超限或超时')
    }
    this.chunks.push(body)
    if (mark !== 255) return null
    const complete = new Uint8Array(this.size)
    let offset = 0
    for (const chunk of this.chunks) { complete.set(chunk, offset); offset += chunk.length }
    this.reset()
    return new TextDecoder('utf-8', { fatal: true }).decode(complete)
  }
}
