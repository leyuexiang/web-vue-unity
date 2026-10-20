import type { SceneStore } from '../store/sceneStore'

export interface SceneCommand {
  name: string
  execute: (store: SceneStore) => void
  undo: (store: SceneStore) => void
  /**
   * 尝试把后续命令合并到当前命令。
   *
   * 用于高频编辑场景，例如拖拽过程中同一对象连续 Transform 更新只保留一条撤销记录。
   * 该方法只允许修改命令自身的历史快照，不应直接操作 Store。
   */
  mergeWith?: (nextCommand: SceneCommand) => boolean
  /**
   * 命令从撤销栈和重做栈永久移除时调用。
   *
   * 该钩子只用于释放命令独占的运行时资源；命令仍可被撤销或重做期间绝不能调用。
   * 清理失败不会影响历史栈状态，具体容错由 CommandBus 负责。
   */
  onDiscard?: () => void
}
