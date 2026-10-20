import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { VideoOption } from './config'
import { isPrivateRtspProtocol, resolveVideoStream } from './streamModel'
import { attachVideoStream, type VideoStreamController } from './streamPlayer'
import { getManagedVideoSource, resolveVideoPlayback } from './mediaClient'
import { useSceneMediaServer } from '@/integrations/scene/useSceneMediaServer'

/**
 * 同一视频元素的会话调度：配置切换、重连和卸载共用取消入口。
 * 版本号隔离过期事件，取消信号则实际关闭尚在初始化的网络和媒体资源。
 */
export const useVideoStream = (
  videoRef: Ref<HTMLVideoElement | null>,
  getOption: () => VideoOption,
) => {
  const sceneServerId = useSceneMediaServer()
  const loading = ref(false)
  const errorMessage = ref('')
  const needsManualPlay = ref(false)
  let controller: VideoStreamController | null = null
  let request: AbortController | null = null
  let reconnectTimer: number | undefined
  let reconnectCount = 0
  let version = 0
  let unmounted = false
  const hasPlaybackUrl = computed(() => {
    const option = getOption()
    return Boolean(
      String(option.value ?? '').trim() ||
        getManagedVideoSource(option) ||
        (isPrivateRtspProtocol(option.playbackProtocol) && String(option.sourceUrl ?? '').trim()),
    )
  })
  const clearReconnect = () => {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = undefined
  }
  const disposeController = (active: VideoStreamController | null) => {
    // 适配器本地销毁同步完成；附带的远端回收失败不应形成未处理的 Promise。
    try {
      void Promise.resolve(active?.destroy()).catch(() => undefined)
    } catch {
      /* 继续卸载其他资源。 */
    }
  }
  const release = () => {
    const active = controller
    controller = null
    request?.abort()
    request = null
    disposeController(active)
  }
  const handlePlayerError = (message: string, expectedVersion = version) => {
    if (unmounted || expectedVersion !== version || !request || request.signal.aborted) return
    version += 1
    loading.value = false
    errorMessage.value = message
    needsManualPlay.value = false
    release()
    clearReconnect()
    const option = getOption()
    const maxAttempts = Math.max(0, Math.trunc(Number(option.reconnectAttempts) || 0))
    if (reconnectCount >= maxAttempts) return
    reconnectCount += 1
    reconnectTimer = window.setTimeout(
      () => {
        reconnectTimer = undefined
        void initialize(false)
      },
      Math.max(500, Number(option.reconnectInterval) || 3000),
    )
  }
  const tryPlay = async (manual = false) => {
    const video = videoRef.value
    if (unmounted || !request || request.signal.aborted || !video) return
    if (!manual && (!getOption().autoplay || needsManualPlay.value)) return
    const currentVersion = version
    try {
      await video.play()
    } catch (error) {
      if (unmounted || version !== currentVersion || !request || request.signal.aborted) return
      if (error instanceof Error && error.name === 'AbortError') return
      loading.value = false
      // 自动播放被拒绝属于交互限制，保留已连接会话，提供可直接点击的播放入口。
      needsManualPlay.value = true
      errorMessage.value = '请点击播放；自动播放通常需要开启静音'
    }
  }
  const initialize = async (resetCount = true) => {
    if (unmounted) return
    const currentVersion = ++version
    clearReconnect()
    release()
    if (resetCount) reconnectCount = 0
    errorMessage.value = ''
    needsManualPlay.value = false
    const video = videoRef.value
    loading.value = Boolean(video && hasPlaybackUrl.value)
    if (!video || !hasPlaybackUrl.value) return
    // 只有继承场景服务器的组件需要等待发布快照；显式覆盖不依赖场景默认值。
    if (getManagedVideoSource(getOption()) && !getOption().mediaServerId && sceneServerId.value === null) return
    // 冻结本次源配置，避免等待信令时响应式配置被下一轮编辑改变。
    const option = { ...getOption() }
    const attempt = new AbortController()
    request = attempt
    try {
      const managedSource = getManagedVideoSource(option)
      if (managedSource) {
        // 属性输入稳定后才创建服务器拉流，输入新字符立即取消旧等待和过期请求。
        await new Promise<void>((resolve, reject) => {
          const cancel = () => { window.clearTimeout(timer); reject(attempt.signal.reason) }
          const timer = window.setTimeout(() => {
            attempt.signal.removeEventListener('abort', cancel)
            resolve()
          }, 600)
          attempt.signal.addEventListener('abort', cancel, { once: true })
        })
      }
      const resolution = managedSource
        ? await resolveVideoPlayback(option, attempt.signal, sceneServerId.value ?? '')
        : resolveVideoStream(option)
      attempt.signal.throwIfAborted()
      if (!resolution.ok) {
        loading.value = false
        errorMessage.value = resolution.message
        release()
        return
      }
      const next = await attachVideoStream(video, resolution, option, {
        signal: attempt.signal,
        onError: (message) => handlePlayerError(message, currentVersion),
      })
      if (unmounted || version !== currentVersion || attempt.signal.aborted) {
        disposeController(next)
        return
      }
      controller = next
      // 未收到媒体时等待 canplay，避免把尚未准备好的流误判为自动播放失败。
      if (video.readyState >= 3) {
        loading.value = false
        void tryPlay()
      }
    } catch (error) {
      if (attempt.signal.aborted || version !== currentVersion || unmounted) return
      handlePlayerError(error instanceof Error ? error.message : '视频流初始化失败', currentVersion)
    }
  }
  const handleCanPlay = () => {
    if (unmounted || !request || request.signal.aborted) return
    loading.value = false
    void tryPlay()
  }
  const handlePlaying = () => {
    if (unmounted || !request || request.signal.aborted) return
    loading.value = false
    errorMessage.value = ''
    needsManualPlay.value = false
    reconnectCount = 0
  }
  const handleNativeError = () => {
    if (errorMessage.value || !videoRef.value?.error) return
    handlePlayerError('视频加载失败，请检查地址、视频编码和网络连接')
  }
  watch(
    () => {
      const option = getOption()
      return [
        videoRef.value,
        option.value,
        option.sourceProtocol,
        option.playbackProtocol,
        option.sourceUrl,
        getManagedVideoSource(option) ? option.mediaServerId || sceneServerId.value : '',
        option.isLive,
        option.lowLatency,
        option.withCredentials,
      ]
    },
    () => void initialize(),
    { immediate: true, flush: 'post' },
  )
  onBeforeUnmount(() => {
    unmounted = true
    version += 1
    clearReconnect()
    release()
  })
  return {
    loading,
    errorMessage,
    needsManualPlay,
    hasPlaybackUrl,
    handleCanPlay,
    handlePlaying,
    handleNativeError,
    restartPlayer: () => void initialize(),
    playManually: () => void tryPlay(true),
  }
}
