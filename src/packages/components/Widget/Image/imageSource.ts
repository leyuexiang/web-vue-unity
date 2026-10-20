/**
 * 判断图片值是否已经是可渲染地址。
 * 市场编号不含地址前缀；保留在线、内联、临时及相对地址语义，兼容已有的地址映射。
 */
export const isImageSourceUrl = (value: string) =>
  /^(?:https?:|data:|blob:|\/|\.\.?\/)/i.test(value)

/**
 * 将市场图片的 value 映射转换为稳定资源引用。
 * 同编号且已有地址时保留地址，避免轮询相同数据重复解析；换编号时清空旧地址，
 * 由图片呈现层异步解析新编号。空值清除图片，不能回退到上一次资源。
 * @param option 本次绑定的配置副本，不修改数据来源。
 * @param value 映射来源值；大整数编号应由数据源以字符串提供。
 */
export const applyMarketImageValue = (option: Record<string, unknown>, value: unknown) => {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
  if (isImageSourceUrl(text)) {
    // 既有地址映射继续直接渲染；市场基础配置的稳定编号仍由资源选择器维护。
    option.value = text
    return
  }

  const canReuseUrl =
    text &&
    text === option.resourceKey &&
    typeof option.value === 'string' &&
    isImageSourceUrl(option.value)
  option.resourceKey = text || undefined
  if (!canReuseUrl) option.value = ''
}
