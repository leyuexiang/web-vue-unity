import type { RuntimeBridge, SceneStore, SceneStoreEvent } from '@/scene-platform'

type SceneSelectionStorePort = Pick<
  SceneStore,
  'getSelectedObjectId' | 'setSelectedObjectId'
>

type SceneObjectSelectionStorePort = Pick<
  SceneStore,
  'getObject' | 'setSelectedObjectId'
>

type SceneSelectionSubscriptionStorePort = Pick<
  SceneStore,
  'getSelectedObjectId' | 'subscribe'
>

type LegacySelectionGetter = () => string | null | undefined
type LegacySelectionSetter = (objectId: string | null) => void

export interface ClearEditorSceneSelectionOptions {
  store?: SceneSelectionStorePort | null
  bridge?: Pick<RuntimeBridge, 'flush'> | null
  getLegacySelectedObjectId?: LegacySelectionGetter
  setLegacySelectedObjectId?: LegacySelectionSetter
  clearLegacySceneObjectSelection?: () => void
  clearWidgetSelection?: () => void
}

export interface ClearEditorSceneSelectionResult {
  previousObjectId: string | null
  nextObjectId: null
}

export interface BindEditorSceneSelectionOptions {
  getLegacySelectedObjectId: LegacySelectionGetter
  setLegacySelectedObjectId: LegacySelectionSetter
  clearWidgetSelectionWhenObjectSelected?: () => void
  selectLegacySceneObjectWhenSelected?: (objectId: string) => boolean
  clearLegacySceneObjectSelection?: () => void
  notifyLegacySelectionChanged?: () => void
}

export interface SelectEditorSceneObjectOptions {
  store?: SceneObjectSelectionStorePort | null
  bridge?: Pick<RuntimeBridge, 'flush'> | null
  objectId?: string | null
  selectLegacySceneObject?: (objectId: string) => boolean
  setLegacySelectedObjectId?: LegacySelectionSetter
  clearWidgetSelection?: () => void
}

export type SelectEditorSceneObjectResult =
  | {
      status: 'applied'
      objectId: string
      selectedByLegacy: boolean
      selectedByStore: boolean
    }
  | {
      status: 'skipped'
      reason: 'missing-object-id' | 'missing-object'
    }

const normalizeSelectionId = (objectId: string | null | undefined) => objectId || null

/**
 * 空白清选统一以 SceneStore 为选中态真源。
 *
 * 旧 renderScene 清理仍保留在这里作为即时视觉兜底：它负责马上卸掉变换器和高亮；
 * SceneStore 写入负责让对象树、属性面板和 RuntimeBridge 消费同一份领域选中态。
 */
export const clearEditorSceneSelection = async ({
  store,
  bridge,
  getLegacySelectedObjectId,
  setLegacySelectedObjectId,
  clearLegacySceneObjectSelection,
  clearWidgetSelection,
}: ClearEditorSceneSelectionOptions): Promise<ClearEditorSceneSelectionResult> => {
  const previousObjectId =
    normalizeSelectionId(store?.getSelectedObjectId()) ||
    normalizeSelectionId(getLegacySelectedObjectId?.())

  clearWidgetSelection?.()
  clearLegacySceneObjectSelection?.()
  setLegacySelectedObjectId?.(null)
  store?.setSelectedObjectId(null)
  await bridge?.flush()

  return {
    previousObjectId,
    nextObjectId: null,
  }
}

/**
 * 选中结构树中的三维对象。
 *
 * 过渡期需要同时兼容两类对象：
 * - 旧 Three 对象：优先调用旧选择函数，保留变换器和高亮；
 * - GIS / 平台对象：旧 Three 场景里没有网格，直接写 SceneStore 选中态并冲刷 RuntimeBridge。
 */
export const selectEditorSceneObject = async ({
  store,
  bridge,
  objectId,
  selectLegacySceneObject,
  setLegacySelectedObjectId,
  clearWidgetSelection,
}: SelectEditorSceneObjectOptions): Promise<SelectEditorSceneObjectResult> => {
  const nextObjectId = normalizeSelectionId(objectId)
  if (!nextObjectId) return { status: 'skipped', reason: 'missing-object-id' }

  const selectedByLegacy = selectLegacySceneObject?.(nextObjectId) ?? false
  const selectedByStore = Boolean(store?.getObject(nextObjectId))
  if (!selectedByLegacy && !selectedByStore) {
    return { status: 'skipped', reason: 'missing-object' }
  }

  if (!selectedByLegacy) {
    clearWidgetSelection?.()
  }

  setLegacySelectedObjectId?.(nextObjectId)
  if (selectedByStore) {
    store?.setSelectedObjectId(nextObjectId)
    await bridge?.flush()
  }

  return {
    status: 'applied',
    objectId: nextObjectId,
    selectedByLegacy,
    selectedByStore,
  }
}

/**
 * 把 SceneStore 选中事件反写到旧编辑态。
 *
 * 过渡期对象树和属性面板仍读取 currentTransformMaterialUuid；
 * 这里只同步选中 id，不访问 Three 对象，避免把平台 Store 重新绑回旧渲染核心。
 */
export const bindEditorSceneSelectionToLegacyState = (
  store: SceneSelectionSubscriptionStorePort,
  {
    getLegacySelectedObjectId,
    setLegacySelectedObjectId,
    clearWidgetSelectionWhenObjectSelected,
    selectLegacySceneObjectWhenSelected,
    clearLegacySceneObjectSelection,
    notifyLegacySelectionChanged,
  }: BindEditorSceneSelectionOptions,
) => {
  const syncSelectionToLegacyState = (objectId: string | null | undefined) => {
    const nextObjectId = normalizeSelectionId(objectId)
    const currentLegacyObjectId = normalizeSelectionId(getLegacySelectedObjectId())

    if (nextObjectId) {
      clearWidgetSelectionWhenObjectSelected?.()
      selectLegacySceneObjectWhenSelected?.(nextObjectId)
    } else {
      clearLegacySceneObjectSelection?.()
    }

    if (currentLegacyObjectId !== nextObjectId) {
      setLegacySelectedObjectId(nextObjectId)
    }
    notifyLegacySelectionChanged?.()
  }

  syncSelectionToLegacyState(store.getSelectedObjectId())

  return store.subscribe((event: SceneStoreEvent) => {
    if (event.type !== 'selectionChanged') return
    syncSelectionToLegacyState(event.objectId)
  })
}
