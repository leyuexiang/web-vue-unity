import { sessionStore } from '@/utils/webStorage'
import { authContext } from '@/auth/authContext'
import type { VideoOption } from './config'
import { isPrivateRtspProtocol, resolveVideoStream } from './streamModel'
import type { VideoStreamResolution } from './streamModel'

export interface PublicMediaServer { id: string; name: string; address: string }
interface MediaServers { defaultServerId: string; servers: PublicMediaServer[] }

/** 源流输入兼容旧字段；已有播放地址始终优先，私有网关继续使用原契约。 */
export const getManagedVideoSource = (option: VideoOption) => {
  if (isPrivateRtspProtocol(option.playbackProtocol) || option.playbackProtocol === 'native') return ''
  const address = String(option.value || option.sourceUrl || '').trim()
  return /^(rtsp|rtmp):\/\//i.test(address) ? address : ''
}

const mediaRequest = async (path: string, init: RequestInit = {}) => {
  // 内嵌模式没有独立登录页的 sessionStorage；媒体服务请求复用父页面下发的令牌。
  const context = authContext.get()
  const token = context?.accessToken || sessionStore.get('accessToken')
  const response = await fetch(`/api/media/${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(context?.clientId ? { ClientId: context.clientId } : {}),
    },
  })
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('媒体接入服务未部署或代理配置无效')
  }
  const body = await response.json()
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : '媒体接入请求失败')
  return body
}

// 多个属性面板共用短期服务器列表，失败不缓存；组件切换不会重复下载相同配置。
let serversRequest: Promise<MediaServers> | undefined
let serversExpireAt = 0
let serversToken: unknown
export const loadMediaServers = (): Promise<MediaServers> => {
  const token = authContext.get()?.accessToken || sessionStore.get('accessToken')
  if (!serversRequest || token !== serversToken || Date.now() >= serversExpireAt) {
    serversToken = token
    serversExpireAt = Date.now() + 60000
    const pending = mediaRequest('servers', { signal: AbortSignal.timeout(10000) }).then((body: MediaServers) => {
      if (!body || typeof body.defaultServerId !== 'string' || !Array.isArray(body.servers) ||
        body.servers.some(server => !server || typeof server.id !== 'string' ||
          typeof server.name !== 'string' || typeof server.address !== 'string')) {
        throw new Error('媒体服务器列表无效')
      }
      return body
    }).catch(error => {
      // 登录切换后的旧失败不得清除新会话的请求缓存。
      if (serversRequest === pending) serversRequest = undefined
      throw error
    })
    serversRequest = pending
  }
  return serversRequest
}

/** 解析结果只属于当前播放器会话，不把临时播放 URL 写回持久化源地址。 */
export const resolveVideoPlayback = async (
  option: VideoOption, signal: AbortSignal, sceneServerId = '',
): Promise<VideoStreamResolution> => {
  const sourceUrl = getManagedVideoSource(option)
  if (!sourceUrl) return resolveVideoStream(option)
  const body = await mediaRequest('resolve', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.any([signal, AbortSignal.timeout(55000)]),
    body: JSON.stringify({
      sourceUrl, serverId: option.mediaServerId || sceneServerId,
      protocol: option.playbackProtocol === 'hls' || option.playbackProtocol === 'flv'
        ? option.playbackProtocol : 'webrtc',
    }),
  })
  signal.throwIfAborted()
  if (!body || !['webrtc', 'hls', 'flv'].includes(body.protocol) || typeof body.url !== 'string') {
    throw new Error('媒体服务未返回有效播放地址')
  }
  const url = new URL(body.url, window.location.href)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('媒体服务返回的播放地址无效')
  }
  return { ok: true, protocol: body.protocol, url: url.href }
}
