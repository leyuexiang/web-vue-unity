export type EditorSceneConfigFormat =
  | 'empty'
  | 'scene-definition'
  | 'legacy-scene-async-config'
  | 'unknown'

type JsonRecord = Record<string, unknown>

const SCENE_DEFINITION_TYPES = new Set(['gis', 'local3d'])

const LEGACY_SCENE_ASYNC_KEYS = [
  'geometryConfig',
  'annotationConfig',
  'imageConfig',
  'modelConfig',
  'markingConfig',
  'pipeConfig',
  'datasetConfig',
  'publicRequestConfig',
  'requestGlobalConfig',
  'taskEventConfig',
  'transferMainList',
  'widgets',
  'widgetLayerTree',
]

export const isSceneConfigRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const parseSceneConfigRecord = (payload: unknown): JsonRecord | null => {
  if (!payload) return null

  if (typeof payload === 'string') {
    if (!payload.trim()) return null

    try {
      return parseSceneConfigRecord(JSON.parse(payload))
    } catch {
      return null
    }
  }

  return isSceneConfigRecord(payload) ? payload : null
}

const isSceneDefinitionLike = (payload: JsonRecord): boolean => {
  if (typeof payload.id !== 'string') return false
  if (typeof payload.name !== 'string') return false
  if (typeof payload.type !== 'string' || !SCENE_DEFINITION_TYPES.has(payload.type)) return false

  return isSceneConfigRecord(payload.coordinateSystem)
}

const isLegacySceneAsyncConfigLike = (payload: JsonRecord): boolean => {
  const sceneConfig = payload.sceneConfig
  if (!isSceneConfigRecord(sceneConfig)) return false

  /**
   * 旧 SceneAsyncConfig 的最小稳定特征是 sceneConfig + 至少一个旧数组/二维字段。
   * 只识别，不迁移；这样旧场景会继续交给 renderScene.init(id) 原链路恢复。
   */
  return LEGACY_SCENE_ASYNC_KEYS.some((key) => key in payload)
}

/**
 * 识别项目接口中的 sceneConfigInfo 版本。
 *
 * 编辑器过渡期同时存在两种 JSON：
 * - 新 SceneDefinition：由 scene-platform 仓库保存和恢复；
 * - 旧 SceneAsyncConfig：由旧 renderScene、二维部件和 GIS 配置继续恢复。
 *
 * 这里不做格式转换，只做轻量识别，避免把旧格式当成非法新格式反复报错。
 */
export const detectEditorSceneConfigFormat = (payload: unknown): EditorSceneConfigFormat => {
  const record = parseSceneConfigRecord(payload)
  if (!record) return 'empty'

  if (isSceneDefinitionLike(record)) return 'scene-definition'
  if (isLegacySceneAsyncConfigLike(record)) return 'legacy-scene-async-config'

  return 'unknown'
}
