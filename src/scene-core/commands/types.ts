import type { SceneStore } from '@/scene-core/store/sceneStore'

export interface SceneCommand {
  readonly name: string
  execute(store: SceneStore): void
  undo(store: SceneStore): void
  mergeWith?(next: SceneCommand): boolean
}
