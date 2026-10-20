import type { VideoOption, VideoPlaybackProtocol, VideoSourceProtocol } from './config'

export const DIRECT_STREAM_PROTOCOLS = new Set<VideoSourceProtocol>(['gb28181', 'rtsp', 'rtmp'])

const RAW_STREAM_SCHEME_PATTERN = /^(?:gb28181|rtsp|rtmp):\/\//i
const HLS_URL_PATTERN = /\.m3u8(?:$|[?#])/i
const FLV_URL_PATTERN = /\.flv(?:$|[?#])/i
const WEBSOCKET_URL_PATTERN = /^wss?:\/\//i
const RTSP_URL_PATTERN = /^rtsp:\/\//i

/** 私有模式沿用旧网关契约；标准模式的自动拉流由 mediaClient 单独处理。 */
export const isPrivateRtspProtocol = (protocol: VideoPlaybackProtocol) =>
  protocol === 'rtsp-webrtc' || protocol === 'rtsp-mse'

export type VideoStreamResolution =
  | {
      ok: true
      protocol: Exclude<VideoPlaybackProtocol, 'auto'>
      url: string
      sourceUrl?: string
    }
  | { ok: false; message: string }

const inferProtocolFromSource = (
  sourceProtocol: VideoSourceProtocol,
): Exclude<VideoPlaybackProtocol, 'auto'> | null => {
  if (sourceProtocol === 'hls') return 'hls'
  if (sourceProtocol === 'http-flv') return 'flv'
  if (sourceProtocol === 'webrtc') return 'webrtc'
  if (sourceProtocol === 'native') return 'native'
  return null
}

/**
 * 将持久化配置解析成浏览器播放器能够消费的传输方式。
 * 此同步层只处理已有播放地址和旧私有网关；RTSP/RTMP 自动接入由 mediaClient 异步完成。
 * 到达本层的原始协议地址主动拒绝，避免浏览器把“不支持协议”误报成普通网络故障。
 */
export const resolveVideoStream = (
  option: Pick<VideoOption, 'sourceProtocol' | 'playbackProtocol' | 'value'> &
    Partial<Pick<VideoOption, 'sourceUrl'>>,
): VideoStreamResolution => {
  const url = String(option.value ?? '').trim()

  // 私有 RTSP 网关沿用旧项目契约：value 是网关地址，sourceUrl 是 RTSP 源地址。
  // 仅显式私有模式允许在 value 填源流；同源默认地址仍需要部署实际网关。
  if (isPrivateRtspProtocol(option.playbackProtocol)) {
    const sourceUrl =
      String(option.sourceUrl ?? '').trim() || (RTSP_URL_PATTERN.test(url) ? url : '')
    const defaultGateway =
      option.playbackProtocol === 'rtsp-webrtc' ? '/api/rtsp/webrtc' : '/ws/rtsp/mse'
    const gatewayUrl = RTSP_URL_PATTERN.test(url) ? defaultGateway : url || defaultGateway
    try {
      if (!RTSP_URL_PATTERN.test(sourceUrl) || !new URL(sourceUrl).hostname) {
        return { ok: false, message: '请配置有效的 RTSP 源地址（rtsp://）' }
      }
      // 仅校验协议，不在配置解析阶段依赖浏览器或发起网络请求。
      const gateway = new URL(gatewayUrl, 'https://video.invalid/')
      const protocols =
        option.playbackProtocol === 'rtsp-mse'
          ? ['http:', 'https:', 'ws:', 'wss:']
          : ['http:', 'https:']
      if (!protocols.includes(gateway.protocol)) {
        return { ok: false, message: '网关地址协议与所选播放方式不匹配' }
      }
    } catch {
      return { ok: false, message: '源流或网关地址格式无效' }
    }
    return { ok: true, protocol: option.playbackProtocol, url: gatewayUrl, sourceUrl }
  }

  if (!url) return { ok: false, message: '请配置浏览器播放地址' }

  if (RAW_STREAM_SCHEME_PATTERN.test(url)) {
    // 端口和路径不能证明服务器提供哪种输出；必须使用实际的浏览器播放地址。
    return {
      ok: false,
      message: '浏览器不能直连 GB28181、RTSP 或 RTMP，请填写流媒体网关输出的播放地址',
    }
  }

  if (option.playbackProtocol && option.playbackProtocol !== 'auto') {
    return { ok: true, protocol: option.playbackProtocol, url }
  }

  if (HLS_URL_PATTERN.test(url)) return { ok: true, protocol: 'hls', url }
  if (FLV_URL_PATTERN.test(url) || WEBSOCKET_URL_PATTERN.test(url)) {
    return { ok: true, protocol: 'flv', url }
  }

  const sourceProtocol = inferProtocolFromSource(option.sourceProtocol)
  if (sourceProtocol) return { ok: true, protocol: sourceProtocol, url }

  return { ok: true, protocol: 'native', url }
}

export const isGatewaySourceProtocol = (protocol: VideoSourceProtocol) =>
  DIRECT_STREAM_PROTOCOLS.has(protocol)

export const getVideoProtocolHint = (
  sourceProtocol: VideoSourceProtocol,
  playbackProtocol: VideoPlaybackProtocol,
) => {
  if (playbackProtocol === 'rtsp-webrtc') {
    return '私有 RTSP 网关使用 JSON + Base64 会话描述；留空使用 /api/rtsp/webrtc，需部署兼容网关。'
  }
  if (playbackProtocol === 'rtsp-mse') {
    return 'RTSP-MSE 使用长连接（WebSocket）接收编码说明及分片 MP4；留空使用 /ws/rtsp/mse，需部署兼容网关。'
  }
  if (isGatewaySourceProtocol(sourceProtocol)) {
    return 'GB28181、RTSP、RTMP 需先由流媒体网关转换为 WHEP WebRTC、HTTP-FLV 或 HLS，浏览器不能直接连接原始流。'
  }
  if (playbackProtocol === 'webrtc') {
    return 'WebRTC 地址需为 WHEP 标准拉流接口；厂商私有 WebRTC 信令需要在服务端适配。'
  }
  return '自动模式会识别 .m3u8、.flv、ws(s) 地址，其余地址交给浏览器原生播放。'
}
