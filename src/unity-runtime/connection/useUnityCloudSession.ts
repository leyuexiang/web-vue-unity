import type { Ref } from 'vue'
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { LegacyUnityTransport, type LegacyConnectionSnapshot, type LegacySessionConfig } from '@/unity-runtime/connection/LegacyUnityTransport'

export function useUnityCloudSession(videoRef: Ref<HTMLVideoElement | null>) {
  const snapshot = ref<LegacyConnectionSnapshot>({ state: 'closed', message: '等待连接', connectionId: '', videoReady: false, inputReady: false, rpcReady: false, runtimeReady: false, peerState: 'new' })
  const error = ref('')
  const transport = shallowRef<LegacyUnityTransport | null>(null)
  let unsubscribe: (() => void) | null = null

  const connect = async (config: LegacySessionConfig) => {
    await disconnect()
    if (!videoRef.value) throw new Error('Unity 视频元素尚未挂载')
    transport.value = new LegacyUnityTransport(config, videoRef.value)
    unsubscribe = transport.value.onSnapshot((value) => { snapshot.value = value })
    error.value = ''
    try { await transport.value.connect() } catch (cause) { error.value = cause instanceof Error ? cause.message : '连接失败'; throw cause }
  }
  const disconnect = async () => {
    unsubscribe?.(); unsubscribe = null
    if (transport.value) await transport.value.disconnect()
    transport.value = null
  }
  const reconnect = async (config: LegacySessionConfig) => { await disconnect(); await connect(config) }
  const sendPointer = (event: MouseEvent | WheelEvent, rect: DOMRect) => transport.value?.sendPointerInput(event, rect)
  const sendKeyboard = (event: KeyboardEvent) => transport.value?.sendKeyboardInput(event)
  const releaseInput = () => transport.value?.sendReleaseInput()
  onBeforeUnmount(() => { void disconnect() })
  return { snapshot, error, transport, connect, disconnect, reconnect, sendPointer, sendKeyboard, releaseInput }
}
