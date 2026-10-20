import type * as THREE from '@/types/legacyObjectPort'
import type { Dataset } from '@/types/threeScene'
import {
  createEmptyRequestGlobalConfig,
  executeComponentDataRequest,
  mergeAjaxRequestWithGlobalConfig,
  normalizeDataConfig,
  upgradeLegacyDataPanelConfigList,
  type AjaxRequestConfig,
  type ComponentDataConfig,
  type PublicRequestConfig,
  type RequestGlobalConfig,
  type RequestIntervalUnit,
  getDataConfigRequests,
  type DataRequestRuntimeContext,
} from '@/utils/dataConfig'

export type PreviewRemoteTarget = THREE.Object3D

export type PreviewRemoteEntry = {
  kind: 'object'
  target: PreviewRemoteTarget
  intervalSeconds: number | null
  intervalUnit: RequestIntervalUnit | null
  requestType: 'ajax' | 'public'
  publicRequestId?: string | null
  requestId: string
}

export type PreviewRemoteExecutionResult = {
  kind: 'object'
  target: PreviewRemoteTarget
  dataConfig: ComponentDataConfig
  dimensions: string[]
  source: Record<string, unknown>[]
  requestId: string
}

/**
 * 为预览态统一解析三维对象对应的数据配置。
 *
 * 这里兼容两类来源：
 * - 新版 `dataConfig`
 * - 旧版 `datasetConfigList`
 *
 * 二维部件数据配置已迁入 WidgetDataRuntimeService，避免本工具继续认识二维部件结构。
 */
export const resolvePreviewTargetDataConfig = (
  target: PreviewRemoteTarget,
  sceneDataset: Dataset[],
): ComponentDataConfig | null => {
  return (
    normalizeDataConfig(target.userData?.dataConfig) ||
    upgradeLegacyDataPanelConfigList(
      target.userData?.datasetConfigList,
      target.userData?.type,
      sceneDataset,
    )
  )
}

/**
 * 读取预览远程条目对应的单请求视图。
 *
 * 远程结果必须按稳定 `requestId` 合并回完整配置；如果直接使用根配置，
 * 根字段只是请求1兼容镜像，后续请求的结果就会被错误地当成请求1处理。
 */
export const resolvePreviewRequestDataConfig = (
  target: PreviewRemoteTarget,
  sceneDataset: Dataset[],
  requestId: string,
): ComponentDataConfig | null => {
  const dataConfig = resolvePreviewTargetDataConfig(target, sceneDataset)
  if (!dataConfig) return null
  const item = getDataConfigRequests(dataConfig).find((request) => request.id === requestId)
  if (!item) return null
  return {
    ...dataConfig,
    request: item.request,
    extractor: item.extractor,
    dataset: item.dataset,
    bindings: item.bindings,
    filterFn: item.filterFn,
    requests: [item],
  }
}

/**
 * 统一把远程请求配置解析成标准轮询间隔。
 *
 * 这样 `ajax` 与 `public` 两种来源都能复用同一调度口径，
 * 调用方无需再分支读取全局请求配置。
 */
export const resolvePreviewRemoteInterval = (
  dataConfig: ComponentDataConfig,
  publicRequests: PublicRequestConfig[],
  globalConfig: RequestGlobalConfig = createEmptyRequestGlobalConfig(),
  runtimeContext?: DataRequestRuntimeContext,
): { seconds: number | null; unit: RequestIntervalUnit | null } => {
  if (dataConfig.request.type === 'ajax') {
    const cfg = mergeAjaxRequestWithGlobalConfig(
      dataConfig.request.config as AjaxRequestConfig,
      globalConfig,
    )
    return {
      seconds: cfg.requestInterval ?? null,
      unit: cfg.requestIntervalUnit || 'second',
    }
  }

  const publicRequestId = (dataConfig.request.config as { publicRequestId?: string | null }).publicRequestId
  const publicRequest = publicRequests.find((item) => item.id === publicRequestId)
  const mergedPublicRequest = publicRequest
    ? mergeAjaxRequestWithGlobalConfig(publicRequest, globalConfig)
    : null

  return {
    seconds: mergedPublicRequest?.requestInterval ?? null,
    unit: mergedPublicRequest?.requestIntervalUnit || 'second',
  }
}

