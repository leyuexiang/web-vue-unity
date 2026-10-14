<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useUnityCloudSession } from '@/unity-runtime/connection/useUnityCloudSession'
import { JsonRpcUnityCloudRuntime } from '@/unity-runtime/runtime/JsonRpcUnityCloudRuntime'
import type { LegacySessionConfig } from '@/unity-runtime/connection/LegacyUnityTransport'
import type { SceneDefinition } from '@/scene-core'
import type { UnityGizmoMode } from '@/unity-runtime/protocol/types'

export type UnityViewportState = 'idle' | 'connecting' | 'ready' | 'loading' | 'reconnecting' | 'failed'
const props = withDefaults(defineProps<{
  state?: UnityViewportState
  progress?: number
  message?: string
  sessionConfig?: LegacySessionConfig
  scene?: SceneDefinition
}>(), { state: 'idle', progress: 0, message: '' })

const emit = defineEmits<{
  (event: 'state-change', state: UnityViewportState): void
  (event: 'scene-progress', progress: number): void
  (event: 'scene-loaded', sceneId: string): void
  (event: 'scene-failed', message: string): void
  (event: 'selection-changed', instanceId: string | null): void
  (event: 'transform-preview', instanceId: string, transform: SceneDefinition['objects'][number]['transform']): void
  (event: 'transform-committed', instanceId: string, transform: SceneDefinition['objects'][number]['transform']): void
  (event: 'gizmo-mode-change', mode: UnityGizmoMode): void
}>()

const video = ref<HTMLVideoElement | null>(null)
const surface = ref<HTMLElement | null>(null)
const { snapshot, connect, disconnect, sendPointer, sendKeyboard, releaseInput, transport } = useUnityCloudSession(video)
const busy = ref(false)
const runtimeError = ref('')
let runtime: JsonRpcUnityCloudRuntime | null = null
let runtimeInitializing = false
let runtimeInitTimer = 0
let runtimeEventUnsubscribers: Array<() => void> = []
let sceneLoadSequence = 0
let gizmoMode: UnityGizmoMode = 'select'
const connectionActive = computed(() => snapshot.value.state !== 'closed' && snapshot.value.state !== 'failed')
const effectiveState = computed<UnityViewportState>(() => {
  if (snapshot.value.state === 'failed') return 'failed'
  if (snapshot.value.state === 'connecting' || snapshot.value.state === 'waiting-renderer' || snapshot.value.state === 'negotiating') return 'connecting'
  if (snapshot.value.videoReady) return props.state === 'loading' ? 'loading' : 'ready'
  return props.state
})
const effectiveMessage = computed(() => connectionActive.value || snapshot.value.state === 'failed' ? snapshot.value.message : props.message)
const statusLabel = computed(() => ({ idle: '等待连接', connecting: '连接云渲染', ready: '视频已连接', loading: '加载场景', reconnecting: '正在重连', failed: '连接失败' }[effectiveState.value]))
const channels = computed(() => [
  { label: 'Video', ready: snapshot.value.videoReady },
  { label: 'Input', ready: snapshot.value.inputReady },
  { label: 'RPC', ready: snapshot.value.rpcReady },
  { label: 'editor.v1', ready: snapshot.value.runtimeReady },
])

