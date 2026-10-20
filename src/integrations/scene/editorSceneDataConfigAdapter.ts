import { cloneDeep, isEqual } from 'lodash-es'
import { DATA_CONFIG_VERSION, type ComponentDataConfig } from '@/types/data-config'
import type { SceneStore } from '@/scene-platform'

export const EDITOR_SCENE_OBJECT_DATA_CONFIG_METADATA_KEY = 'dataConfig'

export type EditorSceneObjectDataConfigSkipReason =
  | 'missing-store'
  | 'missing-object-id'
  | 'missing-object'
  | 'unchanged-config'

export type SetEditorSceneObjectDataConfigResult =
  | {
      status: 'applied'
      objectId: string
      dataConfig: ComponentDataConfig | null
    }
  | {
      status: 'skipped'
      reason: EditorSceneObjectDataConfigSkipReason
    }

export interface GetEditorSceneObjectDataConfigOptions {
  store?: SceneStore | null
  objectId?: string | null
  legacyDataConfig?: ComponentDataConfig | null
}

export interface SetEditorSceneObjectDataConfigOptions {
  store?: SceneStore | null
  objectId?: string | null
  dataConfig: ComponentDataConfig | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isComponentDataConfigLike = (value: unknown): value is ComponentDataConfig =>
  isRecord(value) &&
  isRecord(value.request) &&
  isRecord(value.dataset) &&
  Array.isArray(value.bindings)

/**
 * 轻量标准化数据配置。
 *
 * 不能在该适配器里直接依赖 `utils/dataConfig` 聚合入口，因为它会继续加载请求层、
 * 图标部件和浏览器存储；F015 的 Store 适配层只需要保证 metadata 内保存的是稳定、
 * 可序列化的当前版本配置。更完整的请求字段补齐仍由右侧面板现有逻辑负责。
 */
const normalizeEditorSceneObjectDataConfig = (
  dataConfig: ComponentDataConfig | null | undefined,
) => {
  if (!dataConfig) return null

  const normalized = cloneDeep(dataConfig)
  normalized.version = DATA_CONFIG_VERSION
  normalized.dataset ||= { dimensions: [], source: [] }
  normalized.dataset.dimensions ||= []
  normalized.dataset.source ||= []
  normalized.bindings ||= []
  normalized.extractor ||= {}
  return normalized
}

const normalizeUnknownDataConfig = (value: unknown) =>
  isComponentDataConfigLike(value) ? normalizeEditorSceneObjectDataConfig(value) : null

/**
 * 从场景对象元数据中读取标准数据配置。
 *
 * `SceneObject.metadata` 是可扩展字典，历史数据或外部宿主可能写入任意值；
 * 因此读取前必须先做形状校验，再交给统一数据配置标准化入口，避免错误元数据拖垮面板。
 */
export const getEditorSceneObjectDataConfigFromMetadata = (
  metadata?: Record<string, unknown> | null,
) => normalizeUnknownDataConfig(metadata?.[EDITOR_SCENE_OBJECT_DATA_CONFIG_METADATA_KEY])

/**
 * 读取三维对象的数据面板配置。
 *
 * F015 的主读路径是 `SceneObject.metadata.dataConfig`，它会随新格式保存；
 * 旧 `mesh.userData.dataConfig` 只作为过渡兜底，保证尚未完全镜像到 SceneStore 的存量对象仍可编辑。
 */
export const getEditorSceneObjectDataConfig = ({
  store,
  objectId,
  legacyDataConfig = null,
}: GetEditorSceneObjectDataConfigOptions): ComponentDataConfig | null => {
  if (!objectId) return normalizeEditorSceneObjectDataConfig(legacyDataConfig)

  const sceneObject = store?.getObject(objectId) ?? null
  const metadataConfig = getEditorSceneObjectDataConfigFromMetadata(sceneObject?.metadata)
  if (metadataConfig) return metadataConfig

  return normalizeEditorSceneObjectDataConfig(legacyDataConfig)
}

/**
 * 将三维对象的数据面板配置写入 `SceneObject.metadata`。
 *
 * 这里不新增平台核心字段，也不把旧 Three 对象塞入 Store；只更新可序列化的数据配置快照。
 * 写入前做标准化和等值判断，避免右侧面板的防抖保存反复触发无意义 Store 事件。
 */
export const setEditorSceneObjectDataConfig = ({
  store,
  objectId,
  dataConfig,
}: SetEditorSceneObjectDataConfigOptions): SetEditorSceneObjectDataConfigResult => {
  if (!store) return { status: 'skipped', reason: 'missing-store' }
  if (!objectId) return { status: 'skipped', reason: 'missing-object-id' }

  const sceneObject = store.getObject(objectId)
  if (!sceneObject) return { status: 'skipped', reason: 'missing-object' }

  const normalized = normalizeEditorSceneObjectDataConfig(dataConfig)
  const current = getEditorSceneObjectDataConfigFromMetadata(sceneObject.metadata)
  if (isEqual(current, normalized)) {
    return { status: 'skipped', reason: 'unchanged-config' }
  }

  const nextMetadata = {
    ...(sceneObject.metadata ?? {}),
  }

  if (normalized) {
    nextMetadata[EDITOR_SCENE_OBJECT_DATA_CONFIG_METADATA_KEY] = normalized
  } else {
    delete nextMetadata[EDITOR_SCENE_OBJECT_DATA_CONFIG_METADATA_KEY]
  }

  store.upsertObject({
    ...sceneObject,
    metadata: nextMetadata,
  })

  return {
    status: 'applied',
    objectId,
    dataConfig: normalized,
  }
}
