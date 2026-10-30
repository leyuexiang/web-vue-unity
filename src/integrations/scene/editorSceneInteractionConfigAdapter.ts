import { cloneDeep, isEqual } from 'lodash-es'
import { createUpdateObjectExtensionsCommand, type CommandBus, type SceneStore } from '@/scene-platform'
import type { InteractionEvent } from '@/types/threeScene'

export const EDITOR_SCENE_OBJECT_INTERACTIVE_EVENT_METADATA_KEY = 'interactiveEvent'
export const EDITOR_SCENE_OBJECT_STATUS_LIST_METADATA_KEY = 'statusList'

type EditorSceneObjectEventMetadataKey =
  | typeof EDITOR_SCENE_OBJECT_INTERACTIVE_EVENT_METADATA_KEY
  | typeof EDITOR_SCENE_OBJECT_STATUS_LIST_METADATA_KEY

export type EditorSceneObjectEventConfigSkipReason =
  | 'missing-store'
  | 'missing-object-id'
  | 'missing-object'
  | 'unchanged-config'

export type SetEditorSceneObjectEventConfigResult =
  | {
      status: 'applied'
      objectId: string
      eventList: InteractionEvent[]
    }
  | {
      status: 'skipped'
      reason: EditorSceneObjectEventConfigSkipReason
    }

export interface GetEditorSceneObjectEventConfigOptions {
  store?: SceneStore | null
  objectId?: string | null
  legacyEventList?: InteractionEvent[] | null
}

export interface SetEditorSceneObjectEventConfigOptions {
  store?: SceneStore | null
  /** 编辑器面板传入命令总线后，配置可在当前会话撤销和重做。 */
  commandBus?: Pick<CommandBus, 'execute'> | null
  objectId?: string | null
  eventList: InteractionEvent[]
}

interface InternalGetEditorSceneObjectEventConfigOptions
  extends GetEditorSceneObjectEventConfigOptions {
  metadataKey: EditorSceneObjectEventMetadataKey
}

interface InternalSetEditorSceneObjectEventConfigOptions
  extends SetEditorSceneObjectEventConfigOptions {
  metadataKey: EditorSceneObjectEventMetadataKey
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const hasOwnMetadataKey = (
  metadata: Record<string, unknown> | null | undefined,
  key: EditorSceneObjectEventMetadataKey,
) => Boolean(metadata && Object.prototype.hasOwnProperty.call(metadata, key))

const isInteractionEventRecord = (value: unknown): value is Record<string, unknown> & { id: string } =>
  isRecord(value) && typeof value.id === 'string'

/**
 * 标准化状态/交互事件列表。
 *
 * 面板事件结构只应保存可序列化的规则、动作和目标 id；这里仅过滤掉缺少 id 的条目。
 * 对早期旧数据缺失 `isOpen` 的情况默认补为启用，避免升级时把可见事件静默隐藏。
 */
const normalizeEditorSceneObjectEventList = (
  eventList: InteractionEvent[] | null | undefined,
): InteractionEvent[] => {
  if (!Array.isArray(eventList)) return []

  return eventList.filter(isInteractionEventRecord).map((event) => {
    const normalized = cloneDeep(event) as InteractionEvent
    normalized.isOpen = typeof event.isOpen === 'boolean' ? event.isOpen : true
    return normalized
  })
}

const normalizeUnknownEventList = (value: unknown): InteractionEvent[] | null => {
  if (!Array.isArray(value)) return null
  return normalizeEditorSceneObjectEventList(value as InteractionEvent[])
}

/**
 * 从 `SceneObject.metadata` 读取统一事件配置。
 *
 * 返回 `null` 表示当前对象没有这类元数据，调用方可以继续回退到旧 `userData`；
 * 返回空数组表示用户已经清空配置，不能再被旧数据兜底重新带回来。
 */
const getEditorSceneObjectEventListFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  metadataKey: EditorSceneObjectEventMetadataKey,
) => {
  if (!hasOwnMetadataKey(metadata, metadataKey)) return null
  return normalizeUnknownEventList(metadata?.[metadataKey]) ?? null
}

/**
 * 判断对象是否已经显式迁移该类事件元数据。
 *
 * 空数组也是有效的新数据，必须与“字段不存在、允许回退旧 userData”严格区分，
 * 这样页面能避免每次渲染都无意义地调用旧场景接口。
 */
const hasEditorSceneObjectEventMetadata = (
  store: SceneStore | null | undefined,
  objectId: string | null | undefined,
  metadataKey: EditorSceneObjectEventMetadataKey,
): boolean => {
  if (!store || !objectId) return false
  return hasOwnMetadataKey(store.getObject(objectId)?.metadata, metadataKey)
}

