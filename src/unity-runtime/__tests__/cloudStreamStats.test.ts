import { describe, expect, it } from 'vitest'
import { CloudStreamStats } from '../connection/cloudStreamStats'

const report = (timestamp: number, frames: number, overrides: Record<string, unknown> = {}) => new Map([
  ['video', { id: 'video', type: 'inbound-rtp', kind: 'video', timestamp, framesDecoded: frames,
    bytesReceived: frames * 10000, jitterBufferDelay: frames * 0.02, jitterBufferEmittedCount: frames,
    totalDecodeTime: frames * 0.003, codecId: 'codec', transportId: 'transport', ...overrides }],
  ['codec', { id: 'codec', type: 'codec', mimeType: 'video/H264' }],
  ['transport', { id: 'transport', type: 'transport', selectedCandidatePairId: 'pair' }],
  ['pair', { id: 'pair', type: 'candidate-pair', currentRoundTripTime: 0.012, remoteCandidateId: 'candidate' }],
  ['candidate', { id: 'candidate', type: 'remote-candidate', candidateType: 'host', protocol: 'udp' }],
]) as unknown as RTCStatsReport

describe('cloud stream performance samples', () => {
  it('uses interval deltas and leaves first-sample averages unknown', () => {
    const stats = new CloudStreamStats()
    expect(stats.read(report(1000, 1000), 0)).toMatchObject({ fps: null, decodeMs: null, jitterBufferMs: null })
    const result = stats.read(report(2000, 1060), 128)!
    expect(result).toMatchObject({ fps: 60, bitrateMbps: 4.8, rttMs: 12,
      codec: 'video/H264', candidateType: 'host', protocol: 'udp', inputBufferedBytes: 128 })
    expect(result.jitterBufferMs).toBeCloseTo(20)
    expect(result.decodeMs).toBeCloseTo(3)
  })

  it('does not report negative deltas after a counter reset or fabricate missing counters', () => {
    const stats = new CloudStreamStats()
    stats.read(report(1000, 1000), 0)
    expect(stats.read(report(2000, 10, { packetsLost: undefined, framesDropped: undefined }), 0))
      .toMatchObject({ fps: null, bitrateMbps: null, decodeMs: null, jitterBufferMs: null, packetsLost: null, framesDropped: null })
    stats.reset()
    expect(stats.read(report(3000, 70), 0)?.fps).toBeNull()
  })
})
