import { describe, expect, it } from 'vitest'
import Config from '../config'
import { getVideoProtocolHint, resolveVideoStream } from '../streamModel'

describe('安监视频流协议解析', () => {
  it('根据常见网关地址自动识别 HLS 和 FLV', () => {
    const config = new Config()

    config.option.value = 'https://media.example.com/live/camera.m3u8?token=test'
    expect(resolveVideoStream(config.option)).toMatchObject({ ok: true, protocol: 'hls' })

    config.option.value = 'https://media.example.com/live/camera.flv'
    expect(resolveVideoStream(config.option)).toMatchObject({ ok: true, protocol: 'flv' })

    config.option.value = 'wss://media.example.com/live/camera'
    expect(resolveVideoStream(config.option)).toMatchObject({ ok: true, protocol: 'flv' })
  })

  it('允许无扩展名网关地址显式选择 WHEP WebRTC', () => {
    const config = new Config()
    config.option.sourceProtocol = 'gb28181'
    config.option.playbackProtocol = 'webrtc'
    config.option.value = 'https://media.example.com/whep/camera-01'

    expect(resolveVideoStream(config.option)).toEqual({
      ok: true,
      protocol: 'webrtc',
      url: 'https://media.example.com/whep/camera-01',
    })
  })

  it('拒绝浏览器无法直连的原始协议地址', () => {
    const config = new Config()

    for (const value of [
      'rtsp://camera.example.com/live',
      'rtmp://media.example.com/live/camera',
      'gb28181://device/channel',
    ]) {
      config.option.value = value
      const result = resolveVideoStream(config.option)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.message).toContain('流媒体网关')
    }
  })

  // 端口和路径不能证明上游提供 HLS；只能使用实际配置的输出地址。
  it.each(['auto', 'native', 'hls', 'webrtc'] as const)('%s 不猜测 RTSP 对应的 HLS 地址', (protocol) => {
    const config = new Config()
    config.option.playbackProtocol = protocol
    config.option.value = 'rtsp://stream.strba.sk:1935/strba/VYHLAD_JAZERO.stream'
    expect(resolveVideoStream(config.option)).toMatchObject({ ok: false })
  })

  it('RTSP 上游可使用显式配置的 HLS 输出地址', () => {
    const config = new Config()
    config.option.sourceProtocol = 'rtsp'
    config.option.value = 'http://media.example.com/live/camera/hls.m3u8'
    expect(resolveVideoStream(config.option)).toEqual({
      ok: true,
      protocol: 'hls',
      url: config.option.value,
    })
  })

  it('旧场景只有 value 时仍可回退浏览器原生播放', () => {
    const config = new Config()
    config.option.value = 'https://media.example.com/archive/camera.mp4'

    expect(resolveVideoStream(config.option)).toMatchObject({ ok: true, protocol: 'native' })
  })

  it('向安监上游协议展示转协议说明', () => {
    expect(getVideoProtocolHint('rtsp', 'auto')).toContain('浏览器不能直接连接')
    expect(getVideoProtocolHint('webrtc', 'webrtc')).toContain('WHEP')
  })

  // 新模式显式声明网关契约，避免被原有的 WS-FLV 推断误识别。
  it.each(['rtsp-webrtc', 'rtsp-mse'] as const)('%s 使用源流与同源默认网关', (protocol) => {
    const config = new Config()
    config.option.playbackProtocol = protocol
    config.option.sourceUrl = 'rtsp://camera.example.com/live'
    expect(resolveVideoStream(config.option)).toEqual({
      ok: true,
      protocol,
      url: protocol === 'rtsp-webrtc' ? '/api/rtsp/webrtc' : '/ws/rtsp/mse',
      sourceUrl: config.option.sourceUrl,
    })
    expect(getVideoProtocolHint('rtsp', protocol)).toContain(
      protocol === 'rtsp-mse' ? 'MSE' : 'Base64',
    )
  })

  it('显式 MSE 模式保留带参数网关地址', () => {
    const config = new Config()
    Object.assign(config.option, {
      playbackProtocol: 'rtsp-mse',
      sourceUrl: 'rtsp://camera.example.com/live',
      value: 'wss://media.example.com/ws/rtsp/mse?channel=2',
    })
    expect(resolveVideoStream(config.option)).toMatchObject({
      ok: true,
      protocol: 'rtsp-mse',
      url: config.option.value,
    })
  })

  it('私有模式接受单独填写的 RTSP 源地址，其他模式仍拒绝', () => {
    const config = new Config()
    config.option.value = 'rtsp://camera.example.com/live'
    expect(resolveVideoStream(config.option).ok).toBe(false)
    config.option.playbackProtocol = 'rtsp-webrtc'
    expect(resolveVideoStream(config.option)).toMatchObject({
      ok: true,
      url: '/api/rtsp/webrtc',
      sourceUrl: config.option.value,
    })
  })

  it.each([
    '',
    'gb28181://device/channel',
    'rtmp://media.example.com/live',
    'https://camera.example.com',
  ])('私有模式拒绝非 RTSP 源流：%s', (sourceUrl) => {
    const config = new Config()
    Object.assign(config.option, { playbackProtocol: 'rtsp-mse', sourceUrl })
    expect(resolveVideoStream(config.option).ok).toBe(false)
  })

  it.each([
    ['rtsp-webrtc', 'wss://media.example.com/ws'],
    ['rtsp-mse', 'ftp://media.example.com/feed'],
    ['rtsp-mse', 'javascript:alert(1)'],
  ] as const)('拒绝不匹配的网关协议：%s %s', (playbackProtocol, value) => {
    const config = new Config()
    Object.assign(config.option, {
      playbackProtocol,
      value,
      sourceUrl: 'rtsp://camera.example.com/live',
    })
    expect(resolveVideoStream(config.option).ok).toBe(false)
  })

  it('缺失协议字段的历史场景仍回退普通视频', () => {
    expect(
      resolveVideoStream({ value: 'https://media.example.com/archive.mp4' } as Config['option']),
    ).toEqual({ ok: true, protocol: 'native', url: 'https://media.example.com/archive.mp4' })
  })
})
