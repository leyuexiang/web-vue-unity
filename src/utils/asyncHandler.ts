// 生成泛型帮助函数，将异步结果归一化为 [err, data] 元组
// 用法：
// const [err, res] = await to(api.call())
// const [err, data] = await toData(api.call()) // 如果存在 response.data，会unwrap它

export type TupleErrData<T> = [null, T] | [Error, null]

export async function to<T>(promise: Promise<T>): Promise<TupleErrData<T>> {
  try {
    const res = await promise
    return [null, res]
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null]
  }
}

export async function toData<T extends { data?: unknown }>(
  promise: Promise<T>,
): Promise<TupleErrData<T['data']>> {
  const [err, res] = await to(promise as Promise<T>)
  if (err) return [err, null]

  if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) {
    return [null, (res as Record<string, unknown>).data as T['data']]
  }

  return [null, res as T]
}
