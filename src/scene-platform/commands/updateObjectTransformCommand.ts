import type { SceneObject, SceneTransform } from '../core/types'
import type { SceneCommand } from './types'

interface UpdateObjectTransformCommand extends SceneCommand {
  objectId: string
  getTransform: () => SceneTransform
}

const isUpdateObjectTransformCommand = (
  command: SceneCommand,
): command is UpdateObjectTransformCommand =>
  command.name === 'UpdateObjectTransform' &&
  typeof (command as Partial<UpdateObjectTransformCommand>).objectId === 'string' &&
  typeof (command as Partial<UpdateObjectTransformCommand>).getTransform === 'function'

/**
 * 更新对象 Transform 命令。
 *
 * 约束：
 * - Transform 是领域数据，不允许携带引擎对象（例如 Three.Matrix4 / Cesium.Cartesian3）。
 * - objectId 不存在时抛错，避免静默失败导致状态与渲染不一致。
 */
export function createUpdateObjectTransformCommand(
  objectId: string,
  transform: SceneTransform,
): SceneCommand {
  let previousObject: SceneObject | null = null
  let nextTransform = transform

  const command: UpdateObjectTransformCommand = {
    name: 'UpdateObjectTransform',
    objectId,
    getTransform: () => nextTransform,
    execute: (store) => {
      if (!previousObject) {
        previousObject = store.getObject(objectId)
      }
      const current = store.getObject(objectId)
      if (!current) {
        throw new Error(`Object not found: ${objectId}`)
      }
      if (store.isObjectEffectivelyLocked(objectId)) {
        throw new Error(`Locked object cannot update transform: ${objectId}`)
      }
      store.upsertObject({ ...current, transform: nextTransform })
    },
    undo: (store) => {
      if (!previousObject) return
      store.upsertObject(previousObject)
    },
    mergeWith: (nextCommand) => {
      if (!isUpdateObjectTransformCommand(nextCommand)) return false
      if (nextCommand.objectId !== objectId) return false
      nextTransform = nextCommand.getTransform()
      return true
    },
  }

  return command
}
