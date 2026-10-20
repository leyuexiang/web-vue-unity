/** 新组件与历史场景共用图文布局默认值；不再跟随浏览器窗口宽度改变图片比例。 */
export const PAGE_PAGINATION_APPEARANCE_DEFAULTS = {
  imageWidth: 120,
  imageHeight: 100,
  imageTextGap: 16,
  itemGap: 24,
  fontSize: 20,
  textColor: '#ffffff',
  activeTextColor: '#40dfff',
  labelFontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
  labelFontSize: 20,
  labelFontColor: '#ffffff',
  labelFontWeight: 'normal',
} as const

export const PAGE_PAGINATION_SIZE_RANGES = {
  imageWidth: { min: 16, max: 512 },
  imageHeight: { min: 16, max: 512 },
  imageTextGap: { min: 0, max: 100 },
  itemGap: { min: 0, max: 200 },
  fontSize: { min: 10, max: 72 },
  labelFontSize: { min: 10, max: 72 },
} as const

/** 保留分页器原导出名称，所有二维文字组件复用同一字体列表。 */
export { FONT_FAMILY_OPTIONS as PAGE_PAGINATION_FONT_OPTIONS } from '@/packages/shared/fontOptions'

export const PAGE_PAGINATION_FONT_WEIGHT_OPTIONS = [
  { label: '常规', value: 'normal' },
  { label: '中等', value: '500' },
  { label: '加粗', value: 'bold' },
] as const

/** 清空数值控件时回退默认值，避免 null 被转换为 0 导致图片消失。 */
export const normalizePagePaginationSize = (
  key: keyof typeof PAGE_PAGINATION_SIZE_RANGES,
  value: unknown,
) => {
  const numeric = value === null || value === '' ? NaN : Number(value)
  const range = PAGE_PAGINATION_SIZE_RANGES[key]
  return Number.isFinite(numeric)
    ? Math.min(range.max, Math.max(range.min, numeric))
    : PAGE_PAGINATION_APPEARANCE_DEFAULTS[key]
}
