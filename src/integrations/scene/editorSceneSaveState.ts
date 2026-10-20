import type { SceneStore, SceneStoreEvent } from '@/scene-platform'

export interface EditorSceneSaveStateSnapshot {
  revision: number
  savedRevision: number
  dirty: boolean
  saving: boolean
  lastErrorMessage: string | null
}

export interface EditorSceneSaveStateTracker {
  bindStore: (store: Pick<SceneStore, 'subscribe'> | null) => void
  beginSave: () => EditorSceneSaveStateSnapshot
  markSaved: () => EditorSceneSaveStateSnapshot
  /** 整场景导入在宿主刷新完成后显式标为未保存，不能把替换事件当成服务器干净基线。 */
  markDirty: () => EditorSceneSaveStateSnapshot
  markFailed: (error: unknown) => EditorSceneSaveStateSnapshot
  getSnapshot: () => EditorSceneSaveStateSnapshot
  dispose: () => void
}

type EditorSceneSaveStateListener = (snapshot: EditorSceneSaveStateSnapshot) => void

const DATA_CHANGE_EVENTS = new Set<SceneStoreEvent['type']>(['objectUpserted', 'objectRemoved'])

const FALLBACK_SAVE_ERROR_MESSAGE = '场景保存失败'

const toErrorReason = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  if (typeof error === 'string' && error.trim()) return error.trim()
  return FALLBACK_SAVE_ERROR_MESSAGE
}

/**
 * 生成保存失败提示。
 *
 * 提示必须明确两件事：
 * - 保存请求失败，没有把当前改动标记为已保存；
 * - 用户仍可修复接口、网络或数据问题后再次保存。
 */
export const buildEditorSceneSaveFailureMessage = (error: unknown) => {
  return `${toErrorReason(error)}；当前改动已保留，请修复问题后重试`
}

/**
 * 创建编辑器保存状态跟踪器。
 *
 * 该跟踪器只服务 sceneEdit 保存按钮：
 * - 订阅 SceneStore 领域变更，计算页面级脏状态；
 * - 保存成功才推进 savedRevision；
 * - 保存失败只记录失败原因，不回滚 Store，也不清空脏状态。
 *
 * 这里放在 integrations/scene，而不是 SceneStore 核心层，是为了避免把当前产品的保存提示、
 * 后端错误文案和按钮状态写入可迁移的平台内核。
 */
export const createEditorSceneSaveStateTracker = (
  listener?: EditorSceneSaveStateListener,
): EditorSceneSaveStateTracker => {
  let revision = 0
  let savedRevision = 0
  let saving = false
  let saveStartedRevision: number | null = null
  let lastErrorMessage: string | null = null
  let unsubscribeStore: (() => void) | null = null

  const getSnapshot = (): EditorSceneSaveStateSnapshot => ({
    revision,
    savedRevision,
    dirty: revision !== savedRevision,
    saving,
    lastErrorMessage,
  })

  const emit = () => {
    listener?.(getSnapshot())
    return getSnapshot()
  }

  const resetCleanState = () => {
    revision = 0
    savedRevision = 0
    saving = false
    saveStartedRevision = null
    lastErrorMessage = null
  }

  const handleStoreEvent = (event: SceneStoreEvent) => {
    if (event.type === 'sceneLoaded') {
      /**
       * 切换或重新加载场景后，以新 Store 快照作为干净基线。
       * 这避免打开已有场景后仅因初始化事件就提示“有未保存改动”。
       */
      resetCleanState()
      emit()
      return
    }

    if (!DATA_CHANGE_EVENTS.has(event.type)) return

    revision += 1
    lastErrorMessage = null
    emit()
  }

  return {
    bindStore: (store) => {
      unsubscribeStore?.()
      unsubscribeStore = null
      resetCleanState()

      if (store) {
        unsubscribeStore = store.subscribe(handleStoreEvent)
      }

      emit()
    },
    beginSave: () => {
      saving = true
      saveStartedRevision = revision
      lastErrorMessage = null
      return emit()
    },
    markSaved: () => {
      /**
       * 保存开始后用户可能继续编辑。
       * 成功时只把“发起保存那一刻”的修订号标记为已保存，
       * 这样保存中的新增编辑仍保持 dirty，不会被误清。
       */
      savedRevision = saveStartedRevision ?? revision
      saving = false
      saveStartedRevision = null
      lastErrorMessage = null
      return emit()
    },
    markDirty: () => {
      revision += 1
      lastErrorMessage = null
      return emit()
    },
    markFailed: (error) => {
      saving = false
      saveStartedRevision = null
      lastErrorMessage = buildEditorSceneSaveFailureMessage(error)
      return emit()
    },
    getSnapshot,
    dispose: () => {
      unsubscribeStore?.()
      unsubscribeStore = null
      resetCleanState()
      emit()
    },
  }
}
