import type { SceneDefinition, SceneObject } from '@/scene-core/model/types'

export type SceneStoreEvent =
  | { type: 'scene-loaded'; scene: SceneDefinition }
  | { type: 'object-upserted'; object: SceneObject }
  | { type: 'object-removed'; instanceId: string }
  | { type: 'selection-changed'; instanceId: string | null; origin: 'web' | 'unity' }

export interface SceneStore {
  getScene(): SceneDefinition
  loadScene(scene: SceneDefinition): void
  getObject(instanceId: string): SceneObject | null
  upsertObject(object: SceneObject): void
  removeObject(instanceId: string): void
  getSelectedObjectId(): string | null
  selectObject(instanceId: string | null, origin?: 'web' | 'unity'): void
  subscribe(listener: (event: SceneStoreEvent) => void): () => void
}

const clone = <T>(value: T): T => structuredClone(value)

export function createSceneStore(initialScene: SceneDefinition): SceneStore {
  let scene = clone(initialScene)
  let selectedObjectId: string | null = null
  const listeners = new Set<(event: SceneStoreEvent) => void>()
  const emit = (event: SceneStoreEvent) => listeners.forEach((listener) => listener(event))

  return {
    getScene: () => clone(scene),
    loadScene(nextScene) {
      scene = clone(nextScene)
      selectedObjectId = null
      emit({ type: 'scene-loaded', scene: clone(scene) })
    },
    getObject(instanceId) {
      const object = scene.objects.find((item) => item.instanceId === instanceId)
      return object ? clone(object) : null
    },
    upsertObject(object) {
      const next = clone(object)
      const index = scene.objects.findIndex((item) => item.instanceId === next.instanceId)
      if (index >= 0) scene.objects[index] = next
      else scene.objects.push(next)
      emit({ type: 'object-upserted', object: clone(next) })
    },
    removeObject(instanceId) {
      const before = scene.objects.length
      scene.objects = scene.objects.filter((item) => item.instanceId !== instanceId)
      if (scene.objects.length === before) return
      if (selectedObjectId === instanceId) selectedObjectId = null
      emit({ type: 'object-removed', instanceId })
    },
    getSelectedObjectId: () => selectedObjectId,
    selectObject(instanceId, origin = 'web') {
      if (instanceId && !scene.objects.some((item) => item.instanceId === instanceId)) return
      if (selectedObjectId === instanceId) return
      selectedObjectId = instanceId
      emit({ type: 'selection-changed', instanceId, origin })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
