/**
 * 合并同一组件的并发加载并复用成功结果；模块尚未收录或请求失败时释放缓存，
 * 避免开发期新增文件、网络短暂故障后，后续拖拽一直复用失败结果。
 */
export const loadWithRetryableCache = <T>(
  cache: Map<string, Promise<T | undefined>>,
  key: string,
  loader: () => Promise<T | undefined>,
): Promise<T | undefined> => {
  const cached = cache.get(key)
  if (cached) return cached

  const pending = Promise.resolve()
    .then(loader)
    .then(
      (result) => {
        if (result === undefined && cache.get(key) === pending) cache.delete(key)
        return result
      },
      (error: unknown) => {
        // 仅释放本次请求，不能删除清空缓存后创建的新请求；异常交由调用方统一报告。
        if (cache.get(key) === pending) cache.delete(key)
        throw error
      },
    )
  cache.set(key, pending)
  return pending
}
