import type { CommandBus } from '@/scene-platform'

export interface EditorUndoRedoState {
  undoSteps: number
  redoSteps: number
  canUndo: boolean
  canRedo: boolean
}

interface EditorUndoRedoOptions {
  commandBus?: Pick<CommandBus, 'undo' | 'redo' | 'getUndoSize' | 'getRedoSize' | 'clear'> | null
}

/** 统一读取唯一命令总线的撤销/重做状态，不再维护或回退到第二套历史栈。 */
export const getEditorUndoRedoState = ({ commandBus }: EditorUndoRedoOptions): EditorUndoRedoState => {
  const undoSteps = commandBus?.getUndoSize() ?? 0
  const redoSteps = commandBus?.getRedoSize() ?? 0
  return { undoSteps, redoSteps, canUndo: undoSteps > 0, canRedo: redoSteps > 0 }
}

export const undoEditorHistory = ({ commandBus }: EditorUndoRedoOptions): boolean =>
  Boolean(commandBus?.undo())

export const redoEditorHistory = ({ commandBus }: EditorUndoRedoOptions): boolean =>
  Boolean(commandBus?.redo())

export const clearEditorHistory = ({ commandBus }: EditorUndoRedoOptions) => {
  const undoSteps = commandBus?.getUndoSize() ?? 0
  const redoSteps = commandBus?.getRedoSize() ?? 0
  if (undoSteps > 0 || redoSteps > 0) commandBus?.clear()
  return { cleared: undoSteps > 0 || redoSteps > 0 }
}