const start = async () => {
  if (!props.sessionConfig || busy.value) return
  busy.value = true
  try { await connect(props.sessionConfig) } finally { busy.value = false }
}
const stop = async () => {
  if (busy.value) return
  busy.value = true
  try {
    window.clearTimeout(runtimeInitTimer)
    runtimeEventUnsubscribers.splice(0).forEach((unsubscribe) => unsubscribe())
    runtime = null
    runtimeInitializing = false
    runtimeError.value = ''
    await disconnect()
  } finally { busy.value = false }
}
const handlePointer = (event: MouseEvent | WheelEvent) => { if (!surface.value) return; if (event.type === 'mousedown') video.value?.focus(); sendPointer(event, surface.value.getBoundingClientRect()) }
const handleKey = (event: KeyboardEvent) => { if (!snapshot.value.inputReady) return; event.preventDefault(); event.stopPropagation(); sendKeyboard(event) }
const initializeRuntime = async () => {
  if (!transport.value || snapshot.value.runtimeReady || !snapshot.value.rpcReady || runtimeInitializing) return
  runtimeInitializing = true
  runtimeError.value = ''
  runtimeEventUnsubscribers.splice(0).forEach((unsubscribe) => unsubscribe())
  runtime = new JsonRpcUnityCloudRuntime(transport.value)
  const activeRuntime = runtime
  runtimeEventUnsubscribers = [
    activeRuntime.on('sceneProgress', ({ progress }) => emit('scene-progress', progress)),
    activeRuntime.on('sceneLoaded', ({ sceneId }) => {
      emit('state-change', 'ready')
      emit('scene-loaded', sceneId)
    }),
    activeRuntime.on('sceneFailed', ({ message }) => {
      runtimeError.value = message
      emit('state-change', 'failed')
      emit('scene-failed', message)
    }),
    activeRuntime.on('selectionChanged', ({ instanceId }) => emit('selection-changed', instanceId)),
    activeRuntime.on('transformPreview', ({ instanceId, transform }) => emit('transform-preview', instanceId, transform)),
    activeRuntime.on('transformCommitted', ({ instanceId, transform }) => emit('transform-committed', instanceId, transform)),
  ]
  try {
    await activeRuntime.connect()
    await activeRuntime.setGizmoMode(gizmoMode)
    if (props.scene) {
      emit('state-change', 'loading')
      await activeRuntime.loadScene(props.scene)
    } else {
      emit('state-change', 'ready')
    }
  } catch (error) {
    runtimeError.value = error instanceof Error ? error.message : 'editor.v1 初始化失败'
    emit('state-change', 'failed')
    emit('scene-failed', runtimeError.value)
  } finally {
    runtimeInitializing = false
  }
}
const loadCurrentScene = async () => {
  if (!runtime || !props.scene || runtimeInitializing) return
  const sequence = ++sceneLoadSequence
  emit('state-change', 'loading')
  runtimeError.value = ''
  try {
    await runtime.loadScene(props.scene)
    if (sequence === sceneLoadSequence) emit('state-change', 'ready')
  } catch (error) {
    if (sequence !== sceneLoadSequence) return
    runtimeError.value = error instanceof Error ? error.message : 'Unity 场景加载失败'
    emit('state-change', 'failed')
    emit('scene-failed', runtimeError.value)
  }
}
const clearCurrentScene = async () => {
  if (!runtime || runtimeInitializing) return
  runtimeError.value = ''
  try {
    await runtime.clearScene()
    emit('state-change', 'ready')
  } catch (error) {
    runtimeError.value = error instanceof Error ? error.message : 'Unity 场景清空失败'
    emit('state-change', 'failed')
    emit('scene-failed', runtimeError.value)
  }
}
watch(() => snapshot.value.rpcReady, (ready) => {
  window.clearTimeout(runtimeInitTimer)
  if (ready) runtimeInitTimer = window.setTimeout(() => { void initializeRuntime() }, 750)
})
const handlePlaying = () => transport.value?.markVideoPlaying()
const handleBlur = () => releaseInput()
const setSelection = (instanceId: string | null) => runtime?.setSelection(instanceId)
const updateObject = async (instanceId: string) => {
  const object = props.scene?.objects.find((item) => item.instanceId === instanceId)
  if (object) await runtime?.updateObject(object)
}
const setGizmoMode = async (mode: UnityGizmoMode) => {
  gizmoMode = mode
  emit('gizmo-mode-change', mode)
  await runtime?.setGizmoMode(mode)
}
defineExpose({ loadScene: loadCurrentScene, clearScene: clearCurrentScene, setSelection, updateObject, setGizmoMode })
onBeforeUnmount(() => {
  window.clearTimeout(runtimeInitTimer)
  runtimeEventUnsubscribers.splice(0).forEach((unsubscribe) => unsubscribe())
  releaseInput()
  runtime = null
})
</script>

<template>
  <section ref="surface" class="unity-viewport" :data-state="effectiveState">
    <video
      ref="video"
      class="unity-viewport__video"
      autoplay
      playsinline
      tabindex="0"
      @click="video?.play()"
      @playing="handlePlaying"
      @mousedown="handlePointer"
      @mouseup="handlePointer"
      @mousemove="handlePointer"
      @wheel.prevent="handlePointer"
      @keydown="handleKey"
      @keyup="handleKey"
      @blur="handleBlur"
      @contextmenu.prevent
    />
    <div v-if="!snapshot.videoReady" class="unity-viewport__grid" />
    <div class="unity-viewport__status">
      <span class="status-dot" />
      <span>{{ statusLabel }}</span>
    </div>
    <div v-if="runtimeError" class="unity-viewport__runtime-error">{{ runtimeError }}</div>
    <div class="unity-viewport__channels">
      <span v-for="channel in channels" :key="channel.label" :class="{ 'is-ready': channel.ready }">{{ channel.label }}</span>
    </div>
    <div v-if="effectiveState !== 'ready'" class="unity-viewport__placeholder">
      <div class="unity-mark">U</div>
      <strong>{{ statusLabel }}</strong>
      <p>{{ runtimeError || effectiveMessage || '点击连接后，将通过测试信令启动本机 Unity 云渲染进程。' }}</p>
      <small v-if="snapshot.connectionId">ClientID: {{ snapshot.connectionId }}</small>
      <div class="unity-viewport__actions">
        <button v-if="!connectionActive" type="button" :disabled="!sessionConfig || busy" @click="start">{{ snapshot.state === 'failed' ? '重新连接' : '连接 Unity' }}</button>
        <button v-else type="button" :disabled="busy" @click="stop">断开</button>
      </div>
      <div v-if="effectiveState === 'loading'" class="progress-track"><span :style="{ width: `${Math.max(0, Math.min(100, progress))}%` }" /></div>
    </div>
    <slot />
  </section>
</template>
