import type { VideoOption } from './config'
import type { ResolvedVideoStream, VideoStreamController, VideoStreamHooks } from './streamPlayer'
import { resetVideoElement } from './videoElement'

/** 旧网关返回 JSON 内的 Base64；仅接受有效形态的会话描述，避免把 HTML 错误页交给浏览器。 */
const decodePrivateAnswer = (body: string): string => {
  let value: unknown = body
  if (!body.trimStart().startsWith('v=0')) {
    try {
      const parsed: unknown = JSON.parse(body)
      if (parsed && typeof parsed === 'object' && 'sdp' in parsed) value = parsed.sdp
      else value = parsed
    } catch {
      // 部分旧网关直接返回 Base64 文本，仍使用相同的解码与 SDP 校验。
    }
  }
  if (typeof value !== 'string' || !value.trim()) throw new Error('RTSP-WebRTC 应答缺少有效 SDP')
  if (!value.trimStart().startsWith('v=0')) {
    try {
      value = atob(value.trim())
    } catch {
      throw new Error('RTSP-WebRTC 应答的 Base64 编码无效')
    }
  }
  if (typeof value !== 'string' || !/^v=0\r?\n/.test(value.trimStart())) {
    throw new Error('RTSP-WebRTC 应答不是有效 SDP')
  }
  return value.trimStart()
}

/** 不依赖增量候选接口的网关需先收集候选；取消时同时撤销监听和等待计时器。 */
const waitForIce = (peer: RTCPeerConnection, signal: AbortSignal) => {
  signal.throwIfAborted()
  if (peer.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', cancel)
      peer.removeEventListener('icegatheringstatechange', changed)
    }
    const finish = () => {
      cleanup()
      resolve()
    }
    const cancel = () => {
      cleanup()
      reject(signal.reason)
    }
    const changed = () => {
      if (peer.iceGatheringState === 'complete') finish()
    }
    const timer = window.setTimeout(finish, 3000)
    signal.addEventListener('abort', cancel, { once: true })
    peer.addEventListener('icegatheringstatechange', changed)
  })
}

/**
 * WebRTC 两种信令共用连接生命周期，仅在请求和应答格式处分流。
 * 初始化阶段也拥有可取消的资源句柄，防止切换源流后旧应答覆盖新画面。
 */
