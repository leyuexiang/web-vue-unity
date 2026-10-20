import type { PagePaginationItem, PagePaginationOption } from './config'
import { PAGE_PAGINATION_LEGACY_IMAGES } from './sampleImages'
import { PAGE_PAGINATION_APPEARANCE_DEFAULTS } from './appearance'

export const PAGE_PAGINATION_PAGE_SIZE_RANGE = { min: 1, max: 8 } as const

/** 按钮字段归一为字符串，兼容旧场景；总数量不限，每屏数量另行约束。 */
export const normalizePagePaginationItems = (value: unknown): PagePaginationItem[] => {
  if (!Array.isArray(value)) return []

  return value.reduce<PagePaginationItem[]>((items, raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return items
    const record = raw as Partial<PagePaginationItem>
    const id = String(record.id || `page-pagination-item-${index + 1}`)
    const label = String(record.label || `页签${index + 1}`).trim() || `页签${index + 1}`
    const eventValue = String(record.eventValue || id).trim() || id
    // 旧字体图标只转换为示例图片；已配置的普通图片优先，不被示例素材覆盖。
    const legacy = PAGE_PAGINATION_LEGACY_IMAGES[String(record.icon || '')]
    const iconUrl =
      record.iconUrl === undefined ? legacy?.iconUrl || '' : String(record.iconUrl || '').trim()
    const activeIconUrl =
      record.activeIconUrl === undefined && record.iconUrl === undefined
        ? legacy?.activeIconUrl || ''
        : String(record.activeIconUrl || '').trim()
    items.push({
      id,
      label,
      eventValue,
      iconUrl,
      activeIconUrl,
      // 保留旧字段，便于未打开属性面板的场景继续按原协议保存。
      ...(record.icon ? { icon: String(record.icon) } : {}),
      ...(record.iconResourceKey ? { iconResourceKey: String(record.iconResourceKey) } : {}),
      ...(record.activeIconResourceKey
        ? { activeIconResourceKey: String(record.activeIconResourceKey) }
        : {}),
      ...(record.fontFamily ? { fontFamily: String(record.fontFamily) } : {}),
      ...(record.fontSize !== undefined && Number.isFinite(Number(record.fontSize))
        ? { fontSize: Number(record.fontSize) }
        : {}),
      ...(record.fontColor ? { fontColor: String(record.fontColor) } : {}),
      ...(record.fontWeight !== undefined ? { fontWeight: record.fontWeight } : {}),
    })
    return items
  }, [])
}

export const normalizePagePaginationPageSize = (value: unknown) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 4
  return Math.min(
    PAGE_PAGINATION_PAGE_SIZE_RANGE.max,
    Math.max(PAGE_PAGINATION_PAGE_SIZE_RANGE.min, Math.floor(numericValue)),
  )
}

/** 新增时避开已有事件值，删除后再新增也不会误触发另一个按钮的条件。 */
export const createPagePaginationItem = (
  index: number,
  existing: PagePaginationItem[] = [],
): PagePaginationItem => {
  const usedValues = new Set(existing.map((item) => item.eventValue))
  let suffix = index + 1
  while (usedValues.has(`page-${suffix}`)) suffix += 1
  return {
    id: `page-pagination-item-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    label: `页签${index + 1}`,
    eventValue: `page-${suffix}`,
    iconUrl: '',
    activeIconUrl: '',
    fontFamily: PAGE_PAGINATION_APPEARANCE_DEFAULTS.labelFontFamily,
    fontSize: PAGE_PAGINATION_APPEARANCE_DEFAULTS.labelFontSize,
    fontColor: PAGE_PAGINATION_APPEARANCE_DEFAULTS.labelFontColor,
    fontWeight: PAGE_PAGINATION_APPEARANCE_DEFAULTS.labelFontWeight,
  }
}

/** 没有选中态素材时继续显示普通图片，不对用户素材强制染色或叠加装饰。 */
export const getPagePaginationImage = (item: PagePaginationItem, active: boolean) =>
  (active && item.activeIconUrl ? item.activeIconUrl : item.iconUrl) || ''

/** 获取翻页箭头图片；空地址表示继续使用组件内置 CSS 箭头。 */
export const getPagePaginationArrowImage = (
  option: Pick<PagePaginationOption, 'previousArrowUrl' | 'nextArrowUrl'>,
  direction: 'previous' | 'next',
) => {
  const value = direction === 'previous' ? option.previousArrowUrl : option.nextArrowUrl
  return String(value ?? '').trim()
}

/** 生成页签文字行内样式，保证每个按钮可以独立配置字体、字号、颜色和字重。 */
export const getPagePaginationLabelStyle = (
  item: PagePaginationItem,
  defaults: {
    fontFamily: string
    fontSize: number
    fontColor: string
    fontWeight: string | number
  },
  active = false,
) => ({
  fontFamily: item.fontFamily || defaults.fontFamily,
  fontSize: `${Number.isFinite(Number(item.fontSize)) ? Number(item.fontSize) : defaults.fontSize}px`,
  // 选中态统一使用分页器选中色，普通态才使用按钮自定义颜色。
  color: active ? defaults.fontColor : item.fontColor || defaults.fontColor,
  fontWeight: item.fontWeight || defaults.fontWeight,
})
