import type { SceneDefinition, SceneSettings, SceneType } from '@/scene-platform'

export const EDITOR_SCENE_PUBLISH_SETTINGS_KEY = 'publish'
export const EDITOR_SCENE_VERSION_SETTINGS_KEY = 'version'
export const EDITOR_SCENE_RUNTIME_SETTINGS_KEY = 'runtime'

export type EditorSceneRuntimeEngine = 'cesium' | 'three'

export interface EditorScenePublishSettings extends Record<string, unknown> {
  status: string
  currentVersion: string | null
  publishedAt: string | null
}

export interface EditorSceneVersionSettings extends Record<string, unknown> {
  draftVersion: number
  publishedVersion: string | null
  packageVersion: string
  sceneSchemaVersion: number
}

export interface EditorSceneRuntimeSettings extends Record<string, unknown> {
  sceneType: SceneType
  runtimeType: SceneType
  runtimeEngine: EditorSceneRuntimeEngine
  entry: string
  readonly: boolean
  mode: string
}

type PlainRecord = Record<string, unknown>

const isPlainRecord = (value: unknown): value is PlainRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const toNullableString = (value: unknown): string | null =>
  isNonEmptyString(value) ? value : null

const toStringOrDefault = (value: unknown, fallback: string): string =>
  isNonEmptyString(value) ? value : fallback

const toPositiveInteger = (value: unknown, fallback: number): number =>
  Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback

const toBooleanOrDefault = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const getSettingsRecord = (settings: SceneSettings, key: string): PlainRecord => {
  const value = settings[key]
  return isPlainRecord(value) ? value : {}
}

const resolveRuntimeEngine = (sceneType: SceneType): EditorSceneRuntimeEngine =>
  sceneType === 'gis' ? 'cesium' : 'three'

const createPublishSettings = (settings: SceneSettings): EditorScenePublishSettings => {
  const previousPublishSettings = getSettingsRecord(settings, EDITOR_SCENE_PUBLISH_SETTINGS_KEY)

  return {
    /**
     * G010 只预留发布元数据，不在保存动作里生成真实发布记录。
     * 额外字段先透传，方便后续宿主后台接入审核人、发布渠道或环境标识。
     */
    ...previousPublishSettings,
    status: toStringOrDefault(previousPublishSettings.status, 'draft'),
    currentVersion: toNullableString(previousPublishSettings.currentVersion),
    publishedAt: toNullableString(previousPublishSettings.publishedAt),
  }
}

const createVersionSettings = (scene: SceneDefinition): EditorSceneVersionSettings => {
  const previousVersionSettings = getSettingsRecord(scene.settings, EDITOR_SCENE_VERSION_SETTINGS_KEY)

  return {
    /**
     * 版本字段保持纯数据形态。
     * sceneSchemaVersion 始终跟随当前 SceneDefinition，避免旧快照里的错误版本影响后续迁移判断。
     */
    ...previousVersionSettings,
    draftVersion: toPositiveInteger(previousVersionSettings.draftVersion, 1),
    publishedVersion: toNullableString(previousVersionSettings.publishedVersion),
    packageVersion: toStringOrDefault(previousVersionSettings.packageVersion, 'draft'),
    sceneSchemaVersion: scene.schemaVersion,
  }
}

const createRuntimeSettings = (scene: SceneDefinition): EditorSceneRuntimeSettings => {
  const previousRuntimeSettings = getSettingsRecord(scene.settings, EDITOR_SCENE_RUNTIME_SETTINGS_KEY)

  return {
    /**
     * 运行态配置只记录发布预览所需的可序列化描述，不保存 Three / Cesium 实例。
     * sceneType、runtimeType 和 runtimeEngine 从当前场景类型派生，避免已有宿主字段过期后误导预览分流。
     */
    ...previousRuntimeSettings,
    entry: toStringOrDefault(previousRuntimeSettings.entry, 'scenePreview'),
    sceneType: scene.type,
    runtimeType: scene.type,
    runtimeEngine: resolveRuntimeEngine(scene.type),
    readonly: toBooleanOrDefault(previousRuntimeSettings.readonly, true),
    mode: toStringOrDefault(previousRuntimeSettings.mode, 'preview'),
  }
}

/**
 * 保存新格式前预留发布、版本和运行态配置字段。
 *
 * 该适配器只做浅层、确定性的字段合并：
 * - 不生成发布时间，避免每次保存都制造无意义差异；
 * - 不深拷贝大对象列表，避免保存路径额外遍历场景对象；
 * - 不修改平台核心类型，字段暂挂在 settings 中等待正式发布模块接管。
 */
export const mergeEditorScenePublishSettings = (
  scene: SceneDefinition,
): SceneDefinition => ({
  ...scene,
  settings: {
    ...scene.settings,
    [EDITOR_SCENE_PUBLISH_SETTINGS_KEY]: createPublishSettings(scene.settings),
    [EDITOR_SCENE_VERSION_SETTINGS_KEY]: createVersionSettings(scene),
    [EDITOR_SCENE_RUNTIME_SETTINGS_KEY]: createRuntimeSettings(scene),
  },
})