/**
 * 收集预览态所有需要远程轮询的三维对象。
 *
 * 返回值已经附带标准化的轮询间隔、请求类型和公共请求标识，
 * 后续调度层只需要关心“何时执行”和“执行后如何分发”。
 *
 * 二维部件远程条目由 WidgetDataRuntimeService 单独收集，避免两条链路混合解析目标。
 */
export const collectPreviewRemoteEntries = (
  sceneDatasetMeshMap: Map<string, THREE.Object3D>,
  sceneDataset: Dataset[],
  publicRequests: PublicRequestConfig[],
  globalConfig: RequestGlobalConfig = createEmptyRequestGlobalConfig(),
): PreviewRemoteEntry[] => {
  const entries: PreviewRemoteEntry[] = []

  for (const [, child] of sceneDatasetMeshMap) {
    const dataConfig = resolvePreviewTargetDataConfig(child, sceneDataset)
    if (!dataConfig) continue
    getDataConfigRequests(dataConfig).forEach((item) => {
      if (!['ajax', 'public'].includes(item.request.type)) return
      const itemConfig = {
        ...dataConfig,
        request: item.request,
        extractor: item.extractor,
        dataset: item.dataset,
        bindings: item.bindings,
        filterFn: item.filterFn,
        requests: [item],
      }
      const { seconds, unit } = resolvePreviewRemoteInterval(itemConfig, publicRequests, globalConfig)
      const publicRequestId =
        item.request.type === 'public'
          ? (item.request.config as { publicRequestId?: string | null }).publicRequestId
          : null
      entries.push({
        kind: 'object',
        target: child,
        intervalSeconds: seconds,
        intervalUnit: unit,
        requestType: item.request.type as 'ajax' | 'public',
        publicRequestId,
        requestId: item.id,
      })
    })
  }

  return entries
}

/**
 * 将远程回调数据稳定归一化成二维表。
 *
 * 数据池回调和手动请求执行最终都要回到统一的数据行结构，
 * 这样对象绑定和 widget 绑定可以复用同一条消费链路。
 */
export const normalizePreviewRemoteRows = (data: unknown) => {
  const source = Array.isArray(data)
    ? data.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : []

  return {
    source,
    dimensions: source[0] ? Object.keys(source[0]) : [],
  }
}

/**
 * 执行单个预览态远程请求条目，并返回标准化结果。
 *
 * 这里不直接操作场景对象或 widget，只负责：
 * - 解析目标 dataConfig
 * - 执行请求
 * - 收敛成统一的二维表结果
 */
export const executePreviewRemoteEntry = async (
  entry: PreviewRemoteEntry,
  sceneDataset: Dataset[],
  publicRequests: PublicRequestConfig[],
  globalConfig: RequestGlobalConfig = createEmptyRequestGlobalConfig(),
  runtimeContext?: DataRequestRuntimeContext,
): Promise<PreviewRemoteExecutionResult | null> => {
  const dataConfig = resolvePreviewTargetDataConfig(entry.target, sceneDataset)
  if (!dataConfig) return null
  const item = getDataConfigRequests(dataConfig).find((request) => request.id === entry.requestId)
  const itemConfig = item
    ? {
        ...dataConfig,
        request: item.request,
        extractor: item.extractor,
        dataset: item.dataset,
        bindings: item.bindings,
        filterFn: item.filterFn,
        requests: [item],
      }
    : dataConfig
  const result = await executeComponentDataRequest(itemConfig, publicRequests, globalConfig, runtimeContext)
  return {
    kind: entry.kind,
    target: entry.target,
    dataConfig: itemConfig,
    dimensions: result.dimensions,
    source: result.source,
    requestId: entry.requestId,
  }
}
