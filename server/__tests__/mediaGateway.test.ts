import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createMediaService, parseMediaServers } from '../mediaGateway.ts'

const servers = () => parseMediaServers(JSON.stringify([{
  id: 'test', name: '测试服务器', apiUrl: 'http://media.internal:18080',
  playbackUrl: 'https://media.example.com', secret: 'server-only-secret',
  allowedHosts: ['camera.example.com', '192.168.10.*'],
}]))
const sourceUrl = 'rtsp://camera.example.com/live'

describe('媒体自动接入服务', () => {
  it('并发播放同一源只建一次流，不同播放协议复用同一流', async () => {
    let adds = 0
    const service = createMediaService(servers(), async (url, options) => {
      const endpoint = new URL(String(url)).pathname
      const body = new URLSearchParams(String(options?.body))
      assert.equal(body.get('secret'), 'server-only-secret')
      assert.equal(options?.redirect, 'error')
      if (endpoint.endsWith('getMediaInfo')) return Response.json({ code: -1 })
      adds += 1
      assert.equal(body.get('url'), sourceUrl)
      assert.equal(body.get('auto_close'), '1')
      assert.equal(body.get('enable_mp4'), '0')
      await new Promise(resolve => setTimeout(resolve, 10))
      return Response.json({ code: 0 })
    })
    const [whep, flv] = await Promise.all([
      service.resolve({ sourceUrl, protocol: 'webrtc' }),
      service.resolve({ sourceUrl, protocol: 'flv' }),
    ])
    assert.equal(adds, 1)
    const stream = new URL(whep.url).searchParams.get('stream')
    assert.equal(flv.url, `https://media.example.com/editor/${stream}.live.flv`)
    assert.equal(JSON.stringify(service.listServers()).includes('secret'), false)
    assert.equal(JSON.stringify(whep).includes('camera.example.com'), false)
  })

  it('已有在线源复用，服务重启后会重新检查并恢复拉流', async () => {
    let online = true
    let adds = 0
    const service = createMediaService(servers(), async (url) => {
      if (String(url).endsWith('getMediaInfo')) return Response.json({ code: online ? 0 : -1 })
      adds += 1
      return Response.json({ code: 0 })
    })
    const first = await service.resolve({ sourceUrl })
    assert.equal(adds, 0)
    online = false
    assert.deepEqual(await service.resolve({ sourceUrl }), first)
    assert.equal(adds, 1)
  })

  it('不向未知服务器、未授权主机或错误协议发起请求', async () => {
    let requests = 0
    const service = createMediaService(servers(), async () => { requests++; return Response.json({ code: 0 }) })
    for (const input of [
      { sourceUrl, serverId: 'unknown' },
      { sourceUrl: 'rtsp://127.0.0.1/private' },
      { sourceUrl: 'http://camera.example.com/live' },
      { sourceUrl: 'rtsp://192.168.10.example.com/live' },
      { sourceUrl, protocol: 'native' },
    ]) await assert.rejects(service.resolve(input))
    assert.equal(requests, 0)
  })

  it('错误不泄露源地址或管理凭据，失败后允许重试', async () => {
    let fail = true
    const service = createMediaService(servers(), async () => {
      if (fail) throw new Error('rtsp://user:password@camera.example.com server-only-secret')
      return Response.json({ code: 0 })
    })
    await assert.rejects(service.resolve({ sourceUrl }), /流媒体服务器请求失败/)
    fail = false
    assert.equal((await service.resolve({ sourceUrl })).protocol, 'webrtc')
  })

  it('配置要求明确的主机白名单，拒绝重复 ID 和带凭据的服务地址', () => {
    const config = servers()[0]!
    assert.throws(() => parseMediaServers(JSON.stringify([{ ...config, allowedHosts: [] }])))
    assert.throws(() => parseMediaServers(JSON.stringify([config, config])))
    assert.throws(() => parseMediaServers(JSON.stringify([{ ...config, apiUrl: 'http://user:pass@host' }])))
  })
})
