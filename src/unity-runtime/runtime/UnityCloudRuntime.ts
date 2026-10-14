import type { SceneDefinition, SceneObject, SceneTransform } from '@/scene-core'
import type { UnityGizmoMode, UnityRuntimeCapabilities } from '@/unity-runtime/protocol/types'

export interface UnityRuntimeEventMap {
  selectionChanged: { instanceId: string | null }
  transformPreview: { instanceId: string; transform: SceneTransform }
  transformCommitted: { instanceId: string; transform: SceneTransform }
  sceneProgress: { progress: number; stage?: string }
  sceneLoaded: { sceneId: string }
  sceneFailed: { code: string; message: string }
}

export interface UnityCloudRuntime {
  readonly capabilities: UnityRuntimeCapabilities | null
  connect(): Promise<void>
  disconnect(): Promise<void>
  loadScene(scene: SceneDefinition): Promise<void>
  clearScene(): Promise<void>
  createObject(object: SceneObject): Promise<void>
  updateObject(object: SceneObject): Promise<void>
  deleteObject(instanceId: string): Promise<void>
  setSelection(instanceId: string | null): void
  setGizmoMode(mode: UnityGizmoMode): Promise<void>
  setMode(mode: 'edit' | 'preview'): Promise<void>
  on<TKey extends keyof UnityRuntimeEventMap>(
    type: TKey,
    listener: (payload: UnityRuntimeEventMap[TKey]) => void,
  ): () => void
}
