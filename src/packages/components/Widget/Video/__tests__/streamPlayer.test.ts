import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Config from '../config'
import { attachVideoStream } from '../streamPlayer'
import type { VideoStreamResolution } from '../streamModel'

// 用独立的媒体对象替身验证传输契约和资源释放，不访问真实摄像头。
const SDP = 'v=0\r\ns=-\r\nt=0 0\r\n'
const ranges = (start = 0, end = 0) => ({
  length: end > start ? 1 : 0,
  start: () => start,
  end: () => end,
})
class Video extends EventTarget {
  src = ''
  srcObject: unknown = null
  paused = false
  currentTime = 0
  buffered = ranges()
  pause = vi.fn()
  load = vi.fn()
  removeAttribute = vi.fn(() => {
    this.src = ''
  })
}
class Stream {
  tracks: MediaStreamTrack[] = []
  addTrack(track: MediaStreamTrack) {
    this.tracks.push(track)
  }
  getTracks() {
    return this.tracks
  }
}
class Peer extends EventTarget {
  static instances: Peer[] = []
  iceGatheringState = 'complete'
  connectionState = 'new'
  localDescription = { sdp: SDP }
  addTransceiver = vi.fn()
  createOffer = vi.fn(async () => ({ sdp: SDP, type: 'offer' }))
  setLocalDescription = vi.fn(async () => undefined)
  setRemoteDescription = vi.fn(async () => undefined)
  close = vi.fn()
  constructor() {
    super()
    Peer.instances.push(this)
  }
}
class BufferSource extends EventTarget {
  mode = 'segments'
  updating = false
  buffered = ranges()
  appendBuffer = vi.fn((_data: ArrayBuffer) => {
    this.updating = true
  })
  remove = vi.fn((_start: number, end: number) => {
    this.buffered = ranges(end, this.buffered.end())
    this.updating = true
  })
  abort = vi.fn()
  finish() {
    this.updating = false
    this.dispatchEvent(new Event('updateend'))
  }
}
class Source extends EventTarget {
  static instances: Source[] = []
  // 故意只支持包含 codecs 的类型：不能拿 video/mp4 的空探测结果拒绝浏览器。
  static isTypeSupported = vi.fn((type: string) => type.includes('avc1'))
  readyState = 'closed'
  buffer = new BufferSource()
  addSourceBuffer = vi.fn(() => this.buffer)
  removeSourceBuffer = vi.fn()
  constructor() {
    super()
    Source.instances.push(this)
  }
  open() {
    this.readyState = 'open'
    this.dispatchEvent(new Event('sourceopen'))
  }
}
class Socket extends EventTarget {
  static instances: Socket[] = []
  binaryType = ''
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  close = vi.fn()
  constructor(public url: string) {
    super()
    Socket.instances.push(this)
  }
  emit(type: string, data?: unknown) {
    const event = type === 'message' ? new MessageEvent(type, { data }) : new Event(type)
    this.dispatchEvent(event)
    if (type === 'message') this.onmessage?.(event as MessageEvent)
    else if (type === 'open') this.onopen?.()
    else if (type === 'error') this.onerror?.()
    else if (type === 'close') this.onclose?.()
  }
}
const codecPacket = (codecs = 'avc1.64001f') =>
  new Uint8Array([9, ...new TextEncoder().encode(codecs)]).buffer
const resolution = (protocol: 'rtsp-webrtc' | 'rtsp-mse' | 'webrtc', url = '/gateway') =>
  ({
    ok: true,
    protocol,
    url,
    sourceUrl: 'rtsp://camera.example.com/live',
  }) as Extract<VideoStreamResolution, { ok: true }>
const tick = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

