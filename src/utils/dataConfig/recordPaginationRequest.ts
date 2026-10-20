import {
  getDataConfigRequests,
  type ComponentDataConfig,
  type PublicRequestConfig,
  type PublicRequestReferenceConfig,
} from '@/types/data-config'
import type { RecordPaginationBinding } from '@/packages/components/Control/RecordPagination/config'
import { findPublicRequestByConfig } from './dataRequestHelpers'
import {
  applyInteractionRequestParameters,
  buildParameterTargetOptions,
} from './interactionRequestParameters'

/** 将指定公共请求解析为实例临时动态请求，既复用参数协议，也避免修改共享公共接口。 */
export const resolveRecordPaginationRequest = (
  config: ComponentDataConfig | null | undefined,
  binding: RecordPaginationBinding,
  publicRequests: PublicRequestConfig[],
): ComponentDataConfig | null => {
  const item = getDataConfigRequests(config).find((request) => request.id === binding.requestId)
  if (!item || !config) return null
  let request = item.request
  if (request.type === 'public') {
    const publicRequest = findPublicRequestByConfig(
      publicRequests,
      request.config as PublicRequestReferenceConfig,
    )
    if (!publicRequest) return null
    request = { type: 'ajax', config: publicRequest }
  }
  if (request.type !== 'ajax') return null
  const selected = { ...item, request }
  return {
    ...config,
    requests: [selected],
    request,
    dataset: item.dataset,
    bindings: item.bindings,
    extractor: item.extractor,
    filterFn: item.filterFn,
  }
}

/** 只展示查询参数、结构化请求体中的有效字段；请求头和整段脚本不属于分页参数。 */
export const getRecordPaginationParameterOptions = (config: ComponentDataConfig | null) =>
  buildParameterTargetOptions(config).filter((option) => {
    const location = (JSON.parse(option.value) as [string, string, string[]])[1]
    return ['Params', 'json', 'form-data', 'x-www-form-urlencoded'].includes(location)
  })

/** 单次请求只复制当前请求的参数表，两个参数同时赋值后再交给既有发送器。 */
export const buildRecordPaginationRequest = (
  config: ComponentDataConfig | null | undefined,
  binding: RecordPaginationBinding,
  publicRequests: PublicRequestConfig[],
  page: number,
) => {
  if (
    ![0, 1].includes(binding.firstPage) ||
    !Number.isSafeInteger(binding.pageSize) ||
    binding.pageSize < 1
  )
    throw new Error('第一页起点须为0或1，每页条数须为正整数。')
  if (!binding.totalPath.trim()) throw new Error('请配置总条数路径。')
  const selected = resolveRecordPaginationRequest(config, binding, publicRequests)
  if (!selected) throw new Error('请选择有效的动态列表请求或公共接口。')
  const validTargets = new Set(
    getRecordPaginationParameterOptions(selected).map((option) => option.value),
  )
  if (
    binding.pageParameter === binding.sizeParameter ||
    !validTargets.has(binding.pageParameter) ||
    !validTargets.has(binding.sizeParameter)
  )
    throw new Error('请分别选择有效的页码参数和每页条数参数。')
  const updated = applyInteractionRequestParameters(selected, [
    { targetProperty: binding.pageParameter, value: page },
    { targetProperty: binding.sizeParameter, value: binding.pageSize },
  ]).config
  // 列表路径参与现有提取→过滤→标准数据集管线，总数始终从原始响应另行提取。
  updated.requests![0].extractor = { resultPath: binding.listPath.trim() }
  updated.extractor = updated.requests![0].extractor
  // 发送器保留历史 resultPath 别名；空路径代表根数组时，也必须覆盖该别名以免回退旧路径。
  updated.request.config = { ...updated.request.config, resultPath: binding.listPath.trim() }
  updated.requests![0].request = updated.request
  return updated
}
