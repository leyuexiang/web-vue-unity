import { FONT_FAMILY_OPTIONS } from '@/packages/shared/fontOptions'

/**
 * 页面菜单直接复用全局字体选项，保证菜单标题、按钮与其他文字组件能选择
 * 完全相同的字体；别名保留原有导出路径，历史配置和面板调用无需改动。
 */
export const PAGE_MENU_FONT_OPTIONS = FONT_FAMILY_OPTIONS

/**
 * 标题区位置使用有限枚举并直接驱动导航网格布局。
 * 配置面板和运行时共享本数组，避免选项文案、存储值和布局分支分别维护后产生偏差。
 */
export const PAGE_MENU_TITLE_POSITION_OPTIONS = [
  { label: '左侧', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '右侧', value: 'right' },
] as const

export type PageMenuTitlePosition = (typeof PAGE_MENU_TITLE_POSITION_OPTIONS)[number]['value']

/**
 * 页面菜单外观默认值集中维护。
 * 新建组件、历史场景回显和右侧面板空值回退必须读取同一份常量，避免三处默认样式逐步偏离。
 */
export const PAGE_MENU_APPEARANCE_DEFAULTS = {
  titleFontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
  titleFontSize: 25,
  subtitleFontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
  subtitleFontSize: 9,
  subtitleSpacing: 0,
  titlePosition: 'center' as PageMenuTitlePosition,
  menuFontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
  menuFontSize: 15,
  menuStartSpacing: 18,
  barBackgroundImage: '',
  buttonBackgroundImage: '',
} as const

/** 历史场景没有标题位置字段，异常值也统一回退居中，避免生成无法预测的网格类名。 */
export const normalizePageMenuTitlePosition = (value: unknown): PageMenuTitlePosition => {
  if (value === 'left' || value === 'right') return value
  return PAGE_MENU_APPEARANCE_DEFAULTS.titlePosition
}

/** 字号边界同时服务配置控件和运行时兜底，防止异常场景数据撑破导航布局。 */
export const PAGE_MENU_FONT_SIZE_RANGE = {
  title: { min: 12, max: 48 },
  subtitle: { min: 8, max: 24 },
  menu: { min: 10, max: 28 },
} as const

/** 副标题与主标题之间的垂直间距范围，限制在导航栏内部的可读区域内。 */
export const PAGE_MENU_SUBTITLE_SPACING_RANGE = { min: 0, max: 32 } as const

/**
 * 一级按钮组从标题边缘开始排列时使用的安全距离。
 * 0px 允许按钮紧贴标题，240px 足以适配宽幅导航底图，同时避免按钮被推离常用画布范围。
 */
export const PAGE_MENU_START_SPACING_RANGE = { min: 0, max: 240 } as const

/**
 * 标题微调采用像素偏移，不直接修改导航部件的整体坐标。
 * 水平范围覆盖窄屏和宽屏的常用修正量，垂直范围避免标题被移出 88px 导航栏可视区域。
 */
export const PAGE_MENU_TITLE_OFFSET_RANGE = {
  horizontal: { min: -240, max: 240 },
  vertical: { min: -40, max: 40 },
} as const

/** 将标题微调值限制在安全范围内，兼容历史场景缺少该字段的情况。 */
export const normalizePageMenuOffset = (
  value: unknown,
  range: { min: number; max: number },
  fallback = 0,
) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(range.max, Math.max(range.min, numericValue))
}

/**
 * 将历史数据或手工修改值归一为安全字号。
 * 每次仅执行常数次数字判断，不创建额外响应式对象。
 */
export const normalizePageMenuFontSize = (
  value: unknown,
  range: { min: number; max: number },
  fallback: number,
) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(range.max, Math.max(range.min, numericValue))
}

/**
 * 将资源市场返回的正式地址转换为 CSS 图片值。
 * JSON 字符串转义可安全处理空格、括号和引号；空地址返回 none，以便继续显示内置渐变底图。
 */
export const toPageMenuCssImage = (value: unknown) => {
  const normalizedUrl = String(value ?? '').trim()
  return normalizedUrl ? `url(${JSON.stringify(normalizedUrl)})` : 'none'
}