/**
 * 读取三维对象的状态/交互配置。
 *
 * `SceneObject.metadata` 是新格式保存主副本；旧 `mesh.userData` 只作为尚未迁移对象的过渡兜底。
 */
const getEditorSceneObjectEventList = ({
  store,
  objectId,
  legacyEventList = [],
  metadataKey,
}: InternalGetEditorSceneObjectEventConfigOptions): InteractionEvent[] => {
  if (!objectId) return normalizeEditorSceneObjectEventList(legacyEventList)

  const sceneObject = store?.getObject(objectId) ?? null
  const metadataEventList = getEditorSceneObjectEventListFromMetadata(
    sceneObject?.metadata,
    metadataKey,
  )
  if (metadataEventList !== null) return metadataEventList

  return normalizeEditorSceneObjectEventList(legacyEventList)
}

/**
 * 将三维对象状态/交互配置写入可序列化元数据。
 *
 * 这里只更新 `SceneObject.metadata` 的事件字段，不保存 Mesh、Entity、函数或 DOM 引用；
 * 写入空数组时保留空数组，明确表达“已清空”，避免旧 `userData` 再次作为兜底显示。
 */
const setEditorSceneObjectEventList = ({
  store,
  commandBus,
  objectId,
  eventList,
  metadataKey,
}: InternalSetEditorSceneObjectEventConfigOptions): SetEditorSceneObjectEventConfigResult => {
  if (!store) return { status: 'skipped', reason: 'missing-store' }
  if (!objectId) return { status: 'skipped', reason: 'missing-object-id' }

  const sceneObject = store.getObject(objectId)
  if (!sceneObject) return { status: 'skipped', reason: 'missing-object' }

  const normalized = normalizeEditorSceneObjectEventList(eventList)
  const current = getEditorSceneObjectEventListFromMetadata(sceneObject.metadata, metadataKey)
  if (current !== null && isEqual(current, normalized)) {
    return { status: 'skipped', reason: 'unchanged-config' }
  }

  if (commandBus) {
    // 当前会话命令历史保存完整旧快照，撤销时恢复事件配置及对象其它元数据。
    commandBus.execute(createUpdateObjectExtensionsCommand(objectId, {
      metadata: { [metadataKey]: normalized },
    }))
  } else {
    store.upsertObject({
      ...sceneObject,
      metadata: {
        ...(sceneObject.metadata ?? {}),
        [metadataKey]: normalized,
      },
    })
  }

  return {
    status: 'applied',
    objectId,
    eventList: normalized,
  }
}

export const getEditorSceneObjectInteractiveEventList = (
  options: GetEditorSceneObjectEventConfigOptions,
) =>
  getEditorSceneObjectEventList({
    ...options,
    metadataKey: EDITOR_SCENE_OBJECT_INTERACTIVE_EVENT_METADATA_KEY,
  })

export const setEditorSceneObjectInteractiveEventList = (
  options: SetEditorSceneObjectEventConfigOptions,
) =>
  setEditorSceneObjectEventList({
    ...options,
    metadataKey: EDITOR_SCENE_OBJECT_INTERACTIVE_EVENT_METADATA_KEY,
  })

export const getEditorSceneObjectStatusList = (
  options: GetEditorSceneObjectEventConfigOptions,
) =>
  getEditorSceneObjectEventList({
    ...options,
    metadataKey: EDITOR_SCENE_OBJECT_STATUS_LIST_METADATA_KEY,
  })

export const setEditorSceneObjectStatusList = (
  options: SetEditorSceneObjectEventConfigOptions,
) =>
  setEditorSceneObjectEventList({
    ...options,
    metadataKey: EDITOR_SCENE_OBJECT_STATUS_LIST_METADATA_KEY,
  })

export const hasEditorSceneObjectInteractiveEventMetadata = (
  store: SceneStore | null | undefined,
  objectId: string | null | undefined,
) =>
  hasEditorSceneObjectEventMetadata(
    store,
    objectId,
    EDITOR_SCENE_OBJECT_INTERACTIVE_EVENT_METADATA_KEY,
  )

export const hasEditorSceneObjectStatusListMetadata = (
  store: SceneStore | null | undefined,
  objectId: string | null | undefined,
) =>
  hasEditorSceneObjectEventMetadata(
    store,
    objectId,
    EDITOR_SCENE_OBJECT_STATUS_LIST_METADATA_KEY,
  )