export const attachWebrtcStream = async (
  video: HTMLVideoElement,
  stream: ResolvedVideoStream,
  option: VideoOption,
  hooks: VideoStreamHooks,
): Promise<VideoStreamController> => {
  hooks.signal?.throwIfAborted()
  if (typeof RTCPeerConnection === 'undefined') throw new Error('当前浏览器不支持 WebRTC')
  const privateRtsp = stream.protocol === 'rtsp-webrtc'
  if (privateRtsp && !stream.sourceUrl) throw new Error('请配置 RTSP 源地址')
  const label = privateRtsp ? 'RTSP-WebRTC' : 'WHEP'
  const endpoint = new URL(stream.url, window.location.href)
  if (!['http:', 'https:'].includes(endpoint.protocol))
    throw new Error('WebRTC 网关必须使用 HTTP 或 HTTPS 地址')
  if (window.location.protocol === 'https:' && endpoint.protocol === 'http:') {
    throw new Error('HTTPS 页面请使用 HTTPS 视频网关')
  }
  const peer = new RTCPeerConnection()
  const remoteStream = new MediaStream()
  const request = new AbortController()
  const credentials = option.withCredentials ? 'include' : 'same-origin'
  let sessionUrl = ''
  let disposed = false
  let timer: number | undefined

  const clearTimer = () => {
    window.clearTimeout(timer)
    timer = undefined
  }
  const releaseSession = () => {
    if (!sessionUrl) return
    const url = sessionUrl
    sessionUrl = ''
    // 服务端回收不能阻塞切换；限制请求时长，失败仍由服务端会话超时兜底。
    const cleanup = new AbortController()
    const timeout = window.setTimeout(() => cleanup.abort(), 3000)
    void fetch(url, { method: 'DELETE', credentials, signal: cleanup.signal })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timeout))
  }
  const destroy = () => {
    if (disposed) return
    disposed = true
    clearTimer()
    hooks.signal?.removeEventListener('abort', destroy)
    request.abort()
    peer.removeEventListener('track', handleTrack)
    peer.removeEventListener('connectionstatechange', handleConnection)
    peer.close()
    remoteStream.getTracks().forEach((track) => track.stop())
    resetVideoElement(video)
    releaseSession()
  }
  const fail = (message: string) => {
    if (disposed) return
    destroy()
    hooks.onError(message)
  }
  const handleTrack = (event: RTCTrackEvent) => {
    if (disposed) return
    // 直接聚合接收轨道，兼容事件未携带 streams，也保证销毁时每条轨道都被停止。
    remoteStream.addTrack(event.track)
    video.srcObject = remoteStream
  }
  const handleConnection = () => {
    if (disposed) return
    if (peer.connectionState === 'connected') clearTimer()
    else if (peer.connectionState === 'failed' || peer.connectionState === 'closed')
      fail(`${label} 连接失败`)
    else if (peer.connectionState === 'disconnected') {
      clearTimer()
      timer = window.setTimeout(() => fail(`${label} 连接中断超时`), 10000)
    }
  }

  hooks.signal?.addEventListener('abort', destroy, { once: true })
  timer = window.setTimeout(() => fail(`${label} 建立连接超时`), 15000)
  peer.addEventListener('track', handleTrack)
  peer.addEventListener('connectionstatechange', handleConnection)
  try {
    peer.addTransceiver('video', { direction: 'recvonly' })
    peer.addTransceiver('audio', { direction: 'recvonly' })
    const offer = await peer.createOffer()
    request.signal.throwIfAborted()
    await peer.setLocalDescription(offer)
    await waitForIce(peer, request.signal)
    const localSdp = peer.localDescription?.sdp
    if (!localSdp) throw new Error(`${label} 无法生成本地会话描述`)
    const response = await fetch(endpoint.href, {
      method: 'POST',
      headers: privateRtsp
        ? { Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Accept: 'application/sdp', 'Content-Type': 'application/sdp' },
      body: privateRtsp
        ? JSON.stringify({ rtspUrl: stream.sourceUrl, sdp: btoa(localSdp) })
        : localSdp,
      credentials,
      signal: request.signal,
    })
    if (!response.ok) throw new Error(`${label} 接口返回异常状态：${response.status}`)
    if (!privateRtsp) {
      const location = response.headers.get('Location')
      if (location) {
        const session = new URL(location, response.url || endpoint.href)
        // 会话地址必须仍是 HTTP 请求目标，不能把异常 Location 当作其他协议执行。
        if (!['http:', 'https:'].includes(session.protocol))
          throw new Error('WHEP 会话地址协议无效')
        sessionUrl = session.href
      }
    }
    if (disposed) releaseSession()
    request.signal.throwIfAborted()
    const body = await response.text()
    request.signal.throwIfAborted()
    const answer = privateRtsp ? decodePrivateAnswer(body) : body
    if (!/^v=0\r?\n/.test(answer.trimStart())) throw new Error(`${label} 接口未返回有效 SDP 应答`)
    await peer.setRemoteDescription({ type: 'answer', sdp: answer })
    request.signal.throwIfAborted()
    return { destroy }
  } catch (error) {
    const cancelled = request.signal.aborted
    destroy()
    if (cancelled) throw new DOMException('视频初始化已取消', 'AbortError')
    // 不向场景错误提示传播网关返回正文或可能含凭据的请求地址。
    if (error instanceof Error && error.message.startsWith(label)) throw error
    throw new Error(`${label} 请求或协商失败，请检查网关、网络及视频编码`)
  }
}