describe('视频网关传输与清理', () => {
  let video: Video
  let onError: ReturnType<typeof vi.fn>
  let abort: AbortController
  const controllers: Array<{ destroy: () => unknown }> = []
  beforeEach(() => {
    vi.useFakeTimers()
    Peer.instances = []
    Source.instances = []
    Socket.instances = []
    video = new Video()
    onError = vi.fn()
    abort = new AbortController()
    vi.stubGlobal('window', {
      location: {
        origin: 'https://editor.example.com',
        href: 'https://editor.example.com/editor',
        protocol: 'https:',
      },
      setTimeout,
      clearTimeout,
    })
    vi.stubGlobal('RTCPeerConnection', Peer)
    vi.stubGlobal('MediaStream', Stream)
    vi.stubGlobal('MediaSource', Source)
    vi.stubGlobal('WebSocket', Socket)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ sdp: btoa(SDP) }))),
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:video-test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  })
  afterEach(async () => {
    abort.abort()
    for (const controller of controllers.splice(0)) await controller.destroy()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  const attach = async (
    protocol: 'rtsp-webrtc' | 'rtsp-mse' | 'webrtc',
    url?: string,
    option = new Config().option,
  ) => {
    const controller = await attachVideoStream(
      video as unknown as HTMLVideoElement,
      resolution(protocol, url),
      option,
      { onError, signal: abort.signal },
    )
    controllers.push(controller)
    return controller
  }
  const startMse = async (url?: string) => {
    const pending = attach('rtsp-mse', url)
    await tick()
    const source = Source.instances[0]!
    source.open()
    const socket = Socket.instances[0]!
    socket.emit('open')
    return { controller: await pending, source, socket, buffer: source.buffer }
  }

  it('私有信令发送源流及 Base64 请求，并解码 JSON 应答', async () => {
    await attach('rtsp-webrtc')
    const request = vi.mocked(fetch).mock.calls[0]![1]!
    expect(JSON.parse(request.body as string)).toEqual({
      rtspUrl: 'rtsp://camera.example.com/live',
      sdp: btoa(SDP),
    })
    expect(Peer.instances[0]!.setRemoteDescription).toHaveBeenCalledWith({
      type: 'answer',
      sdp: SDP,
    })
  })
  it.each(['', '{}', '{"sdp":123}', '<html>index</html>', '{"sdp":"garbage"}'])(
    '畸形应答回收连接且不泄露返回正文：%s',
    async (body) => {
      vi.mocked(fetch).mockResolvedValue(new Response(body))
      await expect(attach('rtsp-webrtc')).rejects.toThrow(/应答/)
      expect(Peer.instances[0]!.close).toHaveBeenCalledOnce()
    },
  )
  it('协商失败回收连接', async () => {
    const pending = attach('rtsp-webrtc')
    Peer.instances[0]!.setRemoteDescription.mockRejectedValue(new Error('无效协商'))
    await expect(pending).rejects.toThrow()
    expect(Peer.instances[0]!.close).toHaveBeenCalledOnce()
  })
  it('等待信令时取消会立即关闭连接，晚返回的应答不再生效', async () => {
    let reply!: (value: Response) => void
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          reply = resolve
        }),
    )
    const pending = attach('rtsp-webrtc')
    await tick()
    abort.abort()
    expect(Peer.instances[0]!.close).toHaveBeenCalledOnce()
    reply(new Response(JSON.stringify({ sdp: btoa(SDP) })))
    await expect(pending).rejects.toThrow()
    expect(Peer.instances[0]!.setRemoteDescription).not.toHaveBeenCalled()
  })
  it('原标准 WHEP 保留原文 SDP 与会话删除契约', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(SDP, { status: 201, headers: { Location: '/session/1' } }),
    )
    const controller = await attach('webrtc')
    expect(vi.mocked(fetch).mock.calls[0]![1]!.body).toBe(SDP)
    await controller.destroy()
    expect(fetch).toHaveBeenLastCalledWith(
      'https://editor.example.com/session/1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
  it('只按网关声明编码探测 MSE，保留安全地址和查询参数', async () => {
    const { socket } = await startMse('wss://media.example.com/feed?channel=2&url=old')
    socket.emit('message', codecPacket())
    expect(Source.isTypeSupported).toHaveBeenCalledWith('video/mp4; codecs="avc1.64001f"')
    const url = new URL(socket.url)
    expect(url.protocol).toBe('wss:')
    expect(url.searchParams.get('channel')).toBe('2')
    expect(url.searchParams.getAll('url')).toEqual(['rtsp://camera.example.com/live'])
  })
  it('分片按顺序串行写入，并释放销毁后的所有资源', async () => {
    const { socket, buffer, controller } = await startMse()
    socket.emit('message', codecPacket())
    const first = new Uint8Array([0, 1]).buffer
    const second = new Uint8Array([0, 2]).buffer
    socket.emit('message', first)
    socket.emit('message', second)
    expect(buffer.appendBuffer).toHaveBeenCalledTimes(1)
    buffer.finish()
    expect(buffer.appendBuffer.mock.calls.map(([chunk]) => chunk)).toEqual([first, second])
    controller.destroy()
    controller.destroy()
    expect(socket.close).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    socket.emit('message', first)
    buffer.finish()
    expect(buffer.appendBuffer).toHaveBeenCalledTimes(2)
  })
  it.each(['close', 'error'])('连接%s触发错误通知', async (event) => {
    const { socket } = await startMse()
    socket.emit(event)
    expect(onError).toHaveBeenCalledOnce()
    expect(socket.close).toHaveBeenCalledOnce()
  })
  it('不支持的编码通过错误回调上报，不从事件处理器抛异常', async () => {
    const { socket } = await startMse()
    expect(() => socket.emit('message', codecPacket('unsupported'))).not.toThrow()
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('编码'))
  })
  it('重复编码头不创建额外 SourceBuffer', async () => {
    const { socket, source } = await startMse()
    socket.emit('message', codecPacket())
    socket.emit('message', codecPacket())
    expect(source.addSourceBuffer).toHaveBeenCalledOnce()
  })
  it('持续积压达到上限会回收连接，不无限保存分片', async () => {
    const { socket, buffer } = await startMse()
    socket.emit('message', codecPacket())
    buffer.updating = true
    const packet = new ArrayBuffer(1024 * 1024)
    for (let i = 0; i < 40; i++) socket.emit('message', packet)
    expect(onError).toHaveBeenCalledOnce()
    expect(socket.close).toHaveBeenCalledOnce()
  })
  it('清除过期缓存先于新分片写入，恢复后跳到直播尾部以内', async () => {
    const { socket, buffer } = await startMse()
    socket.emit('message', codecPacket())
    video.currentTime = 95
    video.buffered = ranges(0, 100)
    buffer.buffered = ranges(0, 100)
    socket.emit('message', new ArrayBuffer(10))
    expect(buffer.remove).toHaveBeenCalled()
    expect(buffer.appendBuffer).not.toHaveBeenCalled()
    buffer.finish()
    expect(buffer.appendBuffer).toHaveBeenCalledOnce()
    video.dispatchEvent(new Event('play'))
    expect(video.currentTime).toBeGreaterThan(99)
    expect(video.currentTime).toBeLessThan(100)
  })
  it('媒体源尚未打开就取消，不创建长连接且撤销对象地址', async () => {
    const pending = attach('rtsp-mse').catch(() => undefined)
    await tick()
    abort.abort()
    Source.instances[0]!.open()
    await pending
    expect(Socket.instances).toHaveLength(0)
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
  })
  it('没有收到媒体分片时超时，不永久停在连接中', async () => {
    await startMse()
    await vi.advanceTimersByTimeAsync(20000)
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('超时'))
  })

  it('两个 MSE 实例互相独立，销毁其一不关闭另一个', async () => {
    const first = await startMse()
    const otherVideo = new Video()
    const second = await attachVideoStream(
      otherVideo as unknown as HTMLVideoElement,
      resolution('rtsp-mse'),
      new Config().option,
      { onError },
    )
    controllers.push(second)
    Source.instances[1]!.open()
    const otherSocket = Socket.instances[1]!
    first.controller.destroy()
    otherSocket.emit('message', codecPacket())
    otherSocket.emit('message', new ArrayBuffer(20))
    expect(otherSocket.close).not.toHaveBeenCalled()
    expect(Source.instances[1]!.buffer.appendBuffer).toHaveBeenCalledOnce()
  })
  it('HTTP 页面访问 HTTPS 网关仍使用 WSS', async () => {
    Object.assign(window.location, { protocol: 'http:', href: 'http://editor.example.com/editor' })
    const { socket } = await startMse('https://media.example.com/feed')
    expect(new URL(socket.url).protocol).toBe('wss:')
  })
  it('HTTPS 页面及时提示不安全的长连接地址', async () => {
    await expect(attach('rtsp-mse', 'ws://media.example.com/feed')).rejects.toThrow('WSS')
    expect(Source.instances).toHaveLength(0)
  })
  it('缓冲写入配额错误关闭连接并通知组件', async () => {
    const { socket, buffer } = await startMse()
    socket.emit('message', codecPacket())
    buffer.appendBuffer.mockImplementationOnce(() => {
      throw new DOMException('配额不足', 'QuotaExceededError')
    })
    socket.emit('message', new ArrayBuffer(10))
    expect(onError).toHaveBeenCalledOnce()
    expect(socket.close).toHaveBeenCalledOnce()
  })
  it('取消候选收集释放等待计时器，不发送信令', async () => {
    const pending = attach('rtsp-webrtc')
    Peer.instances[0]!.iceGatheringState = 'gathering'
    await tick()
    abort.abort()
    await expect(pending).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('网关返回错误状态也关闭 WebRTC 连接', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 503 }))
    await expect(attach('rtsp-webrtc')).rejects.toThrow('503')
    expect(Peer.instances[0]!.close).toHaveBeenCalledOnce()
  })
})
