import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, defineComponent, nextTick, reactive, shallowRef, type Ref } from 'vue'
import { sceneMediaServerKey } from '@/integrations/scene/useSceneMediaServer'
import Config from '../config'
import {
  attachVideoStream,
  type VideoStreamController,
  type VideoStreamHooks,
} from '../streamPlayer'
import { useVideoStream } from '../useVideoStream'
import { resolveVideoPlayback } from '../mediaClient'

vi.mock('../streamPlayer', () => ({ attachVideoStream: vi.fn() }))
vi.mock('../mediaClient', async importOriginal => ({
  ...await importOriginal<typeof import('../mediaClient')>(), resolveVideoPlayback: vi.fn(),
}))

// 使用 Vue 自带渲染器执行真实 watch/卸载钩子，网络层替身只控制异步返回时序。
const renderer = createRenderer<object, object>({
  patchProp: () => undefined,
  insert: () => undefined,
  remove: () => undefined,
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText: () => undefined,
  setElementText: () => undefined,
  parentNode: () => null,
  nextSibling: () => null,
})
const tick = async () => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('视频部件会话调度', () => {
  let unmount: () => void
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('window', { setTimeout, clearTimeout })
    vi.mocked(attachVideoStream).mockReset()
    vi.mocked(resolveVideoPlayback).mockReset()
    vi.mocked(resolveVideoPlayback).mockResolvedValue({ ok: true, protocol: 'webrtc', url: '/whep' })
    vi.mocked(attachVideoStream).mockImplementation(async (_video, _stream, _option, hooks) => {
      const destroy = vi.fn()
      hooks.signal?.addEventListener('abort', destroy, { once: true })
      return { destroy }
    })
  })
  afterEach(() => {
    unmount?.()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  const mount = async (managed = false, sceneDefault?: Ref<string | null>, componentServerId = '') => {
    const option = reactive(new Config().option)
    Object.assign(option, {
      playbackProtocol: 'rtsp-mse',
      sourceUrl: 'rtsp://camera.example.com/live',
    })
    if (managed) Object.assign(option, { playbackProtocol: 'auto', value: option.sourceUrl, sourceUrl: '' })
    option.mediaServerId = componentServerId
    const video = { readyState: 0, play: vi.fn(async () => undefined), error: null }
    let state!: ReturnType<typeof useVideoStream>
    const app = renderer.createApp(
      defineComponent({
        setup() {
          state = useVideoStream(shallowRef(video as unknown as HTMLVideoElement), () => option)
          return () => null
        },
      }),
    )
    if (sceneDefault) app.provide(sceneMediaServerKey, sceneDefault)
    app.mount({})
    unmount = () => app.unmount()
    await tick()
    return { option, state, video }
  }
  const hooksAt = (index: number) => vi.mocked(attachVideoStream).mock.calls[index]![3]

  it('发布快照未就绪时等待，默认服务器加载后才发起继承接入', async () => {
    const sceneDefault = shallowRef<string | null>(null)
    await mount(true, sceneDefault)
    await vi.advanceTimersByTimeAsync(1000)
    expect(resolveVideoPlayback).not.toHaveBeenCalled()
    sceneDefault.value = 'published'
    await tick()
    await vi.advanceTimersByTimeAsync(600)
    expect(vi.mocked(resolveVideoPlayback).mock.calls[0]![2]).toBe('published')
  })

  it('组件明确指定服务器时不依赖发布默认值，也不因默认值变化重连', async () => {
    const sceneDefault = shallowRef<string | null>(null)
    await mount(true, sceneDefault, 'component')
    await vi.advanceTimersByTimeAsync(600)
    expect(resolveVideoPlayback).toHaveBeenCalledOnce()
    sceneDefault.value = 'published'
    await tick()
    await vi.advanceTimersByTimeAsync(600)
    expect(resolveVideoPlayback).toHaveBeenCalledOnce()
  })

  it('连续源输入只接入最后一次，切换后旧应答不挂载，卸载取消接入请求', async () => {
    let finish!: (value: Awaited<ReturnType<typeof resolveVideoPlayback>>) => void
    vi.mocked(resolveVideoPlayback).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { option } = await mount(true)
    await vi.advanceTimersByTimeAsync(300)
    option.value = 'rtsp://camera.example.com/final'
    await tick()
    await vi.advanceTimersByTimeAsync(600)
    expect(resolveVideoPlayback).toHaveBeenCalledOnce()
    const firstSignal = vi.mocked(resolveVideoPlayback).mock.calls[0]![1]
    expect(vi.mocked(resolveVideoPlayback).mock.calls[0]![0].value).toBe(option.value)
    option.mediaServerId = 'other'
    await tick()
    expect(firstSignal.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(600)
    finish({ ok: true, protocol: 'webrtc', url: '/stale' })
    await tick()
    expect(attachVideoStream).toHaveBeenCalledOnce()
    expect(vi.mocked(attachVideoStream).mock.calls[0]![1]).toMatchObject({ url: '/whep' })
    unmount()
    unmount = () => undefined
    expect(vi.mocked(resolveVideoPlayback).mock.calls[1]![1].aborted).toBe(true)
  })

  it('自动接入失败后重连重新解析，不使用过期的在线地址', async () => {
    vi.mocked(resolveVideoPlayback).mockRejectedValueOnce(new Error('源流接入失败'))
    const { option, state } = await mount(true)
    option.reconnectAttempts = 1
    await vi.advanceTimersByTimeAsync(600)
    expect(state.errorMessage.value).toBe('源流接入失败')
    await vi.advanceTimersByTimeAsync(3600)
    expect(resolveVideoPlayback).toHaveBeenCalledTimes(2)
    expect(attachVideoStream).toHaveBeenCalledOnce()
  })

  it('初始化未结束时切换源流立即取消，旧回调不能销毁新会话', async () => {
    let finish!: (controller: VideoStreamController) => void
    vi.mocked(attachVideoStream).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { option, state } = await mount()
    const oldHooks = hooksAt(0)
    option.sourceUrl = 'rtsp://camera.example.com/channel2'
    await tick()
    expect(oldHooks.signal?.aborted).toBe(true)
    oldHooks.onError('旧连接失败')
    finish({ destroy: vi.fn() })
    await tick()
    expect(hooksAt(1).signal?.aborted).toBe(false)
    expect(state.errorMessage.value).toBe('')
  })
  it('失败只安排有限次数重连，同一旧会话重复错误不重复连接', async () => {
    const { option } = await mount()
    option.reconnectAttempts = 1
    const first = hooksAt(0)
    first.onError('断开')
    first.onError('重复断开')
    await vi.advanceTimersByTimeAsync(3000)
    expect(attachVideoStream).toHaveBeenCalledTimes(2)
    hooksAt(1).onError('再次失败')
    await vi.advanceTimersByTimeAsync(6000)
    expect(attachVideoStream).toHaveBeenCalledTimes(2)
  })
  it('卸载撤销重连计时器，晚到错误也不能唤醒播放器', async () => {
    await mount()
    const hooks = hooksAt(0)
    hooks.onError('断开')
    unmount()
    unmount = () => undefined
    hooks.onError('延迟错误')
    await vi.advanceTimersByTimeAsync(10000)
    expect(hooks.signal?.aborted).toBe(true)
    expect(attachVideoStream).toHaveBeenCalledOnce()
  })
  it('自动播放被拒绝保留连接，点击播放可恢复', async () => {
    const { video, state } = await mount()
    video.play.mockRejectedValueOnce(new DOMException('用户未交互', 'NotAllowedError'))
    state.handleCanPlay()
    await tick()
    expect(state.needsManualPlay.value).toBe(true)
    expect(hooksAt(0).signal?.aborted).toBe(false)
    state.playManually()
    await tick()
    state.handlePlaying()
    expect(video.play).toHaveBeenCalledTimes(2)
    expect(state.errorMessage.value).toBe('')
    expect(attachVideoStream).toHaveBeenCalledOnce()
  })
  it('源流为空时提示配置错误，合法配置后才创建连接', async () => {
    const { option, state } = await mount()
    option.sourceUrl = ''
    option.value = '/gateway'
    await tick()
    expect(state.errorMessage.value).toContain('RTSP 源地址')
    expect(attachVideoStream).toHaveBeenCalledOnce()
    option.sourceUrl = 'rtsp://camera.example.com/another'
    await tick()
    expect(attachVideoStream).toHaveBeenCalledTimes(2)
  })
  it('同步初始化错误也进入重连流程', async () => {
    vi.mocked(attachVideoStream).mockImplementationOnce(
      async (_v, _s, _o, hooks: VideoStreamHooks) => {
        hooks.onError('网关初始化失败')
        return { destroy: vi.fn() }
      },
    )
    const { state } = await mount()
    expect(state.errorMessage.value).toBe('网关初始化失败')
    await vi.advanceTimersByTimeAsync(3000)
    expect(attachVideoStream).toHaveBeenCalledTimes(2)
  })
})
