/**
 * 公共接口名称的兼容字段集合。
 *
 * `name` 是当前场景协议用于下拉框展示的正式字段；`requestName` 是部分旧场景
 * 或早期请求配置留下的兼容字段。把兼容逻辑集中在这里，避免每个面板各自读取
 * 不同字段而再次出现“可以选中但选项文字为空”的状态。
 */
export interface PublicRequestNameSource {
  name?: string | null
  requestName?: string | null
}

/**
 * 读取公共接口的可展示名称。
 *
 * 当前 `name` 优先级最高；旧字段只在新字段为空时兜底。返回值始终已去除首尾空白，
 * 既保证新旧场景的名称可读，也让后续保存得到稳定的一致结果。
 */
export const resolvePublicRequestName = (source: PublicRequestNameSource): string => {
  const currentName = typeof source.name === 'string' ? source.name.trim() : ''
  if (currentName) return currentName

  return typeof source.requestName === 'string' ? source.requestName.trim() : ''
}

/**
 * 把公共接口名称归一到当前协议的 `name` 字段。
 *
 * 此函数只处理展示和保存字段，不改请求地址、请求参数或接口标识；因此用于加载、
 * 编辑和保存三条链路时不会影响接口实际请求行为。
 */
export const normalizePublicRequestName = <T extends PublicRequestNameSource>(
  source: T,
): T & {
  name: string
} => {
  const name = resolvePublicRequestName(source)
  return {
    ...source,
    name,
  }
}
