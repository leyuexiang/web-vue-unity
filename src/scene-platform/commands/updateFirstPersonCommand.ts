import type { FirstPersonConfig, SceneObject } from '../core/types'
import type { SceneCommand } from './types'
import type { SceneStore } from '../store/sceneStore'

/** 更新第一人称控制器配置，连续输入会合并为一条撤销记录。 */
export function createUpdateFirstPersonCommand(
  objectId: string,
  patch: Partial<FirstPersonConfig>,
): SceneCommand {
  let previousObject: SceneObject | null = null
  let nextPatch = { ...patch }
  const command = {
    name: 'UpdateFirstPerson',
    objectId,
    patch: nextPatch,
    execute: (store: SceneStore) => {
      previousObject ??= store.getObject(objectId)
      const current = store.getObject(objectId)
      if (!current?.firstPerson) throw new Error(`First-person object not found: ${objectId}`)
      if (store.isObjectEffectivelyLocked(objectId)) {
        throw new Error(`Locked object cannot update first-person: ${objectId}`)
      }
      const updated = { ...current.firstPerson, ...nextPatch }
      if (updated.eyeHeight > updated.height) updated.eyeHeight = updated.height
      if (updated.collisionRadius > updated.height / 2) updated.collisionRadius = updated.height / 2
      store.upsertObject({ ...current, firstPerson: updated })
    },
    undo: (store: SceneStore) => { if (previousObject) store.upsertObject(previousObject) },
    mergeWith: (nextCommand: SceneCommand) => {
      if (nextCommand.name !== 'UpdateFirstPerson') return false
      const candidate = nextCommand as { objectId?: string; patch?: Partial<FirstPersonConfig> }
      if (candidate.objectId !== objectId || !candidate.patch) return false
      nextPatch = { ...nextPatch, ...candidate.patch }
      command.patch = nextPatch
      return true
    },
  }
  return command as SceneCommand
}
