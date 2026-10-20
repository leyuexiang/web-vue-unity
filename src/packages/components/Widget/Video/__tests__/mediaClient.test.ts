import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Config from '../config'
import { getManagedVideoSource, loadMediaServers, resolveVideoPlayback } from '../mediaClient'

const session = vi.hoisted(() => ({ token: 'business-token' }))
vi.mock('@/utils/webStorage', () => ({ sessionStore: { get: () => session.token } }))

describe('视频自动接入客户端', () => {
  const network = vi.fn<typeof fetch>()
  beforeEach(() => {
    network.mockReset()
    vi.stubGlobal('fetch', network)
    vi.stubGlobal('window', { location: { href: 'https://editor.example.com/' } })
    session.token += '-next'
  })
  afterEach(() => vi.unstubAllGlobals())

  it('兼容旧源字段，同时保留已有播放地址及私有协议', () => {
    const option = new Config().option
    option.sourceUrl = 'rtsp://camera.example.com/live'
    expect(getManagedVideoSource(option)).toBe(option.sourceUrl)
    option.value = 'https://example.com/live.m3u8'
    expect(getManagedVideoSource(option)).toBe('')
    option.value = ''
    option.playbackProtocol = 'rtsp-webrtc'
    expect(getManagedVideoSource(option)).toBe('')
  })

  it('组件服务器优先于场景，解析结果不覆盖源配置，只传业务令牌', async () => {
    const option = new Config().option
    Object.assign(option, {
      value: 'rtsp://camera.example.com/live', mediaServerId: 'component', playbackProtocol: 'hls',
    })
    network.mockResolvedValue(Response.json({ protocol: 'hls', url: 'https://media.example.com/live/hls.m3u8' }))
    const before = JSON.stringify(option)
    const result = await resolveVideoPlayback(option, new AbortController().signal, 'scene')
    expect(result.ok).toBe(true)
    expect(JSON.stringify(option)).toBe(before)
    const [url, init] = network.mock.calls[0]!
    expect(url).toBe('/api/media/resolve')
    expect(JSON.parse(String(init?.body))).toEqual({ sourceUrl: option.value, serverId: 'component', protocol: 'hls' })
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${session.token}`)
    option.mediaServerId = ''
    network.mockResolvedValueOnce(Response.json({ protocol: 'webrtc', url: 'https://media.example.com/whep' }))
    await resolveVideoPlayback(option, new AbortController().signal, 'scene')
    expect(JSON.parse(String(network.mock.calls[1]![1]?.body)).serverId).toBe('scene')
  })

  it('取消后即使返回成功也不能继续创建播放器', async () => {
    const controller = new AbortController()
    const option = new Config().option
    option.value = 'rtsp://camera.example.com/live'
    network.mockImplementation(async () => {
      controller.abort()
      return Response.json({ protocol: 'webrtc', url: 'https://media.example.com/whep' })
    })
    await expect(resolveVideoPlayback(option, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('拒绝未部署的页面应答、畸形结果和带凭据播放地址', async () => {
    const option = new Config().option
    option.value = 'rtsp://camera.example.com/live'
    for (const response of [
      new Response('<html></html>'), Response.json(null), Response.json({ protocol: 'native', url: '/video' }),
      Response.json({ protocol: 'webrtc', url: 'https://user:password@media.example.com/whep' }),
    ]) {
      network.mockResolvedValueOnce(response)
      await expect(resolveVideoPlayback(option, new AbortController().signal)).rejects.toThrow()
    }
  })

  it('服务器列表合并请求，失败不缓存，登录切换重新查询', async () => {
    network.mockResolvedValueOnce(Response.json({
      defaultServerId: 'x', servers: [{ id: 'x', name: '测试', address: 'https://media' }],
    }))
    await Promise.all([loadMediaServers(), loadMediaServers()])
    expect(network).toHaveBeenCalledOnce()
    session.token = 'another-session'
    network.mockResolvedValueOnce(Response.json({ servers: null }))
    await expect(loadMediaServers()).rejects.toThrow('媒体服务器列表无效')
    network.mockResolvedValueOnce(Response.json({ defaultServerId: '', servers: [] }))
    expect((await loadMediaServers()).servers).toEqual([])
    expect(network).toHaveBeenCalledTimes(3)
  })
})
