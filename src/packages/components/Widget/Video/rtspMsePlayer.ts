import type { VideoOption } from './config'
import type { ResolvedVideoStream, VideoStreamController, VideoStreamHooks } from './streamPlayer'
import { resetVideoElement } from './videoElement'

const MAX_QUEUE_BYTES = 16 * 1024 * 1024
const MAX_QUEUE_PACKETS = 512
const STREAM_TIMEOUT = 15000

/**
 * 兼容旧网关的“0x09 编码头 + 分片 MP4”协议，与 WS-FLV 显式区分。
 * 返回句柄后才异步打开连接，因此媒体源未打开时也能取消并回收资源。
 */
export const attachRtspMseStream = (
  video: HTMLVideoElement,
  stream: ResolvedVideoStream,
  option: VideoOption,
  hooks: VideoStreamHooks,
): VideoStreamController => {
  hooks.signal?.throwIfAborted()
  if (typeof MediaSource === 'undefined' || typeof WebSocket === 'undefined') {
    throw new Error('当前浏览器不支持媒体源扩展（MSE）或长连接（WebSocket）')
  }
  if (!stream.sourceUrl) throw new Error('请配置 RTSP 源地址')
  const endpoint = new URL(stream.url, window.location.href)
  // 按目标协议逐一转换，HTTP 页面访问安全网关时不能把 HTTPS/WSS 降为 WS。
  if (endpoint.protocol === 'http:') endpoint.protocol = 'ws:'
  else if (endpoint.protocol === 'https:') endpoint.protocol = 'wss:'
  if (!['ws:', 'wss:'].includes(endpoint.protocol)) throw new Error('RTSP-MSE 网关地址协议无效')
  if (window.location.protocol === 'https:' && endpoint.protocol === 'ws:') {
    throw new Error('HTTPS 页面请使用 WSS 视频网关')
  }
  endpoint.searchParams.set('url', stream.sourceUrl)
  const mediaSource = new MediaSource()
  const objectUrl = URL.createObjectURL(mediaSource)
  let socket: WebSocket | null = null
  let sourceBuffer: SourceBuffer | null = null
  let codecs = ''
  let disposed = false
  let timer: number | undefined
  let lastPacketAt = Date.now()
  let lastProgressAt = lastPacketAt
  // 保留分片引用，不复制大块数据；游标消费避免每次 shift 搬移整个队列。
  const queue: Array<ArrayBuffer | undefined> = []
  let head = 0
  let queueBytes = 0

  const destroy = () => {
    if (disposed) return
    disposed = true
    window.clearTimeout(timer)
    hooks.signal?.removeEventListener('abort', destroy)
    video.removeEventListener('play', handlePlay)
    mediaSource.removeEventListener('sourceopen', handleOpen)
    mediaSource.removeEventListener('sourceclose', handleSourceClose)
    mediaSource.removeEventListener('error', handleDecodeError)
    if (socket) {
      socket.onopen = null
      socket.onmessage = null
      socket.onerror = null
      socket.onclose = null
      socket.close()
      socket = null
    }
    if (sourceBuffer) {
      sourceBuffer.removeEventListener('updateend', handleUpdateEnd)
      sourceBuffer.removeEventListener('error', handleDecodeError)
      try {
        if (mediaSource.readyState === 'open') {
          if (sourceBuffer.updating) sourceBuffer.abort()
          mediaSource.removeSourceBuffer(sourceBuffer)
        }
      } catch {
        // 浏览器可能已因解码错误分离媒体源，仍继续释放对象地址和队列。
      }
      sourceBuffer = null
    }
    queue.length = 0
    head = 0
    queueBytes = 0
    resetVideoElement(video)
    URL.revokeObjectURL(objectUrl)
  }
  const fail = (message: string) => {
    if (disposed) return
    destroy()
    hooks.onError(message)
  }

  const chaseLiveEdge = () => {
    if (!option.isLive || !option.lowLatency || !video.buffered.length) return
    const index = video.buffered.length - 1
    const end = video.buffered.end(index)
    // 始终落在缓冲区内部，旧实现的 end + 1 会进入未缓冲区域而卡住。
    if (end - video.currentTime > 2) {
      video.currentTime = Math.max(video.buffered.start(index), end - 0.1)
    }
  }
  const handlePlay = () => {
    if (!disposed) chaseLiveEdge()
  }
  const pruneBuffer = () => {
    if (!sourceBuffer || !sourceBuffer.buffered.length) return false
    const ranges = sourceBuffer.buffered
    const end = ranges.end(ranges.length - 1)
    const retention = option.lowLatency ? 15 : 30
    // 暂停实时视频也只保留最近片段，正在播放时同时限制前向积压，防止后台页无限占用缓存。
    const anchor = option.isLive && video.paused ? end : video.currentTime
    const cutoff = Math.max(0, anchor - retention, option.isLive ? end - 60 : 0)
    if (cutoff > ranges.start(0) + 5) {
      sourceBuffer.remove(0, cutoff)
      return true
    }
    return false
  }
  const appendNext = () => {
    if (disposed || !sourceBuffer || sourceBuffer.updating || mediaSource.readyState !== 'open')
      return
    try {
      if (pruneBuffer()) return
      const packet = queue[head]
      if (!packet) return
      sourceBuffer.appendBuffer(packet)
      queue[head++] = undefined
      queueBytes -= packet.byteLength
      if (head === queue.length) {
        queue.length = 0
        head = 0
      } else if (head >= 256) {
        queue.splice(0, head)
        head = 0
      }
    } catch {
      fail('RTSP-MSE 媒体缓存写入失败，请检查码率及视频编码')
    }
  }
  const handleUpdateEnd = () => {
    if (disposed) return
    lastProgressAt = Date.now()
    if (!video.paused) chaseLiveEdge()
    appendNext()
  }
  const handleDecodeError = () => fail('RTSP-MSE 媒体解码失败，请检查视频编码')
  const handleSourceClose = () => fail('RTSP-MSE 媒体源已关闭')
  const handleMessage = (event: MessageEvent<unknown>) => {
    if (disposed) return
    if (!(event.data instanceof ArrayBuffer) || event.data.byteLength === 0) {
      fail('RTSP-MSE 网关未返回有效二进制分片')
      return
    }
    const bytes = new Uint8Array(event.data)
    try {
      if (bytes[0] === 9) {
        // 编码头应很短，避免错误网关把大块视频误作为字符串解码。
        if (bytes.byteLength > 1024) throw new Error('编码头超长')
        const nextCodecs = new TextDecoder().decode(bytes.subarray(1)).trim()
        if (sourceBuffer) {
          if (nextCodecs !== codecs) fail('RTSP-MSE 视频编码发生变化，需要重新连接')
          return
        }
        const mime = `video/mp4; codecs="${nextCodecs}"`
        if (!nextCodecs || !MediaSource.isTypeSupported(mime)) {
          fail('当前浏览器不支持 RTSP-MSE 网关输出的视频编码')
          return
        }
        codecs = nextCodecs
        sourceBuffer = mediaSource.addSourceBuffer(mime)
        sourceBuffer.mode = 'segments'
        sourceBuffer.addEventListener('updateend', handleUpdateEnd)
        sourceBuffer.addEventListener('error', handleDecodeError)
        appendNext()
        return
      }
      if (!sourceBuffer) {
        fail('RTSP-MSE 网关必须先发送视频编码说明')
        return
      }
      if (
        queueBytes + bytes.byteLength > MAX_QUEUE_BYTES ||
        queue.length - head >= MAX_QUEUE_PACKETS
      ) {
        fail('RTSP-MSE 分片积压超出缓存上限，请降低码率或检查网络')
        return
      }
      lastPacketAt = Date.now()
      queue.push(event.data)
      queueBytes += bytes.byteLength
      appendNext()
    } catch {
      fail('RTSP-MSE 编码信息或媒体分片处理失败')
    }
  }
  const handleOpen = () => {
    if (disposed || socket) return
    try {
      socket = new WebSocket(endpoint.href)
      socket.binaryType = 'arraybuffer'
      socket.onmessage = handleMessage
      socket.onerror = () => fail('RTSP-MSE 长连接失败，请检查网关地址与网络')
      socket.onclose = () => fail('RTSP-MSE 长连接已断开')
    } catch {
      fail('RTSP-MSE 无法建立长连接')
    }
  }
  const watchProgress = () => {
    if (disposed) return
    const now = Date.now()
    if (now - lastPacketAt >= STREAM_TIMEOUT || now - lastProgressAt >= STREAM_TIMEOUT) {
      fail('RTSP-MSE 接收或处理视频流超时')
      return
    }
    timer = window.setTimeout(watchProgress, 5000)
  }
  hooks.signal?.addEventListener('abort', destroy, { once: true })
  mediaSource.addEventListener('sourceopen', handleOpen)
  mediaSource.addEventListener('sourceclose', handleSourceClose)
  mediaSource.addEventListener('error', handleDecodeError)
  video.addEventListener('play', handlePlay)
  timer = window.setTimeout(watchProgress, STREAM_TIMEOUT)
  try {
    video.src = objectUrl
    video.load()
  } catch (error) {
    destroy()
    throw error
  }
  return { destroy }
}
