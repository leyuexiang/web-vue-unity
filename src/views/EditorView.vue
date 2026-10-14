<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { UnityGizmoMode } from '@/unity-runtime/protocol/types'
import {
  createCommandBus,
  createDefaultTransform,
  createEmptyScene,
  createObjectCommand,
  createSceneStore,
  deleteObjectCommand,
  deserializeSceneFromFourPackages,
  serializeSceneToFourPackages,
  updateObjectTransformCommand,
  type SceneFourPackagePayload,
  type SceneObject,
  type SceneTransform,
} from '@/scene-core'
import SceneHierarchy from '@/components/editor/SceneHierarchy.vue'
import SceneInspector from '@/components/editor/SceneInspector.vue'
import UnityViewport from '@/components/unity/UnityViewport.vue'

const sceneStore = createSceneStore(createEmptyScene())
const commandBus = createCommandBus(sceneStore)
const scene = ref(sceneStore.getScene())
const selectedId = ref<string | null>(null)
const undoSize = ref(0)
const redoSize = ref(0)
const gizmoMode = ref<UnityGizmoMode>('select')
type UnityViewportHandle = ComponentPublicInstance & {
  loadScene: () => Promise<void>
  clearScene: () => Promise<void>
  setSelection: (instanceId: string | null) => void
  updateObject: (instanceId: string) => Promise<void>
  setGizmoMode: (mode: UnityGizmoMode) => Promise<void>
}
const viewport = ref<UnityViewportHandle | null>(null)
const viewportState = ref<'idle' | 'connecting' | 'ready' | 'loading' | 'reconnecting' | 'failed'>('idle')
const viewportProgress = ref(0)
const sceneError = ref('')
const runtimeConfig = ref({
  // 默认连接本机测试信令，部署环境通过 VITE_SIGNAL_URL 注入实际地址。
  signalUrl: import.meta.env.VITE_SIGNAL_URL || 'ws://localhost:8923',
  appId: import.meta.env.VITE_UNITY_APP_ID || '1',
  sceneKey: import.meta.env.VITE_UNITY_SCENE_KEY || 'web-unity-gm1',
  connectionId: import.meta.env.VITE_UNITY_CLIENT_ID || 'web-unity-editor',
  macAddress: import.meta.env.VITE_RENDERER_MAC || '',
})
const viewportMessage = computed(() => `测试链路：${runtimeConfig.value.signalUrl}。当前先验证视频、输入和 rpc DataChannel，editor.v1 尚待 Unity 实现。`)
let objectSequence = 0
const unityTransformBaselines = new Map<string, SceneTransform>()

const unsubscribeStore = sceneStore.subscribe((event) => {
  scene.value = sceneStore.getScene()
  selectedId.value = sceneStore.getSelectedObjectId()
  if (event.type === 'selection-changed' && event.origin === 'web') {
    viewport.value?.setSelection(event.instanceId)
  }
})
const unsubscribeHistory = commandBus.subscribe(() => {
  undoSize.value = commandBus.getUndoSize()
  redoSize.value = commandBus.getRedoSize()
})

onMounted(() => {
  const saved = localStorage.getItem('web-unity.runtime-config')
  if (!saved) return
  try { runtimeConfig.value = { ...runtimeConfig.value, ...JSON.parse(saved) } } catch { /* ignore invalid local config */ }
})

const saveRuntimeConfig = () => localStorage.setItem('web-unity.runtime-config', JSON.stringify(runtimeConfig.value))

const loadFourPackages = (payload: SceneFourPackagePayload) => {
  const restored = deserializeSceneFromFourPackages(scene.value.id, payload)
  sceneStore.loadScene(restored)
  viewportProgress.value = 0
  sceneError.value = ''
  void viewport.value?.loadScene()
  return restored
}

const importFourPackages = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const payload = JSON.parse(await file.text()) as SceneFourPackagePayload
    loadFourPackages(payload)
  } catch (error) {
    sceneError.value = error instanceof Error ? error.message : '四包场景加载失败'
  }
}

