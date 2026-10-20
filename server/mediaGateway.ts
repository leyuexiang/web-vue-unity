import { createHash } from 'node:crypto'

export type MediaProtocol = 'webrtc' | 'hls' | 'flv'
export interface MediaServerConfig {
  id: string
  name: string
  apiUrl: string
  playbackUrl: string
  secret: string
  allowedHosts: string[]
}
export interface MediaPlayback { protocol: MediaProtocol; url: string }

/** 管理端错误只允许固定的用户文案，不能把带凭据的源流或上游响应透传到网页。 */
export class MediaGatewayError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const validBase = (value: unknown) => {
  if (typeof value !== 'string') throw new Error('媒体服务地址未配置')
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('媒体服务地址必须是不带凭据、查询参数的 HTTP(S) 地址')
  }
  return url.href.replace(/\/+$/, '')
}

/** 服务列表仅从服务端环境读取；缺失配置返回空列表，错误配置阻断启动。 */
export const parseMediaServers = (raw = ''): MediaServerConfig[] => {
  if (!raw.trim()) return []
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('MEDIA_SERVERS_JSON 格式错误') }
  if (!Array.isArray(parsed) || parsed.length > 32) throw new Error('媒体服务器列表格式错误')
  const ids = new Set<string>()
  return parsed.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('媒体服务器配置格式错误')
    const entry = item as Record<string, unknown>
    if (typeof entry.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(entry.id) || ids.has(entry.id)) {
      throw new Error('媒体服务器 ID 无效或重复')
    }
    if (typeof entry.secret !== 'string' || !entry.secret.trim()) throw new Error('媒体管理密钥未配置')
    if (!Array.isArray(entry.allowedHosts) || !entry.allowedHosts.length ||
      entry.allowedHosts.some(host => typeof host !== 'string' || !host ||
        (host.includes('*') && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\*$/.test(host)))) {
      throw new Error('必须配置允许拉流的主机；通配仅支持 IPv4 网段，例如 192.168.10.*')
    }
    ids.add(entry.id)
    return {
      id: entry.id, name: typeof entry.name === 'string' ? entry.name : entry.id,
      apiUrl: validBase(entry.apiUrl), playbackUrl: validBase(entry.playbackUrl ?? entry.apiUrl),
      secret: entry.secret, allowedHosts: entry.allowedHosts.map(host => host.toLowerCase()),
    }
  })
}

const normalizeSource = (input: unknown, server: MediaServerConfig) => {
  if (typeof input !== 'string' || input.length > 4096 || /[\x00-\x1f\x7f]/.test(input)) {
    throw new MediaGatewayError(400, '视频源地址格式无效')
  }
  let url: URL
  try { url = new URL(input.trim()) } catch { throw new MediaGatewayError(400, '视频源地址格式无效') }
  if (!['rtsp:', 'rtmp:'].includes(url.protocol) || !url.hostname || url.hash) {
    throw new MediaGatewayError(400, '自动接入仅支持 RTSP 或 RTMP 源地址')
  }
  const hostname = url.hostname.toLowerCase()
  const allowed = server.allowedHosts.some(host => host === hostname ||
    (host.endsWith('.*') && /^\d+\.\d+\.\d+\.\d+$/.test(hostname) && hostname.startsWith(host.slice(0, -1))))
  if (!allowed) throw new MediaGatewayError(403, '该视频源主机未在服务器允许列表中配置')
  return url.href
}

/** 多实例共享源拉流；只合并正在执行的请求，不永久缓存在线状态。 */
export const createMediaService = (servers: MediaServerConfig[], fetcher: typeof fetch = fetch) => {
  const registry = new Map(servers.map(server => [server.id, server]))
  const pending = new Map<string, Promise<void>>()
  const call = async (server: MediaServerConfig, api: string, values: Record<string, string>) => {
    try {
      const response = await fetcher(`${server.apiUrl}/index/api/${api}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ ...values, secret: server.secret }),
      })
      if (!response.ok) throw new Error('HTTP 请求失败')
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object' || !('code' in result) || typeof result.code !== 'number') {
        throw new Error('接口应答无效')
      }
      return result as { code: number }
    } catch {
      throw new MediaGatewayError(502, '流媒体服务器请求失败，请检查服务配置及网络')
    }
  }
  const ensureStream = async (server: MediaServerConfig, source: string, stream: string) => {
    const tuple = { vhost: '__defaultVhost__', app: 'editor', stream }
    const online = () => call(server, 'getMediaInfo', { ...tuple, schema: 'rtsp' })
    if ((await online()).code === 0) return
    const result = await call(server, 'addStreamProxy', {
      ...tuple, url: source, rtp_type: '0', timeout_sec: '10', retry_count: '3',
      // 无观看者时由 ZLMediaKit 回收，避免组件多实例互相关闭共享源流。
      auto_close: '1', enable_rtsp: '1', enable_rtmp: '1', enable_hls: '1',
      enable_mp4: '0', enable_fmp4: '0', enable_ts: '0',
    })
    // 多服务进程同时注册同一散列 ID 时，已存在且在线也视为复用成功。
    if (result.code !== 0 && (await online()).code !== 0) {
      throw new MediaGatewayError(502, '源流接入失败，请检查源地址、源流认证和服务器连通性')
    }
  }
  return {
    listServers: () => ({
      defaultServerId: servers[0]?.id ?? '',
      servers: servers.map(({ id, name, playbackUrl }) => ({ id, name, address: playbackUrl })),
    }),
    async resolve(input: { sourceUrl?: unknown; serverId?: unknown; protocol?: unknown }): Promise<MediaPlayback> {
      const server = input.serverId ? registry.get(String(input.serverId)) : servers[0]
      if (!server) throw new MediaGatewayError(503, '请先在服务端配置可用的流媒体服务器')
      const protocol = input.protocol ?? 'webrtc'
      if (protocol !== 'webrtc' && protocol !== 'flv' && protocol !== 'hls') {
        throw new MediaGatewayError(400, '自动接入的播放方式必须为 WebRTC、HLS 或 FLV')
      }
      const source = normalizeSource(input.sourceUrl, server)
      // 完整源地址（包含认证和查询参数）参与散列，不把敏感内容嵌入播放 URL。
      const stream = `src-${createHash('sha256').update(server.id + '\n' + source).digest('hex')}`
      const key = `${server.id}/${stream}`
      let job = pending.get(key)
      if (!job) {
        if (pending.size >= 32) throw new MediaGatewayError(429, '正在接入的视频源过多，请稍后重试')
        job = ensureStream(server, source, stream)
        pending.set(key, job)
      }
      try { await job } finally { if (pending.get(key) === job) pending.delete(key) }
      const base = server.playbackUrl
      const url = protocol === 'webrtc'
        ? `${base}/index/api/whep?app=editor&stream=${stream}`
        : protocol === 'flv' ? `${base}/editor/${stream}.live.flv` : `${base}/editor/${stream}/hls.m3u8`
      return { protocol, url }
    },
  }
}
