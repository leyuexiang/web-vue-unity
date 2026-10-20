import {
  getDataConfigRequests,
  syncDataConfigRequestMirror,
  type ComponentDataConfig,
  type ComponentDataRequestItem,
} from '@/types/data-config'

/** 只投影请求输入；静态数据以 request.config.data 为准，远程 dataset 是响应输出。 */
export const requestInputSignature = (item: ComponentDataRequestItem) =>
  JSON.stringify({
    request: item.request,
    extractor: item.extractor,
    bindings: item.bindings,
    filterFn: item.filterFn,
    threeMapRole: item.threeMapRole,
    mergeMode: item.mergeMode,
    dataset: item.request.type === 'dataset' ? item.dataset : undefined,
  })

/**
 * 同一目标逐请求保留运行态参数和结果。只有自身持久输入改变的请求恢复保存配置，
 * 避免修改请求二或加载其他对象时，连带丢失请求一的交互传参。
 */
export const reconcileRuntimeDataConfig = (
  source: ComponentDataConfig,
  runtime: ComponentDataConfig | undefined,
  previous: Map<string, string> | undefined,
) => {
  const signatures = new Map<string, string>()
  const runtimeItems = new Map(getDataConfigRequests(runtime).map((item) => [item.id, item]))
  const requests = getDataConfigRequests(source).map((item) => {
    const signature = requestInputSignature(item)
    signatures.set(item.id, signature)
    return previous?.get(item.id) === signature ? (runtimeItems.get(item.id) ?? item) : item
  })
  return {
    signatures,
    config: syncDataConfigRequestMirror({ ...source, requests }),
  }
}
