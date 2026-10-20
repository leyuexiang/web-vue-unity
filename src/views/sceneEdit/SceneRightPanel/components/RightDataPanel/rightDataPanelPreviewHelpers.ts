import type {
  ComponentDataConfig,
  DatasetRequestConfig,
  PublicRequestConfig,
  RequestGlobalConfig,
} from '@/types/data-config'
import type { DataRequestRuntimeContext } from '@/utils/dataConfig'
import {
  createEmptyRequestGlobalConfig,
  executeComponentDataRequest,
  transformRequestPayloadToRows,
} from '@/utils/dataConfig'
import { fetchDataSourceDetail } from '@/servers/manual/dataMiddleware/api/dataSource'
import { tokenCache } from '@/utils/utils'

export interface RightDataPanelDatasetFieldResult {
  fields: string[]
  loadedKey: string
}

/**
 * 拉取当前数据集配置对应的数据源字段列表。
 *
 * 右侧面板后续只消费“字段名数组 + 命中缓存键”，
 * 网络鉴权和接口返回结构兼容都集中在这里处理。
 */
export async function loadRightDataPanelDatasetFields(
  requestConfig: DatasetRequestConfig,
): Promise<RightDataPanelDatasetFieldResult> {
  const datasetProperty = requestConfig.datasetProperty
  if (!datasetProperty?.dataSourceId || !datasetProperty.tableName) {
    return {
      fields: [],
      loadedKey: '',
    }
  }

  const loadedKey = [
    datasetProperty.datasetName || '',
    datasetProperty.dataSourceId,
    datasetProperty.tableName,
  ].join('::')

  const result = await fetchDataSourceDetail(
    { datasourceId: datasetProperty.dataSourceId, tableName: datasetProperty.tableName },
    { headers: { authorization: await tokenCache() } },
  )

  const fields = (result?.data?.columns || [])
    .map((item: Record<string, unknown>) => String(item.fieldname || ''))
    .filter(Boolean)

  return {
    fields,
    loadedKey,
  }
}

export interface RightDataPanelTestRequestResult {
  raw: unknown
  dimensions: string[]
  source: Record<string, unknown>[]
  markingDataError: string
}

/**
 * 执行右侧面板“发送请求”动作，并统一收口打点数据合法性判断。
 *
 * 组件层只关心结果如何回写和提示，不再重复拼装公共请求上下文。
 */
export async function executeRightDataPanelTestRequest(
  dataConfig: ComponentDataConfig,
  publicRequests: PublicRequestConfig[],
  globalConfig: RequestGlobalConfig | null | undefined,
  isMarkingSelection: boolean,
  runtimeContext?: DataRequestRuntimeContext,
): Promise<RightDataPanelTestRequestResult> {
  const result = await executeComponentDataRequest(
    dataConfig,
    publicRequests,
    globalConfig || createEmptyRequestGlobalConfig(),
    runtimeContext,
  )

  return {
    raw: result.raw,
    dimensions: result.dimensions,
    source: result.source,
    markingDataError:
      isMarkingSelection && !Array.isArray(result.raw)
        ? '打点请求结果必须是数组，当前结果无法生成实例。'
        : '',
  }
}

/**
 * 复用最近一次原始响应，在本地重算提取路径和过滤器后的二维表。
 *
 * 这样用户调过滤器时不需要再次发请求，交互会稳定很多。
 */
export function syncRightDataPanelPreviewFromRaw(
  raw: unknown,
  dataConfig: ComponentDataConfig,
) {
  return transformRequestPayloadToRows(raw, dataConfig.extractor?.resultPath, dataConfig.filterFn)
}
