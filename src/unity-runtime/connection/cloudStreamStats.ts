export interface CloudStreamPerformance {
  codec: string | null
  decoder: string | null
  width: number | null
  height: number | null
  fps: number | null
  bitrateMbps: number | null
  rttMs: number | null
  jitterBufferMs: number | null
  decodeMs: number | null
  packetsLost: number | null
  framesDropped: number | null
  inputBufferedBytes: number
  candidateType: string | null
  protocol: string | null
}

// RTCStatsReport entries vary between browser versions. Missing counters remain
// unknown; they must not be reported as zero latency or zero loss.
type VideoSample = {
  id: string; timestamp: number; framesDecoded?: number; bytesReceived?: number
  jitterBufferDelay?: number; jitterBufferEmittedCount?: number; totalDecodeTime?: number
}

export class CloudStreamStats {
  private previous: VideoSample | null = null

  reset(): void { this.previous = null }

  read(report: RTCStatsReport, inputBufferedBytes: number): CloudStreamPerformance | null {
    const entries: RTCStats[] = []
    report.forEach(entry => entries.push(entry))
    const video = entries.find((entry: RTCStats & { kind?: string; mediaType?: string }) =>
      entry.type === 'inbound-rtp' && (entry.kind === 'video' || entry.mediaType === 'video')) as
      (VideoSample & { codecId?: string; decoderImplementation?: string; frameWidth?: number; frameHeight?: number
        framesPerSecond?: number; packetsLost?: number; framesDropped?: number; transportId?: string }) | undefined
    if (!video) return null
    const previous = this.previous?.id === video.id ? this.previous : null
    const seconds = previous ? (video.timestamp - previous.timestamp) / 1000 : 0
    const delta = (key: keyof Omit<VideoSample, 'id'>): number | null => {
      const now = video[key], before = previous?.[key]
      return seconds > 0 && typeof now === 'number' && typeof before === 'number' && now >= before ? now - before : null
    }
    const averageMs = (total: number | null, count: number | null) =>
      total !== null && count !== null && count > 0 ? total / count * 1000 : null
    const frames = delta('framesDecoded'), bytes = delta('bytesReceived')
    const transport = video.transportId ? report.get(video.transportId) : undefined
    const pair = transport?.selectedCandidatePairId ? report.get(transport.selectedCandidatePairId) :
      entries.find((entry: RTCStats & { nominated?: boolean; state?: string }) =>
        entry.type === 'candidate-pair' && entry.nominated && entry.state === 'succeeded')
    const candidate = pair?.remoteCandidateId ? report.get(pair.remoteCandidateId) : undefined
    const result: CloudStreamPerformance = {
      codec: video.codecId ? report.get(video.codecId)?.mimeType ?? null : null,
      decoder: video.decoderImplementation ?? null,
      width: video.frameWidth ?? null, height: video.frameHeight ?? null,
      fps: frames !== null ? frames / seconds : video.framesPerSecond ?? null,
      bitrateMbps: bytes !== null ? bytes * 8 / seconds / 1e6 : null,
      rttMs: typeof pair?.currentRoundTripTime === 'number' ? pair.currentRoundTripTime * 1000 : null,
      jitterBufferMs: averageMs(delta('jitterBufferDelay'), delta('jitterBufferEmittedCount')),
      decodeMs: averageMs(delta('totalDecodeTime'), frames),
      packetsLost: video.packetsLost ?? null, framesDropped: video.framesDropped ?? null,
      inputBufferedBytes, candidateType: candidate?.candidateType ?? null, protocol: candidate?.protocol ?? null,
    }
    // Copy counters: reports (including browser test doubles) may reuse objects.
    this.previous = { id: video.id, timestamp: video.timestamp, framesDecoded: video.framesDecoded,
      bytesReceived: video.bytesReceived, jitterBufferDelay: video.jitterBufferDelay,
      jitterBufferEmittedCount: video.jitterBufferEmittedCount, totalDecodeTime: video.totalDecodeTime }
    return result
  }
}
