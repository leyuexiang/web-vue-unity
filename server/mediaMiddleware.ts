import type { IncomingMessage, ServerResponse } from 'node:http'
import { createMediaService, MediaGatewayError, parseMediaServers } from './mediaGateway.ts'

interface MiddlewareOptions {
  env: Record<string, string | undefined>
  development?: boolean
  fetcher?: typeof fetch
}

/** 开发与独立服务共用接口和权限边界；未匹配的路由交回宿主处理。 */
export const createMediaMiddleware = ({ env, development = false, fetcher = fetch }: MiddlewareOptions) => {
  const service = createMediaService(parseMediaServers(env.MEDIA_SERVERS_JSON), fetcher)
  const send = (res: ServerResponse, status: number, body: unknown) => {
    if (res.destroyed || res.writableEnded) return
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(body))
  }
  const authorize = async (req: IncomingMessage) => {
    const host = req.headers.host ?? ''
    if (req.headers.origin) {
      let sameOrigin = false
      try { sameOrigin = new URL(req.headers.origin).host === host } catch { /* 拒绝不合法来源。 */ }
      if (!sameOrigin) throw new MediaGatewayError(403, '请通过当前站点访问媒体接口')
    }
    if (development) {
      const localAddress = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
      const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
      if (localAddress && localHost) return
      throw new MediaGatewayError(403, '开发媒体接口仅允许本机访问，远程访问请部署正式服务')
    }
    // 仅向部署时指定的业务鉴权端点提交现有令牌，绝不把 ZLMediaKit 密钥用于登录鉴权。
    if (!env.MEDIA_AUTH_CHECK_URL) throw new MediaGatewayError(503, '媒体服务尚未配置业务鉴权')
    const authorization = req.headers.authorization
    if (!authorization?.startsWith('Bearer ') || authorization.length > 8192) {
      throw new MediaGatewayError(401, '请先登录后接入视频源')
    }
    try {
      const response = await fetcher(env.MEDIA_AUTH_CHECK_URL, {
        headers: { Authorization: authorization }, redirect: 'error', signal: AbortSignal.timeout(5000),
      })
      if (response.status >= 500) throw new Error('鉴权服务异常')
      const body = await response.json() as { code?: number; data?: { user?: { id?: unknown } } }
      if (response.ok && body.code === 0 && body.data?.user?.id != null) return
    } catch { throw new MediaGatewayError(503, '业务鉴权服务暂时不可用') }
    throw new MediaGatewayError(401, '登录会话无效或已过期')
  }
  const readBody = (req: IncomingMessage) => new Promise<Record<string, unknown>>((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    const cleanup = () => {
      clearTimeout(timer)
      req.off('data', onData)
      req.off('end', onEnd)
      req.off('error', onError)
      req.off('aborted', onAborted)
    }
    const fail = (error: Error) => { cleanup(); req.resume(); reject(error) }
    const onError = () => fail(new MediaGatewayError(400, '视频配置请求中断'))
    const onAborted = () => onError()
    const onData = (chunk: Buffer) => {
      size += chunk.length
      if (size > 8192) { fail(new MediaGatewayError(413, '视频配置请求过大')); return }
      chunks.push(chunk)
    }
    const onEnd = () => {
      cleanup()
      try {
        const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error()
        resolve(data as Record<string, unknown>)
      } catch { reject(new MediaGatewayError(400, '视频配置必须为 JSON 对象')) }
    }
    const timer = setTimeout(() => fail(new MediaGatewayError(408, '视频配置请求超时')), 5000)
    req.on('data', onData).once('end', onEnd).once('error', onError).once('aborted', onAborted)
  })
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = (req.url ?? '').split('?')[0]
    if (!path?.startsWith('/api/media/')) { next(); return }
    void (async () => {
      try {
        await authorize(req)
        if (path === '/api/media/servers' && req.method === 'GET') {
          send(res, 200, service.listServers())
        } else if (path === '/api/media/resolve' && req.method === 'POST') {
          if (!req.headers['content-type']?.startsWith('application/json')) {
            throw new MediaGatewayError(415, '视频配置需使用 JSON 请求')
          }
          send(res, 200, await service.resolve(await readBody(req)))
        } else throw new MediaGatewayError(404, '媒体接口不存在')
      } catch (error) {
        const known = error instanceof MediaGatewayError
        send(res, known ? error.status : 500, { message: known ? error.message : '媒体接入暂时失败' })
      }
    })()
  }
}
