import type { VideoOption } from './config'
import type { VideoStreamResolution } from './streamModel'
import { resetVideoElement } from './videoElement'
import { attachWebrtcStream } from './webRtcPlayer'
import { attachRtspMseStream } from './rtspMsePlayer'

export type ResolvedVideoStream = Extract<VideoStreamResolution, { ok: true }>

export interface VideoStreamController {
  destroy: () => void | Promise<void>
}

export interface VideoStreamHooks {
  onError: (message: string) => void
  /** 切换配置或卸载时取消尚未完成的初始化，阻止旧实例继续占用媒体元素。 */
  signal?: AbortSignal
}

const EMPTY_CONTROLLER: VideoStreamController = { destroy: () => undefined }

/** 模块加载完成后立即绑定取消与幂等清理，避免返回句柄的微任务间隙发生切换。 */
const cancellableController = (
  cleanup: () => void,
  hooks: VideoStreamHooks,
): VideoStreamController => {
  let disposed = false
  const destroy = () => {
    if (disposed) return
    disposed = true
    hooks.signal?.removeEventListener('abort', destroy)
    cleanup()
  }
  hooks.signal?.addEventListener('abort', destroy, { once: true })
  return { destroy }
}

const attachNativeStream = (
  video: HTMLVideoElement,
  stream: ResolvedVideoStream,
  hooks: VideoStreamHooks,
): VideoStreamController => {
  video.src = stream.url
  video.load()
  return cancellableController(() => resetVideoElement(video), hooks)
}

const attachHlsStream = async (
  video: HTMLVideoElement,
  stream: ResolvedVideoStream,
  option: VideoOption,
  hooks: VideoStreamHooks,
): Promise<VideoStreamController> => {
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    return attachNativeStream(video, stream, hooks)
  }

  const { default: Hls } = await import('hls.js')
  // 等待动态模块期间可能已切换场景，取消后不能再绑定媒体元素。
  hooks.signal?.throwIfAborted()
  if (!Hls.isSupported()) {
    throw new Error('当前浏览器不支持 HLS 播放所需的媒体扩展能力')
  }

  const hls = new Hls({
    lowLatencyMode: option.lowLatency,
    backBufferLength: option.lowLatency ? 15 : 30,
    maxBufferLength: option.lowLatency ? 10 : 30,
    xhrSetup: option.withCredentials
      ? (xhr) => {
          xhr.withCredentials = true
        }
      : undefined,
  })

  const controller = cancellableController(() => {
    hls.destroy()
    resetVideoElement(video)
  }, hooks)
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data.fatal) return
    hooks.onError(`HLS 播放失败：${data.details}`)
  })
  try {
    hls.attachMedia(video)
    hooks.signal?.throwIfAborted()
    hls.loadSource(stream.url)
    return controller
  } catch (error) {
    controller.destroy()
    throw error
  }
}

const attachFlvStream = async (
  video: HTMLVideoElement,
  stream: ResolvedVideoStream,
  option: VideoOption,
  hooks: VideoStreamHooks,
): Promise<VideoStreamController> => {
  const { default: mpegts } = await import('mpegts.js')
  hooks.signal?.throwIfAborted()
  if (!mpegts.isSupported() || !mpegts.getFeatureList().mseLivePlayback) {
    throw new Error('当前浏览器不支持 HTTP-FLV 播放所需的媒体扩展能力')
  }

  const player = mpegts.createPlayer(
    {
      type: 'flv',
      isLive: option.isLive,
      cors: true,
      withCredentials: option.withCredentials,
      url: stream.url,
    },
    {
      isLive: option.isLive,
      enableStashBuffer: !option.lowLatency,
      lazyLoad: !option.isLive,
      liveBufferLatencyChasing: option.isLive && option.lowLatency,
    },
  )

  const controller = cancellableController(() => {
    try {
      player.pause()
      player.unload()
      player.detachMediaElement()
    } finally {
      player.destroy()
      resetVideoElement(video)
    }
  }, hooks)
  player.on(mpegts.Events.ERROR, (errorType, errorDetail) => {
    hooks.onError(`FLV 播放失败：${String(errorType)} / ${String(errorDetail)}`)
  })
  try {
    player.attachMediaElement(video)
    hooks.signal?.throwIfAborted()
    player.load()
    return controller
  } catch (error) {
    controller.destroy()
    throw error
  }
}

/**
 * 按浏览器播放协议创建且仅创建一个播放器实例。
 * 协议库采用动态导入，普通 MP4 或未使用视频部件的场景不会承担额外解析成本。
 */
export const attachVideoStream = async (
  video: HTMLVideoElement,
  stream: ResolvedVideoStream,
  option: VideoOption,
  hooks: VideoStreamHooks,
): Promise<VideoStreamController> => {
  hooks.signal?.throwIfAborted()
  if (stream.protocol === 'hls') return attachHlsStream(video, stream, option, hooks)
  if (stream.protocol === 'flv') return attachFlvStream(video, stream, option, hooks)
  if (stream.protocol === 'webrtc' || stream.protocol === 'rtsp-webrtc') {
    return attachWebrtcStream(video, stream, option, hooks)
  }
  if (stream.protocol === 'rtsp-mse') return attachRtspMseStream(video, stream, option, hooks)
  if (stream.protocol === 'native') return attachNativeStream(video, stream, hooks)
  return EMPTY_CONTROLLER
}
