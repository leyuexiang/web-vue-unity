import type { SceneStore } from './sceneStore'
import type { SceneCommand } from '../commands/types'

/**
 * CommandBus 负责统一执行命令并提供 undo/redo。
 *
 * 约束：
 * - Command 只操作 SceneStore，不直接操作 Runtime；
 * - Runtime 的同步由 RuntimeBridge 订阅 SceneStore 事件完成；
 * - 任何执行新命令都会清空 redo 栈，保持线性历史。
 */
export interface CommandBus {
  execute: (command: SceneCommand) => void
  /**
   * 登记已经由外部编辑事务应用完成的命令。
   *
   * 旧 Three 编辑器和二维仓库均采用“先改状态、再保存快照”的语义。该入口只写统一历史栈，
   * 不重复调用 command.execute；后续重做仍由标准 execute 恢复新状态。
   */
  recordExecuted: (command: SceneCommand) => void
  undo: () => boolean
  redo: () => boolean
  /** 当前是否处于撤销/重做回放阶段，供运行时屏蔽回放触发的二次历史提交。 */
  getIsExecuting: () => boolean
  /**
   * 订阅撤销栈或重做栈变化。
   *
   * 二维快照命令只改变 Pinia 状态，不一定触发 SceneStore 事件；独立历史订阅能让工具栏和保存状态
   * 无需伪造场景对象更新，也能及时读取最新可撤销、可重做步数。
   */
  subscribeHistory: (listener: () => void) => () => void
  /**
   * 取消刚执行且尚未被其他命令穿插的同一条命令。
   *
   * 仅供“命令已经写入 Store，但异步 Runtime 创建最终失败”的补偿路径使用：
   * 它会恢复 Store、移除撤销记录，并且不把失败创建放入重做栈，避免用户重做出空壳对象。
   */
  cancelLatest: (command: SceneCommand) => boolean
  clear: () => void
  getUndoSize: () => number
  getRedoSize: () => number
}

/**
 * 创建一个与具体 Store 绑定的 CommandBus。
 */
export function createCommandBus(store: SceneStore): CommandBus {
  const MAX_HISTORY_SIZE = 220
  const undoStack: SceneCommand[] = []
  const redoStack: SceneCommand[] = []
  const historyListeners = new Set<() => void>()
  let executingDepth = 0

  /** 历史监听属于低频编辑边界，使用 Set 去重并保持取消订阅为常数时间。 */
  const notifyHistoryChanged = () => {
    historyListeners.forEach((listener) => listener())
  }

  /**
   * 安全释放已经无法再撤销/重做的命令资源。
   *
   * 资源清理属于历史管理的附属行为，不能因为单个 Three 对象释放失败而阻断后续编辑；
   * 因此这里捕获异常并继续清理其余历史。命令本身只会在从两个历史栈永久移除时到达此处。
   */
  const discardCommand = (command: SceneCommand | undefined): void => {
    if (!command?.onDiscard) return
    try {
      command.onDiscard()
    } catch (error) {
      console.warn('[CommandBus] 丢弃历史命令时资源清理失败', error)
    }
  }

  /** 清空指定栈并释放其中无法再恢复的运行时资源。 */
  const discardStack = (stack: SceneCommand[]): void => {
    stack.forEach(discardCommand)
    stack.length = 0
  }

  /** 清空重做栈时，栈中命令已经失去恢复机会，必须先释放其延迟资源。 */
  const discardRedoStack = (): void => {
    if (redoStack.length === 0) return
    discardStack(redoStack)
  }

  /**
   * 集中维护线性历史规则，确保直接执行命令和登记已执行命令拥有完全一致的合并、清空重做语义。
   */
  const recordExecuted = (command: SceneCommand) => {
    const previousCommand = undoStack[undoStack.length - 1]
    if (previousCommand?.mergeWith?.(command)) {
      /** 合并后的新命令不会进入任何历史栈，必须立即释放其独占资源，避免资源泄漏。 */
      discardCommand(command)
      discardRedoStack()
      notifyHistoryChanged()
      return
    }

    undoStack.push(command)
    if (undoStack.length > MAX_HISTORY_SIZE) {
      discardCommand(undoStack.shift())
    }
    discardRedoStack()
    notifyHistoryChanged()
  }

  return {
    execute: (command) => {
      executingDepth += 1
      try {
        store.runTransaction(() => {
          command.execute(store)
        })
      } finally {
        executingDepth = Math.max(0, executingDepth - 1)
      }
      recordExecuted(command)
    },
    recordExecuted,
    undo: () => {
      const command = undoStack[undoStack.length - 1]
      if (!command) return false
      executingDepth += 1
      try {
        store.runTransaction(() => {
          command.undo(store)
        })
      } finally {
        executingDepth = Math.max(0, executingDepth - 1)
      }
      undoStack.pop()
      redoStack.push(command)
      notifyHistoryChanged()
      return true
    },
    redo: () => {
      const command = redoStack[redoStack.length - 1]
      if (!command) return false
      executingDepth += 1
      try {
        store.runTransaction(() => {
          command.execute(store)
        })
      } finally {
        executingDepth = Math.max(0, executingDepth - 1)
      }
      redoStack.pop()
      undoStack.push(command)
      notifyHistoryChanged()
      return true
    },
    cancelLatest: (command) => {
      /**
       * 只能取消当前栈顶的原始命令，不能从历史中间删除命令；
       * 后者会破坏后续命令依赖的 Store 快照和正常撤销顺序。
       */
      if (undoStack[undoStack.length - 1] !== command) return false

      executingDepth += 1
      try {
        store.runTransaction(() => {
          command.undo(store)
        })
      } finally {
        executingDepth = Math.max(0, executingDepth - 1)
      }
      undoStack.pop()
      discardCommand(command)
      notifyHistoryChanged()
      return true
    },
    clear: () => {
      /**
       * 保存成功或重新加载场景后，当前 Store 快照已经成为新的编辑基线。
       * 这里只清空命令历史，不回滚 Store，避免用户在保存后还能撤销到保存前状态。
       */
      const hadHistory = undoStack.length > 0 || redoStack.length > 0
      discardStack(undoStack)
      discardStack(redoStack)
      if (hadHistory) notifyHistoryChanged()
    },
    subscribeHistory: (listener) => {
      historyListeners.add(listener)
      return () => {
        historyListeners.delete(listener)
      }
    },
    getIsExecuting: () => executingDepth > 0,
    getUndoSize: () => undoStack.length,
    getRedoSize: () => redoStack.length,
  }
}
