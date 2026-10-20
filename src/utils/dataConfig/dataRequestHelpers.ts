import {
  useSceneDataStore,
  useSceneRequestStore,
} from '@/stores/sceneEditStore'
import type { Dataset } from '@/types/threeScene'
import {
  createEmptyRequestGlobalConfig,
  type AjaxRequestConfig,
  type DatasetRequestConfig,
  type PublicRequestConfig,
  type PublicRequestReferenceConfig,
  type RequestGlobalConfig,
} from '@/types/data-config'

/**
 * 读取当前场景的数据源列表。
 *
 * 数据配置工具层大量依赖该列表做绑定推导。
 * 单独收口后，后续如果要把 Store 访问改成注入式上下文，只需要改这一层。
 */
export const getDatasets = () => useSceneDataStore().sceneDataset || []

/**
 * 读取当前场景的公共请求列表。
 *
 * 公共请求是多个组件共享的请求模板。
 * 这里统一做空数组兜底，避免调用方重复写空值判断。
 */
export const getPublicRequests = () => useSceneRequestStore().scenePublicRequestList || []

/**
 * 读取当前场景的全局请求配置。
 *
 * 若场景尚未配置全局请求参数，则回退到一份空配置，
 * 保证后续合并逻辑始终能按同一结构工作。
 */
export const getRequestGlobalConfig = () =>
  useSceneRequestStore().sceneRequestGlobalConfig || createEmptyRequestGlobalConfig()

/**
 * 把全局请求配置和局部请求配置合并成真正执行时使用的最终配置。
 *
 * 合并规则：
 * 1. 前置 URL：局部优先，局部为空时回退到全局。
 * 2. 轮询间隔：局部 `null/undefined` 时回退到全局；局部显式填 0 仍视为“只初始化”。
 * 3. Header：全局先注入，局部同名字段可覆盖全局。
 */
export const mergeAjaxRequestWithGlobalConfig = (
  config: AjaxRequestConfig,
  globalConfig: RequestGlobalConfig = getRequestGlobalConfig(),
): AjaxRequestConfig => {
  const globalHeaders = globalConfig.requestParams?.Header || {}
  const localHeaders = config.requestParams?.Header || {}
  const shouldInheritGlobalInterval =
    config.requestInterval === null || config.requestInterval === undefined

  return {
    ...config,
    requestOriginUrl: config.requestOriginUrl || globalConfig.requestOriginUrl || '',
    requestInterval: config.requestInterval ?? globalConfig.requestInterval ?? 0,
    requestIntervalUnit: shouldInheritGlobalInterval
      ? globalConfig.requestIntervalUnit || 'second'
      : config.requestIntervalUnit || globalConfig.requestIntervalUnit || 'second',
    requestHeaders: {
      ...(globalHeaders || {}),
      ...(config.requestHeaders || {}),
    },
    requestParams: {
      ...config.requestParams,
      Header: {
        ...globalHeaders,
        ...localHeaders,
      },
    },
  }
}

/**
 * 根据请求配置里的数据集标识反查真实数据集。
 *
 * 兼容两种入口：
 * 1. 直接按 `datasetName` 精确匹配；
 * 2. 通过 `dataSourceId` 在数据源列表里反查归属数据集。
 */
export const findDatasetByConfig = (datasets: Dataset[], config?: DatasetRequestConfig) => {
  if (!config) return null
  const datasetProperty = config.datasetProperty
  if (!datasetProperty) return null

  if (datasetProperty.datasetName) {
    const byName = datasets.find((item) => item.name === datasetProperty.datasetName)
    if (byName) return byName
  }

  if (datasetProperty.dataSourceId) {
    return (
      datasets.find((item) =>
        item.dataSourceList.some((dataSource) => dataSource.dataSourceId === datasetProperty.dataSourceId),
      ) || null
    )
  }

  return null
}

/**
 * 按公共请求标识反查公共请求配置。
 *
 * 返回 `null` 而不是抛错，原因是很多场景只是做“是否存在”的能力判定，
 * 由上层决定是继续回退还是给出提示。
 */
export const findPublicRequestByConfig = (
  publicRequests: PublicRequestConfig[],
  config?: PublicRequestReferenceConfig,
) => {
  if (!config?.publicRequestId) return null
  return publicRequests.find((item) => item.id === config.publicRequestId) || null
}
