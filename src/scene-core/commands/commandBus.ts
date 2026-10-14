import type { SceneStore } from '@/scene-core/store/sceneStore'
import type { SceneCommand } from './types'

export interface CommandBus {
  execute(command: SceneCommand): void
  undo(): boolean
  redo(): boolean
  clear(): void
  getUndoSize(): number
  getRedoSize(): number
  subscribe(listener: () => void): () => void
}

export function createCommandBus(store: SceneStore, maxHistory = 220): CommandBus {
  const undoStack: SceneCommand[] = []
  const redoStack: SceneCommand[] = []
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())

  return {
    execute(command) {
      command.execute(store)
      const previous = undoStack[undoStack.length - 1]
      if (!previous?.mergeWith?.(command)) {
        undoStack.push(command)
        if (undoStack.length > maxHistory) undoStack.shift()
      }
      redoStack.length = 0
      notify()
    },
    undo() {
      const command = undoStack.pop()
      if (!command) return false
      command.undo(store)
      redoStack.push(command)
      notify()
      return true
    },
    redo() {
      const command = redoStack.pop()
      if (!command) return false
      command.execute(store)
      undoStack.push(command)
      notify()
      return true
    },
    clear() {
      undoStack.length = 0
      redoStack.length = 0
      notify()
    },
    getUndoSize: () => undoStack.length,
    getRedoSize: () => redoStack.length,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
