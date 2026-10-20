import { createServer, get } from 'node:http'
import { it, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { createMediaMiddleware } from '../mediaMiddleware.ts'

const config = JSON.stringify([{
  id: 'test', apiUrl: 'http://media.internal', secret: 'private-key', allowedHosts: ['camera.example.com'],
}])
// 使用真实 HTTP 请求覆盖头部、正文和状态码，替身仅隔离外部鉴权与媒体服务器。
const start = async (t: TestContext, options: Parameters<typeof createMediaMiddleware>[0]) => {
  const middleware = createMediaMiddleware(options)
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(418); res.end() }))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()) }))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  return `http://127.0.0.1:${address.port}`
}
const post = (body: string): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body })

it('开发接口仅本机同源可用，列表不泄露管理凭据', async t => {
  const base = await start(t, { development: true, env: { MEDIA_SERVERS_JSON: config } })
  const response = await fetch(`${base}/api/media/servers`, { headers: { Origin: base } })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const body = await response.text()
  assert.equal(body.includes('private-key'), false)
  assert.equal(body.includes('allowedHosts'), false)
  assert.equal((await fetch(`${base}/api/media/servers`, { headers: { Origin: 'http://other.example' } })).status, 403)
  // fetch 会覆盖 Host，使用原生 HTTP 客户端真实发送非本机 Host 头。
  const remoteHostStatus = await new Promise<number | undefined>((resolve, reject) => {
    get(`${base}/api/media/servers`, { headers: { Host: 'public.example' } }, res => {
      res.resume()
      resolve(res.statusCode)
    }).on('error', reject)
  })
  assert.equal(remoteHostStatus, 403)
  assert.equal((await fetch(`${base}/other`)).status, 418)
})

it('校验请求格式、大小和路由，不把无效输入发送给上游', async t => {
  let calls = 0
  const base = await start(t, {
    development: true, env: { MEDIA_SERVERS_JSON: config },
    fetcher: async () => { calls++; return Response.json({ code: 0 }) },
  })
  for (const body of ['[]', 'null', '{']) {
    assert.equal((await fetch(`${base}/api/media/resolve`, post(body))).status, 400)
  }
  const oversized = await fetch(`${base}/api/media/resolve`, post(JSON.stringify({ value: 'a'.repeat(8192) })))
  assert.equal(oversized.status, 413)
  assert.equal((await fetch(`${base}/api/media/resolve`, { method: 'POST', body: '{}' })).status, 415)
  assert.equal((await fetch(`${base}/api/media/missing`)).status, 404)
  const forbiddenSource = await fetch(`${base}/api/media/resolve`, post('{"sourceUrl":"rtsp://127.0.0.1/private"}'))
  assert.equal(forbiddenSource.status, 403)
  assert.equal(calls, 0)
})

it('生产接口默认拒绝，校验业务令牌后才允许接入', async t => {
  const noAuth = await start(t, { env: { MEDIA_SERVERS_JSON: config } })
  assert.equal((await fetch(`${noAuth}/api/media/servers`)).status, 503)
  const authUrl = 'https://business.internal/auth'
  let authorized = false
  const base = await start(t, {
    env: { MEDIA_SERVERS_JSON: config, MEDIA_AUTH_CHECK_URL: authUrl },
    fetcher: async (url, init) => {
      if (String(url) === authUrl) {
        assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer business-token')
        assert.equal(init?.redirect, 'error')
        return Response.json(authorized ? { code: 0, data: { user: { id: 1 } } } : { code: 401 })
      }
      assert.equal(new Headers(init?.headers).get('Authorization'), null)
      return Response.json({ code: 0 })
    },
  })
  assert.equal((await fetch(`${base}/api/media/servers`)).status, 401)
  const headers = { Authorization: 'Bearer business-token', 'Content-Type': 'application/json' }
  assert.equal((await fetch(`${base}/api/media/servers`, { headers })).status, 401)
  authorized = true
  const response = await fetch(`${base}/api/media/resolve`, {
    method: 'POST', headers, body: JSON.stringify({ sourceUrl: 'rtsp://camera.example.com/live' }),
  })
  assert.equal(response.status, 200)
  assert.equal(((await response.json()) as { protocol: string }).protocol, 'webrtc')
})

it('上游鉴权不可用时返回脱敏错误而非放行', async t => {
  const base = await start(t, {
    env: { MEDIA_AUTH_CHECK_URL: 'http://business.internal/auth' },
    fetcher: async () => { throw new Error('private-key business-token') },
  })
  const response = await fetch(`${base}/api/media/servers`, { headers: { Authorization: 'Bearer business-token' } })
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { message: '业务鉴权服务暂时不可用' })
})
