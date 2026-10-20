import type { SceneObject } from '../core/types'
import type { SceneCommand } from './types'

interface UpdateObjectVisibilityCommand extends SceneCommand {
  objectId: string
  getVisible: () => boolean
}

const isUpdateObjectVisibilityCommand = (
  command: SceneCommand,
): command is UpdateObjectVisibilityCommand =>
  command.name === 'UpdateObjectVisibility' &&
  typeof (command as Partial<UpdateObjectVisibilityCommand>).objectId === 'string' &&
  typeof (command as Partial<UpdateObjectVisibilityCommand>).getVisible === 'function'

/**
 * 创建对象显隐更新命令。
 *
 * 显隐是场景领域状态，不能只修改 Three 或 Cesium 的运行时对象；否则保存、重开和撤销重做
 * 会各自持有不同结果。命令只更新 SceneStore，RuntimeBridge 会在同一批次内把最终状态同步
 * 给对应 Runtime。连续勾选会合并为一条历史记录，避免复选框高频切换污染撤销栈。
 */
export function createUpdateObjectVisibilityCommand(
  objectId: string,
  visible: boolean,
): SceneCommand {
  let previousObject: SceneObject | null = null
  let nextVisible = visible

  const command: UpdateObjectVisibilityCommand = {
    name: 'UpdateObjectVisibility',
    objectId,
    getVisible: () => nextVisible,
    execute: (store) => {
      if (!previousObject) {
        previousObject = store.getObject(objectId)
      }

      const current = store.getObject(objectId)
      if (!current) {
        throw new Error(`Object not found: ${objectId}`)
      }

      store.upsertObject({ ...current, visible: nextVisible })
    },
    undo: (store) => {
      if (previousObject) store.upsertObject(previousObject)
    },
    mergeWith: (nextCommand) => {
      if (!isUpdateObjectVisibilityCommand(nextCommand)) return false
      if (nextCommand.objectId !== objectId) return false
      nextVisible = nextCommand.getVisible()
      return true
    },
  }

  return command
}
