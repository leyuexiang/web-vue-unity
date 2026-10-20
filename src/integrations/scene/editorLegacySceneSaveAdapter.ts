import { PLATFORM_TYPE } from '@/config/constant'
import type { SceneDefinition } from '@/scene-platform'
import type { SceneAsyncConfig } from '@/types/threeScene'
import {
  detectEditorSceneConfigFormat,
  type EditorSceneConfigFormat,
} from './editorSceneConfigFormat'

type ProjectSceneListResponse = DimensionsApi.ListResultProjectEngineeringVO
type ProjectSceneWriteResponse = DimensionsApi.CommonResultBoolean

export interface EditorLegacySceneSaveApi {
  loadSceneRecord: (
    params: DimensionsApi.getSceneListOfProjectEngineeringParams,
  ) => Promise<ProjectSceneListResponse>
  saveSceneConfig: (
    body: DimensionsApi.ProjectEngineeringUpdateVO,
  ) => Promise<ProjectSceneWriteResponse>
  renameScene: (
    params: DimensionsApi.updateSceneNameOfProjectEngineeringParams,
  ) => Promise<ProjectSceneWriteResponse>
}

export interface EditorLegacySceneSaveOptions {
  platformType?: string
  api?: Partial<EditorLegacySceneSaveApi>
}

const SUCCESS_CODES = new Set([0, 200])

const defaultEditorLegacySceneSaveApi: EditorLegacySceneSaveApi = {
  /**
   * 接口保持懒加载，避免单测导入保存适配器时提前触发 request 拦截器和登录态读取。
   */
  loadSceneRecord: async (params) => {
    const { getSceneListOfProjectEngineering } = await import(
      '@/servers/generated/dimensions/api/projectEngineering'
    )
    /**
     * 旧场景配置接口仍属于管理端 `/admin-api`，必须保留全局登录令牌。
     * 三维资源令牌仅服务独立 `/api` 网关，传入这里会覆盖登录令牌并让格式识别失败。
     */
    return getSceneListOfProjectEngineering(params)
  },
  saveSceneConfig: async (body) => {
    const { updateWebSceneInfoOfProjectEngineering } = await import(
      '@/servers/generated/dimensions/api/projectEngineering'
    )
    // 旧格式保存走管理端登录鉴权，不能携带三维资源网关的 ClientId。
    return updateWebSceneInfoOfProjectEngineering(body)
  },
  renameScene: async (params) => {
    const { updateSceneNameOfProjectEngineering } = await import(
      '@/servers/generated/dimensions/api/projectEngineering'
    )
    // 名称同步与场景配置保存使用同一管理端登录上下文，避免半成功状态。
    return updateSceneNameOfProjectEngineering(params)
  },
}

const toBackendSceneId = (id: string) => {
  const sceneId = Number(id)
  if (!Number.isInteger(sceneId) || sceneId <= 0) {
    throw new Error(`旧场景保存兜底仅支持正整数场景 id：${id}`)
  }

  return sceneId
}

const assertProjectResponse = (response: { code?: number; msg?: string }, action: string) => {
  if (response.code === undefined || SUCCESS_CODES.has(response.code)) return

  throw new Error(`${action}失败：${response.msg || response.code}`)
}

const createLegacySceneSaveApi = (options: EditorLegacySceneSaveOptions = {}) => ({
  platformType: options.platformType ?? PLATFORM_TYPE,
  api: {
    ...defaultEditorLegacySceneSaveApi,
    ...options.api,
  },
})

export const loadExistingEditorSceneConfigFormat = async (
  sceneId: string,
  options: EditorLegacySceneSaveOptions = {},
): Promise<EditorSceneConfigFormat> => {
  const backendSceneId = toBackendSceneId(sceneId)
  const { api, platformType } = createLegacySceneSaveApi(options)

  const response = await api.loadSceneRecord({
    id: backendSceneId,
    platformType,
  })
  assertProjectResponse(response, '读取现有场景配置格式')

  const record = response.data?.[0]
  return detectEditorSceneConfigFormat(record?.sceneConfigInfo)
}

export const saveLegacyEditorSceneAsyncConfig = async (
  scene: Pick<SceneDefinition, 'id' | 'name'>,
  legacySceneConfig: SceneAsyncConfig,
  options: EditorLegacySceneSaveOptions = {},
) => {
  const sceneId = toBackendSceneId(scene.id)
  const { api, platformType } = createLegacySceneSaveApi(options)

  /**
   * 旧保存接口历史上接收的是 JSON 字符串。
   * 继续保持这个形态，避免后端字段解析差异影响旧 renderScene 的刷新恢复。
   */
  const configResponse = await api.saveSceneConfig({
    id: sceneId,
    platformType,
    sceneConfigInfo: JSON.stringify(legacySceneConfig),
  })
  assertProjectResponse(configResponse, '保存旧场景配置')

  const nameResponse = await api.renameScene({
    id: sceneId,
    platformType,
    name: scene.name,
  })
  assertProjectResponse(nameResponse, '同步旧场景名称')
}
