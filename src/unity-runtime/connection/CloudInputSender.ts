import { LegacyInputEncoder } from './LegacyInputEncoder'

const INPUT_INTERVAL_MS = 8
const MOTION_BUFFER_LIMIT = 4 * 1024
const STATE_OFFSET = 12 + 24

type InputChannel = Pick<RTCDataChannel, 'readyState' | 'bufferedAmount' | 'send'>

/** Keep motion current without putting hundreds of obsolete samples in SCTP's reliable queue. */
export class CloudInputSender {
  private readonly encoder = new LegacyInputEncoder()
  private pendingMotion: ArrayBuffer | null = null
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly getChannel: () => InputChannel | null) {}

  reset(): void {
    this.cancelMotion()
    this.encoder.reset()
  }

  pointer(event: MouseEvent | WheelEvent, rect: DOMRect, width: number, height: number): void {
    if (this.getChannel()?.readyState !== 'open') return
    if (event.type !== 'mousemove') this.flushMotion(true)
    const packet = this.encoder.pointer(event, rect, width, height)
    if (!packet) return
    if (event.type !== 'mousemove') {
      this.getChannel()!.send(packet)
      return
    }
    if (this.pendingMotion) {
      // Latest absolute position and timestamp, but preserve the total relative
      // movement for Unity's orbit / first-person controllers.
      const previous = new DataView(this.pendingMotion)
      const next = new DataView(packet)
      for (const offset of [STATE_OFFSET + 8, STATE_OFFSET + 12]) {
        next.setFloat32(offset, previous.getFloat32(offset, true) + next.getFloat32(offset, true), true)
      }
    }
    this.pendingMotion = packet
    this.scheduleMotion()
  }

  keyboard(event: KeyboardEvent): void {
    if (this.getChannel()?.readyState !== 'open') return
    this.flushMotion(true)
    const packet = this.encoder.keyboard(event)
    if (packet) this.getChannel()!.send(packet)
  }

  release(): void {
    this.cancelMotion()
    const packets = this.encoder.release()
    const channel = this.getChannel()
    if (channel?.readyState === 'open') packets.forEach(packet => channel.send(packet))
  }

  private scheduleMotion(): void {
    if (this.timer !== null) return
    this.timer = setTimeout(() => {
      this.timer = null
      this.flushMotion()
    }, INPUT_INTERVAL_MS)
  }

  private flushMotion(beforeStateChange = false): void {
    if (!this.pendingMotion) return
    const channel = this.getChannel()
    if (channel?.readyState !== 'open') { this.cancelMotion(); return }
    if (channel.bufferedAmount >= MOTION_BUFFER_LIMIT) {
      // Never delay or discard a button/key transition behind pending motion.
      if (beforeStateChange) this.cancelMotion()
      else this.scheduleMotion()
      return
    }
    const packet = this.pendingMotion
    this.cancelMotion()
    channel.send(packet)
  }

  private cancelMotion(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    this.pendingMotion = null
  }
}