const exportFourPackages = () => {
  const payload = serializeSceneToFourPackages(scene.value)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${scene.value.id}.four-packages.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const clearUnityScene = async () => {
  await viewport.value?.clearScene()
}

const changeGizmoMode = async (mode: UnityGizmoMode) => {
  gizmoMode.value = mode
  await viewport.value?.setGizmoMode(mode)
}

onBeforeUnmount(() => {
  unsubscribeStore()
  unsubscribeHistory()
})

const selectedObject = computed(() =>
  selectedId.value ? scene.value.objects.find((item) => item.instanceId === selectedId.value) ?? null : null,
)

const createDemoObject = () => {
  objectSequence += 1
  const object: SceneObject = {
    instanceId: `demo-${Date.now()}-${objectSequence}`,
    objectType: 'model',
    name: `设备模型 ${scene.value.objects.length + 1}`,
    visible: true,
    locked: false,
    transform: createDefaultTransform(),
    resourceRefKeys: [],
    properties: {},
  }
  commandBus.execute(createObjectCommand(object))
  sceneStore.selectObject(object.instanceId)
}

const deleteSelected = () => {
  const object = selectedObject.value
  if (!object) return
  commandBus.execute(deleteObjectCommand(object))
}

const updateTransform = (before: SceneTransform, after: SceneTransform) => {
  if (!selectedId.value) return
  const instanceId = selectedId.value
  commandBus.execute(updateObjectTransformCommand(instanceId, before, after))
  void viewport.value?.updateObject(instanceId)
}

const updateVisibility = (visible: boolean) => {
  const object = selectedObject.value
  if (!object) return
  commandBus.execute({
    name: '修改对象显隐',
    execute: (store) => store.upsertObject({ ...object, visible }),
    undo: (store) => store.upsertObject(object),
  })
}

const handleUnitySelection = (instanceId: string | null) => {
  sceneStore.selectObject(instanceId, 'unity')
}

const handleUnityTransformPreview = (instanceId: string, transform: SceneTransform) => {
  const object = sceneStore.getObject(instanceId)
  if (!object) return
  if (!unityTransformBaselines.has(instanceId)) unityTransformBaselines.set(instanceId, object.transform)
  sceneStore.upsertObject({ ...object, transform })
}

const handleUnityTransformCommitted = (instanceId: string, transform: SceneTransform) => {
  const object = sceneStore.getObject(instanceId)
  const before = unityTransformBaselines.get(instanceId) ?? object?.transform
  unityTransformBaselines.delete(instanceId)
  if (!object || !before || JSON.stringify(before) === JSON.stringify(transform)) return
  commandBus.execute(updateObjectTransformCommand(instanceId, before, transform))
}
</script>

<template>
  <div class="editor-page">
    <header class="topbar">
      <div class="brand">
        <span class="brand__mark">JU</span>
        <div><strong>Unity 场景编辑器</strong><small>{{ scene.name }}</small></div>
      </div>
      <nav class="toolbar">
        <button type="button" :disabled="undoSize === 0" @click="commandBus.undo()">撤销 {{ undoSize }}</button>
        <button type="button" :disabled="redoSize === 0" @click="commandBus.redo()">重做 {{ redoSize }}</button>
        <span class="toolbar__divider" />
        <button type="button" @click="createDemoObject">添加模型</button>
        <button type="button" :disabled="!selectedObject" @click="deleteSelected">删除</button>
      </nav>
      <div class="topbar__actions">
        <label class="button-secondary">
          导入四包
          <input type="file" accept="application/json" hidden @change="importFourPackages" />
        </label>
        <button class="button-secondary" type="button" @click="exportFourPackages">导出四包</button>
        <button class="button-secondary" type="button" @click="clearUnityScene">清空 Unity 场景</button>
        <button class="button-secondary" type="button" disabled title="只读预览将在发布接口接入后启用">预览（待接入）</button>
        <button class="button-primary" type="button" disabled title="正式四包契约与 saveAll 接口尚未接入">保存（待接入）</button>
      </div>
    </header>

    <main class="editor-layout">
      <SceneHierarchy
        :objects="scene.objects"
        :selected-id="selectedId"
        @select="sceneStore.selectObject($event)"
      />

      <div class="viewport-shell">
        <div class="viewport-toolbar">
          <div class="viewport-toolbar__group">
            <button
              type="button"
              :class="{ 'is-active': gizmoMode === 'select' }"
              :aria-pressed="gizmoMode === 'select'"
              @click="void changeGizmoMode('select')"
            >选择</button>
            <button
              type="button"
              :class="{ 'is-active': gizmoMode === 'translate' }"
              :aria-pressed="gizmoMode === 'translate'"
              @click="void changeGizmoMode('translate')"
            >移动</button>
            <button
              type="button"
              :class="{ 'is-active': gizmoMode === 'rotate' }"
              :aria-pressed="gizmoMode === 'rotate'"
              @click="void changeGizmoMode('rotate')"
            >旋转</button>
            <button
              type="button"
              :class="{ 'is-active': gizmoMode === 'scale' }"
              :aria-pressed="gizmoMode === 'scale'"
              @click="void changeGizmoMode('scale')"
            >缩放</button>
          </div>
          <details class="runtime-config">
            <summary>云渲染配置</summary>
            <label>信令<input v-model.trim="runtimeConfig.signalUrl" @change="saveRuntimeConfig" /></label>
            <label>appId<input v-model.trim="runtimeConfig.appId" @change="saveRuntimeConfig" /></label>
            <label>sceneKey<input v-model.trim="runtimeConfig.sceneKey" @change="saveRuntimeConfig" /></label>
            <label>ClientID<input v-model.trim="runtimeConfig.connectionId" @change="saveRuntimeConfig" /></label>
            <label>机器 MAC（可选）<input v-model.trim="runtimeConfig.macAddress" @change="saveRuntimeConfig" /></label>
          </details>
        </div>
        <UnityViewport
          ref="viewport"
          :state="viewportState"
          :progress="viewportProgress"
          :message="viewportMessage"
          :session-config="runtimeConfig"
          :scene="scene"
          @state-change="viewportState = $event"
          @scene-progress="viewportProgress = $event"
          @scene-failed="sceneError = $event"
          @selection-changed="handleUnitySelection"
          @transform-preview="handleUnityTransformPreview"
          @transform-committed="handleUnityTransformCommitted"
        />
        <p v-if="sceneError" class="scene-error">{{ sceneError }}</p>
        <footer class="statusbar">
          <span>对象 {{ scene.objects.length }}</span>
          <span>场景版本 {{ scene.revisionNo }}</span>
          <span>Runtime: {{ viewportState }}</span>
        </footer>
      </div>

      <SceneInspector
        :object="selectedObject"
        @transform="updateTransform"
        @visibility="updateVisibility"
      />
    </main>
  </div>
</template>
