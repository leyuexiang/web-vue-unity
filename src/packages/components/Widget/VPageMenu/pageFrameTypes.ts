import { cloneDeep } from 'lodash-es'
import type { InteractionEvent } from '@/types/threeScene'
import { normalizePageMenuLabel, type PageMenuNode } from './menuTree'

export const PAGE_FRAME_SCHEMA_VERSION = 2 as const
export const PAGE_FRAME_BACKGROUND_URL = new URL('./assets/page-frame-topbar.png', import.meta.url)
  .href
export const PAGE_FRAME_FACTORY_BACKGROUND_URL = new URL(
  './assets/page-frame-factory.svg',
  import.meta.url,
).href
/** 中医馆数字养生系统使用的整屏透明外边框底图。 */
export const PAGE_FRAME_TCM_BACKGROUND_URL = new URL('./assets/page-frame-tcm.png', import.meta.url)
  .href
/** 图片资源库中的“孪生展厅框架图”；内置一份原图以保证预设跨环境可用。 */
export const PAGE_FRAME_SHOWROOM_BACKGROUND_URL = new URL(
  './assets/page-frame-showroom.png',
  import.meta.url,
).href
export const PAGE_FRAME_SHOWROOM_LOGO_URL = new URL('./assets/showroom-logo.svg', import.meta.url).href
export const PAGE_FRAME_SHOWROOM_SUN_URL = new URL('./assets/showroom-sun.svg', import.meta.url).href
export const PAGE_FRAME_SHOWROOM_AVATAR_URL = new URL('./assets/showroom-avatar.png', import.meta.url)
  .href
/** 展厅导航项在 Figma 中分别提供带文字的未选中和选中透明图。 */
const SHOWROOM_MENU_IMAGES = [
  {
    normal: new URL('./assets/showroom-menu-sandbox-normal.png', import.meta.url).href,
    active: new URL('./assets/showroom-menu-sandbox-active.png', import.meta.url).href,
  },
  {
    normal: new URL('./assets/showroom-menu-science-normal.png', import.meta.url).href,
    active: new URL('./assets/showroom-menu-science-active.png', import.meta.url).href,
  },
  {
    normal: new URL('./assets/showroom-menu-products-normal.png', import.meta.url).href,
    active: new URL('./assets/showroom-menu-products-active.png', import.meta.url).href,
  },
  {
    normal: new URL('./assets/showroom-menu-origin-normal.png', import.meta.url).href,
    active: new URL('./assets/showroom-menu-origin-active.png', import.meta.url).href,
  },
  {
    normal: new URL('./assets/showroom-menu-brand-normal.png', import.meta.url).href,
    active: new URL('./assets/showroom-menu-brand-active.png', import.meta.url).href,
  },
] as const
/** 加工厂第二页使用用户确认的外边框底图，中心透明区域保留给场景和页面槽位。 */
export const PAGE_FRAME_FACTORY_REFERENCE_URL = '/images/dashboard/factory-frame.png'
/** 上一版误用的整屏截图地址，仅用于打开旧场景时做一次性迁移。 */
export const PAGE_FRAME_FACTORY_LEGACY_REFERENCE_URL =
  '/images/dashboard/factory-digital-platform-reference.png'

/** 加工厂 1920px 设计稿的底部六个菜单中心约为 700、804、908、1012、1116、1220。 */
export const PAGE_FRAME_FACTORY_MENU_SPREAD_X = 4
export const PAGE_FRAME_FACTORY_MENU_ITEM_GAP = 20

export const PAGE_FRAME_LAYOUT_OPTIONS = [
  { label: '顶部菜单', value: 'topbar' },
  { label: '加工厂底部菜单', value: 'factory-bottom' },
  { label: '中医馆底部菜单', value: 'tcm-bottom' },
  { label: '孪生展厅顶部菜单', value: 'showroom-top' },
] as const

export type PageFrameLayout = (typeof PAGE_FRAME_LAYOUT_OPTIONS)[number]['value']

export type PageFrameSlot =
  | 'logo'
  | 'left-menu'
  | 'title'
  | 'right-menu'
  | 'weather'
  | 'time'
  | 'account'

export type PageFrameTextStyle = {
  color: string
  fontFamily: string
  fontSize: number
  fontWeight: number
}

/** 顶栏可自由微调子节点的设计坐标边界。 */
export const PAGE_FRAME_CHILD_OFFSET_RANGE = { min: -2000, max: 2000 } as const
/** 组内一级菜单从左到右排列时，相邻两项之间的设计像素间距。 */
export const PAGE_FRAME_MENU_ITEM_GAP_RANGE = { min: 0, max: 96 } as const
/** 一级菜单按钮及其文字、图标的缩放边界。 */
export const PAGE_FRAME_MENU_SCALE_RANGE = { min: 0.2, max: 4 } as const
export const PAGE_FRAME_RESIZE_HANDLES = ['l', 'r', 't', 'b', 'lt', 'lb', 'rt', 'rb'] as const
export type PageFrameResizeHandle = (typeof PAGE_FRAME_RESIZE_HANDLES)[number]

export type PageFrameChildBase = {
  id: string
  slot: PageFrameSlot
  visible: boolean
  locked: boolean
  /**
   * 页面框架子项复用普通二维组件的交互事件模型与编辑器，不建立专用事件协议。
   * 每个子项独立保存，避免点击“首页”时误执行整个页面框架或相邻菜单的事件。
   */
  interactiveEvent: InteractionEvent[]
}

export type PageFrameMenuSlot = PageFrameChildBase &
  PageFramePositionableChild & {
    kind: 'menu-slot'
    label: string
    itemGap: number
  }

export type PageFrameLogoChild = PageFrameChildBase & {
  kind: 'logo'
  text: string
  imageUrl: string
  /** 相对默认槽位的设计坐标偏移，平移 Logo 图片与文案整体。 */
  offsetX: number
  offsetY: number
  style: PageFrameTextStyle
}

export type PageFramePositionableChild = {
  offsetX: number
  offsetY: number
}

export type PageFrameTitleChild = PageFrameChildBase &
  PageFramePositionableChild & {
    kind: 'title'
    text: string
    subtitle: string
    style: PageFrameTextStyle
    subtitleStyle: PageFrameTextStyle
  }

export type PageFrameWeatherChild = PageFrameChildBase &
  PageFramePositionableChild & {
    kind: 'weather'
    temperature: string
    condition: string
    /** 未匹配到指定天气时使用的兜底图标。 */
    iconUrl: string
    /** 接口返回天气图标库编码时使用；与 iconUrl 二选一。 */
    iconName: string
    /** 按天气名称匹配的图片列表，匹配成功时优先于默认图标展示。 */
    images: PageFrameWeatherImage[]
    style: PageFrameTextStyle
  }

/** 日期与时分秒独立于天气，便于分别拖动、隐藏和进行数据绑定。 */
export type PageFrameTimeChild = PageFrameChildBase &
  PageFramePositionableChild & {
    kind: 'time'
    date: string
    time: string
    style: PageFrameTextStyle
  }

export type PageFrameWeatherImage = {
  id: string
  condition: string
  /** 从“图标 > 天气”中选择的图标名称；与图片二选一。 */
  iconName: string
  imageUrl: string
}

export type PageFrameAccountChild = PageFrameChildBase &
  PageFramePositionableChild & {
    kind: 'account'
    name: string
    avatarUrl: string
    role: string
    style: PageFrameTextStyle
  }

export type PageFrameMenuChild = PageFrameChildBase &
  PageFramePositionableChild & {
    kind: 'menu-button'
    side: 'left' | 'right'
    /** 一级按钮整体相对菜单槽位的设计坐标偏移和缩放。 */
    scale: number
    label: string
    /** 按钮文字相对按钮内容中心的偏移和缩放。 */
    labelOffsetX: number
    labelOffsetY: number
    labelScale: number
    pageUrl: string
    openInNewWindow: boolean
    /** 一级菜单未选中时显示的图标；空字符串表示不配置图标。 */
    iconUrl: string
    /** 一级菜单选中时显示的图标；未配置时回退到未选中图标。 */
    activeIconUrl: string
    /** @deprecated 旧场景兼容字段；中医馆菜单不再渲染选中底图或边框图片。 */
    activeBackgroundImage: string
    /** 按钮图标相对按钮内容中心的偏移和缩放。 */
    iconOffsetX: number
    iconOffsetY: number
    iconScale: number
    /** 一级菜单选中图标的独立缩放；旧配置缺失时回退到 iconScale。 */
    activeIconScale: number
    children: PageMenuNode[]
    style: PageFrameTextStyle
  }

export type PageFrameBackground = {
  sourceType: 'builtin' | 'external' | 'resource-market'
  value: string
  resourceKey?: string
  opacity: number
}

export type PageFrameOption = {
  schemaVersion: typeof PAGE_FRAME_SCHEMA_VERSION
  label: string
  /** 只切换框架编排与装饰风格；槽位、数据绑定和交互协议保持一致。 */
  layout: PageFrameLayout
  visible?: boolean
  locked?: boolean
  background: PageFrameBackground
  logo: PageFrameLogoChild
  menuSlots: {
    left: PageFrameMenuSlot
    right: PageFrameMenuSlot
  }
  title: PageFrameTitleChild
  weather: PageFrameWeatherChild
  time: PageFrameTimeChild
  account: PageFrameAccountChild
  /** 预览态首次打开页面时默认激活的一级菜单 ID。 */
  defaultMenuId: string
  menuChildren: PageFrameMenuChild[]
}

export type PageFrameSelectableChild =
  | PageFrameLogoChild
  | PageFrameMenuSlot
  | PageFrameTitleChild
  | PageFrameWeatherChild
  | PageFrameTimeChild
  | PageFrameAccountChild
  | PageFrameMenuChild

const DEFAULT_FONT = '"Microsoft YaHei", "PingFang SC", sans-serif'

const textStyle = (fontSize: number, fontWeight = 500): PageFrameTextStyle => ({
  color: '#ecfff8',
  fontFamily: DEFAULT_FONT,
  fontSize,
  fontWeight,
})

/** 常见天气默认提供图片槽位，用户只需为需要展示的类型选择对应图片。 */
const DEFAULT_PAGE_FRAME_WEATHER_TYPES = [
  { id: 'sunny', condition: '晴' },
  { id: 'few-clouds', condition: '少云' },
  { id: 'cloudy', condition: '多云' },
  { id: 'overcast', condition: '阴' },
  { id: 'light-rain', condition: '小雨' },
  { id: 'moderate-rain', condition: '中雨' },
  { id: 'heavy-rain', condition: '大雨' },
  { id: 'thunderstorm', condition: '雷阵雨' },
  { id: 'light-snow', condition: '小雪' },
  { id: 'moderate-snow', condition: '中雪' },
  { id: 'heavy-snow', condition: '大雪' },
  { id: 'fog', condition: '雾' },
  { id: 'haze', condition: '霾' },
] as const

const createDefaultWeatherImages = (): PageFrameWeatherImage[] =>
  DEFAULT_PAGE_FRAME_WEATHER_TYPES.map(({ id, condition }) => ({
    id,
    condition,
    iconName: '',
    imageUrl: '',
  }))

const menuChild = (
  id: string,
  label: string,
  side: 'left' | 'right',
  children: PageMenuNode[] = [],
): PageFrameMenuChild => ({
  id,
  kind: 'menu-button',
  slot: side === 'left' ? 'left-menu' : 'right-menu',
  side,
  label,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  labelOffsetX: 0,
  labelOffsetY: 0,
  labelScale: 1,
  pageUrl: '',
  openInNewWindow: false,
  iconUrl: '',
  activeIconUrl: '',
  activeBackgroundImage: '',
  iconOffsetX: 0,
  iconOffsetY: 0,
  iconScale: 1,
  activeIconScale: 1,
  visible: true,
  locked: false,
  interactiveEvent: [],
  children,
  style: textStyle(15, 600),
})

export const createDefaultPageFrameOption = (): PageFrameOption => ({
  schemaVersion: PAGE_FRAME_SCHEMA_VERSION,
  label: '页面框架',
  layout: 'topbar',
  background: {
    sourceType: 'builtin',
    value: PAGE_FRAME_BACKGROUND_URL,
    opacity: 1,
  },
  logo: {
    id: 'page-frame-logo',
    kind: 'logo',
    slot: 'logo',
    visible: true,
    locked: false,
    interactiveEvent: [],
    text: 'XX企业',
    imageUrl: '',
    offsetX: 0,
    offsetY: 0,
    style: textStyle(18, 700),
  },
  menuSlots: {
    left: {
      id: 'page-frame-left-menu',
      kind: 'menu-slot',
      slot: 'left-menu',
      label: '左侧菜单',
      visible: true,
      locked: false,
      interactiveEvent: [],
      offsetX: 0,
      offsetY: 0,
      itemGap: 10,
    },
    right: {
      id: 'page-frame-right-menu',
      kind: 'menu-slot',
      slot: 'right-menu',
      label: '右侧菜单',
      visible: true,
      locked: false,
      interactiveEvent: [],
      offsetX: 0,
      offsetY: 0,
      itemGap: 10,
    },
  },
  title: {
    id: 'page-frame-title',
    kind: 'title',
    slot: 'title',
    visible: true,
    locked: false,
    interactiveEvent: [],
    text: '数字孪生平台',
    subtitle: 'SMART AGRICULTURE DIGITAL TWIN PLATFORM',
    offsetX: 0,
    offsetY: 0,
    style: textStyle(28, 700),
    subtitleStyle: { ...textStyle(10, 500), color: 'rgba(224, 255, 246, 0.72)' },
  },
  weather: {
    id: 'page-frame-weather',
    kind: 'weather',
    slot: 'weather',
    visible: true,
    locked: false,
    interactiveEvent: [],
    temperature: '26°C',
    condition: '晴',
    iconUrl: '',
    iconName: '',
    images: createDefaultWeatherImages(),
    offsetX: 0,
    offsetY: 0,
    style: textStyle(13, 500),
  },
  time: {
    id: 'page-frame-time',
    kind: 'time',
    slot: 'time',
    visible: true,
    locked: false,
    interactiveEvent: [],
    date: '2026-07-07',
    time: '10:10:07',
    offsetX: 0,
    offsetY: 0,
    style: textStyle(13, 500),
  },
  account: {
    id: 'page-frame-account',
    kind: 'account',
    slot: 'account',
    visible: true,
    locked: false,
    interactiveEvent: [],
    name: '管理员',
    avatarUrl: '',
    role: '系统管理员',
    offsetX: 0,
    offsetY: 0,
    style: textStyle(13, 500),
  },
  defaultMenuId: 'page-frame-menu-module-1',
  menuChildren: [
    menuChild('page-frame-menu-module-1', '', 'left'),
    menuChild('page-frame-menu-module-2', '', 'left'),
    menuChild('page-frame-menu-module-3', '', 'left'),
    menuChild('page-frame-menu-module-4', '', 'right'),
    menuChild('page-frame-menu-module-5', '', 'right'),
    menuChild('page-frame-menu-module-6', '', 'right'),
  ],
})

/** 加工厂设计稿只改变框架编排和视觉密度，固定槽位及其稳定 ID 与默认框架一致。 */
export const createFactoryBottomPageFrameOption = (): PageFrameOption => {
  const option = createDefaultPageFrameOption()
  option.layout = 'factory-bottom'
  option.background.value = PAGE_FRAME_FACTORY_REFERENCE_URL
  option.menuSlots.left.offsetX = -PAGE_FRAME_FACTORY_MENU_SPREAD_X
  option.menuSlots.right.offsetX = PAGE_FRAME_FACTORY_MENU_SPREAD_X
  option.title.style.fontSize = 24
  option.title.subtitleStyle.fontSize = 8
  option.menuSlots.left.itemGap = PAGE_FRAME_FACTORY_MENU_ITEM_GAP
  option.menuSlots.right.itemGap = PAGE_FRAME_FACTORY_MENU_ITEM_GAP
  option.menuChildren.forEach((child) => {
    child.style.fontSize = 13
    child.style.fontWeight = 500
  })
  return option
}

/**
 * 中医馆外边框预设只替换页面框架底图；菜单、槽位、数据绑定和交互继续复用同一套协议。
 * 图片已经包含中央标题，因此默认隐藏可编辑标题槽位，避免标题文字重复叠加；需要动态标题时可在配置面板中重新显示。
 */
export const createTcmPageFrameOption = (): PageFrameOption => {
  const option = createDefaultPageFrameOption()
  option.label = '中医馆页面框架'
  option.layout = 'tcm-bottom'
  option.background.value = PAGE_FRAME_TCM_BACKGROUND_URL
  option.title.visible = false
  option.logo.text = '宗溯纬业'
  option.weather.temperature = '22°C'
  option.weather.condition = '多云'
  option.menuSlots.left.itemGap = 24
  option.menuSlots.right.visible = false
  option.menuChildren = [
    menuChild('page-frame-menu-overview', '总览', 'left'),
    menuChild('page-frame-menu-prescription', '患者处方', 'left'),
    menuChild('page-frame-menu-herbs', '药材管理', 'left'),
    menuChild('page-frame-menu-sales', '商城销售', 'left'),
    menuChild('page-frame-menu-equipment', '设备监控', 'left'),
  ]
  option.defaultMenuId = option.menuChildren[0].id
  option.menuChildren.forEach((child) => {
    child.style.color = '#8f9993'
    child.style.fontFamily = '"Source Han Sans SC", "Microsoft YaHei", sans-serif'
    child.style.fontSize = 16
    child.style.fontWeight = 400
  })
  return option
}

/** 展厅预设只设置视觉与初始菜单；子项编辑、事件和切页继续走 VPageMenu 公共链路。 */
export const createShowroomPageFrameOption = (): PageFrameOption => {
  const option = createDefaultPageFrameOption()
  option.label = '孪生展厅页面框架'
  option.layout = 'showroom-top'
  option.background.value = PAGE_FRAME_SHOWROOM_BACKGROUND_URL
  option.logo.text = '道地药材数字孪生展厅'
  option.logo.imageUrl = PAGE_FRAME_SHOWROOM_LOGO_URL
  option.logo.style = {
    color: '#f6d99f',
    fontFamily: '"Source Han Serif SC", "Noto Serif CJK SC", serif',
    fontSize: 24,
    fontWeight: 900,
  }
  option.title.visible = false
  option.menuSlots.left.itemGap = 87
  option.menuSlots.right.visible = false
  option.weather.temperature = '36℃'
  option.weather.condition = ''
  option.weather.iconUrl = PAGE_FRAME_SHOWROOM_SUN_URL
  option.weather.style.color = '#e9dfc9'
  option.weather.style.fontSize = 14
  option.time.style.color = '#e9dfc9'
  option.time.style.fontSize = 14
  option.account.name = '管理员'
  option.account.avatarUrl = PAGE_FRAME_SHOWROOM_AVATAR_URL
  option.account.style.color = '#e9dfc9'
  option.account.style.fontSize = 12
  option.menuChildren = [
    menuChild('page-frame-showroom-sandbox', '全局沙盘', 'left'),
    menuChild('page-frame-showroom-science', '科普馆', 'left'),
    menuChild('page-frame-showroom-products', '药材商品馆', 'left'),
    menuChild('page-frame-showroom-origin', '道地溯源馆', 'left'),
    menuChild('page-frame-showroom-brand', '品牌馆', 'left'),
  ]
  option.defaultMenuId = option.menuChildren[0].id
  option.menuChildren.forEach((child, index) => {
    child.iconUrl = SHOWROOM_MENU_IMAGES[index].normal
    child.activeIconUrl = SHOWROOM_MENU_IMAGES[index].active
    child.style.color = '#d5d2c8'
    child.style.fontFamily = '"Source Han Serif SC", "Noto Serif CJK SC", serif'
    child.style.fontSize = 16
    child.style.fontWeight = 400
  })
  return option
}

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

const normalizeTextStyle = (
  value: Partial<PageFrameTextStyle> | null | undefined,
  defaults: PageFrameTextStyle,
): PageFrameTextStyle => ({
  color: typeof value?.color === 'string' && value.color.trim() ? value.color : defaults.color,
  fontFamily:
    typeof value?.fontFamily === 'string' && value.fontFamily.trim()
      ? value.fontFamily
      : defaults.fontFamily,
  fontSize: clamp(value?.fontSize, 8, 72, defaults.fontSize),
  fontWeight: clamp(value?.fontWeight, 100, 900, defaults.fontWeight),
})

/** 事件结构由公共事件系统负责解释；页面框架只做数组边界和深拷贝保护。 */
const normalizeInteractiveEventList = (value: unknown): InteractionEvent[] =>
  Array.isArray(value) ? cloneDeep(value) : []

const normalizeWeatherImages = (
  value: unknown,
  defaults: PageFrameWeatherImage[],
): PageFrameWeatherImage[] => {
  if (!Array.isArray(value)) return defaults.map((image) => ({ ...image }))
  const ids = new Set<string>()
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .slice(0, 30)
    .map((item, index) => {
      let id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id
          : `page-frame-weather-image-${index + 1}`
      while (ids.has(id)) id = `${id}-${index + 1}`
      ids.add(id)
      return {
        id,
        condition: typeof item.condition === 'string' ? item.condition : '',
        iconName: typeof item.iconName === 'string' ? item.iconName : '',
        imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : '',
      }
    })
}

/** 根据当前天气名称选择已配置的图片；未命中时保留原有默认图标兼容旧场景。 */
export const resolvePageFrameWeatherImage = (
  weather: Pick<PageFrameWeatherChild, 'condition' | 'iconUrl' | 'iconName' | 'images'>,
) => {
  if (weather.iconName.trim()) return ''
  const condition = weather.condition.trim().toLocaleLowerCase()
  const matchedWeather = condition
    ? weather.images.find((item) => item.condition.trim().toLocaleLowerCase() === condition)
        ?.imageUrl
    : ''
  const matchedIconName = condition
    ? weather.images.find((item) => item.condition.trim().toLocaleLowerCase() === condition)
        ?.iconName
    : ''
  return matchedWeather || (matchedIconName?.trim() ? '' : weather.iconUrl)
}

/** 自定义图片未配置时，才由当前天气对应的图标库图标接管展示。 */
export const resolvePageFrameWeatherIconName = (
  weather: Pick<PageFrameWeatherChild, 'condition' | 'iconName' | 'images'>,
) => {
  if (weather.iconName.trim()) return weather.iconName.trim()
  const condition = weather.condition.trim().toLocaleLowerCase()
  if (!condition) return ''
  return (
    weather.images.find(
      (item) => item.condition.trim().toLocaleLowerCase() === condition && item.iconName.trim(),
    )?.iconName || ''
  )
}

const normalizeMenuTree = (
  nodes: unknown,
  depth = 1,
  legacyOpenInNewWindow = false,
): PageMenuNode[] => {
  if (!Array.isArray(nodes) || depth > 3) return []
  return nodes
    .filter((node): node is Record<string, unknown> => Boolean(node && typeof node === 'object'))
    .map((node, index) => ({
      id: String(node.id || `page-frame-nested-${depth}-${index}`),
      label: normalizePageMenuLabel(node.label ?? node.name),
      pageUrl: typeof node.pageUrl === 'string' ? node.pageUrl : '',
      openInNewWindow:
        node.openInNewWindow === true || (node.openInNewWindow == null && legacyOpenInNewWindow),
      visible: node.visible !== false,
      children: normalizeMenuTree(node.children, depth + 1, legacyOpenInNewWindow),
    }))
}

/** 新版配置的唯一归一化入口；运行时、载入和数据绑定共享同一套安全回退。 */
export const normalizePageFrameOption = (value: unknown): PageFrameOption => {
  const defaults = createDefaultPageFrameOption()
  if (!value || typeof value !== 'object') return defaults
  const input = value as Partial<PageFrameOption>
  if (input.schemaVersion !== PAGE_FRAME_SCHEMA_VERSION) return defaults

  const option = cloneDeep(defaults)
  option.label =
    typeof input.label === 'string' && input.label.trim() ? input.label : defaults.label
  option.layout =
    input.layout === 'factory-bottom' ||
    input.layout === 'tcm-bottom' ||
    input.layout === 'showroom-top'
      ? input.layout
      : 'topbar'
  option.visible = input.visible !== false
  option.locked = input.locked === true
  // v2.0 曾把打开方式放在框架级别；迁移时将其用作每个旧菜单缺省值，保留旧场景行为。
  const legacyOpenInNewWindow = (input as { openInNewWindow?: unknown }).openInNewWindow === true

  const background = input.background
  if (background && typeof background === 'object') {
    option.background.sourceType = ['builtin', 'external', 'resource-market'].includes(
      background.sourceType,
    )
      ? background.sourceType
      : defaults.background.sourceType
    option.background.value =
      typeof background.value === 'string' && background.value.trim()
        ? background.value
        : defaults.background.value
    option.background.opacity = clamp(background.opacity, 0, 1, 1)
    option.background.resourceKey =
      typeof background.resourceKey === 'string' && background.resourceKey.trim()
        ? background.resourceKey.trim()
        : undefined
  }
  const mergeChild = <T extends PageFrameSelectableChild>(
    target: T,
    source: Partial<T> | undefined,
  ) => {
    if (!source || typeof source !== 'object') return
    target.visible = source.visible !== false
    target.locked = source.locked === true
    target.interactiveEvent = normalizeInteractiveEventList(source.interactiveEvent)
    if ('style' in target) {
      target.style = normalizeTextStyle(
        (source as Partial<T & { style: PageFrameTextStyle }>).style,
        target.style,
      )
    }
  }

  mergeChild(option.logo, input.logo)
  option.logo.text = typeof input.logo?.text === 'string' ? input.logo.text : option.logo.text
  option.logo.imageUrl =
    typeof input.logo?.imageUrl === 'string' ? input.logo.imageUrl : option.logo.imageUrl
  option.logo.offsetX = clamp(
    input.logo?.offsetX,
    PAGE_FRAME_CHILD_OFFSET_RANGE.min,
    PAGE_FRAME_CHILD_OFFSET_RANGE.max,
    option.logo.offsetX,
  )
  option.logo.offsetY = clamp(
    input.logo?.offsetY,
    PAGE_FRAME_CHILD_OFFSET_RANGE.min,
    PAGE_FRAME_CHILD_OFFSET_RANGE.max,
    option.logo.offsetY,
  )

  mergeChild(option.title, input.title)
  option.title.text = typeof input.title?.text === 'string' ? input.title.text : option.title.text
  option.title.subtitle =
    typeof input.title?.subtitle === 'string' ? input.title.subtitle : option.title.subtitle
  option.title.offsetX = clamp(
    input.title?.offsetX,
    PAGE_FRAME_CHILD_OFFSET_RANGE.min,
    PAGE_FRAME_CHILD_OFFSET_RANGE.max,
    option.title.offsetX,
  )
  option.title.offsetY = clamp(
    input.title?.offsetY,
    PAGE_FRAME_CHILD_OFFSET_RANGE.min,
    PAGE_FRAME_CHILD_OFFSET_RANGE.max,
    option.title.offsetY,
  )
  option.title.subtitleStyle = normalizeTextStyle(
    input.title?.subtitleStyle,
    option.title.subtitleStyle,
  )

  mergeChild(option.weather, input.weather)
  ;(['temperature', 'condition', 'iconUrl', 'iconName'] as const).forEach((key) => {
    if (typeof input.weather?.[key] === 'string') option.weather[key] = input.weather[key]
  })
  option.weather.images = normalizeWeatherImages(input.weather?.images, option.weather.images)
  option.weather.offsetX = clamp(
    input.weather?.offsetX,
    PAGE_FRAME_CHILD_OFFSET_RANGE.min,
    PAGE_FRAME_CHILD_OFFSET_RANGE.max,
    option.weather.offsetX,
  )
  option.weather.offsetY = clamp(
    input.weather?.offsetY,
    PAGE_FRAME_CHILD_OFFSET_RANGE.min,
    PAGE_FRAME_CHILD_OFFSET_RANGE.max,
    option.weather.offsetY,
  )

  mergeChild(option.time, input.time)
  option.time.date = typeof input.time?.date === 'string' ? input.time.date : option.time.date
  /** 历史天气槽位中保存的时分文本自动迁移到新的独立时间槽位。 */
  const legacyWeatherTime = (input.weather as unknown as { time?: unknown } | undefined)?.time
  option.time.time =
    typeof input.time?.time === 'string'
      ? input.time.time
      : typeof legacyWeatherTime === 'string'
        ? legacyWeatherTime
        : option.time.time
  option.time.offsetX = clamp(
    input.time?.offsetX,
    PAGE_FRAME_CHILD_OFFSET_RANGE.min,
    PAGE_FRAME_CHILD_OFFSET_RANGE.max,
    option.time.offsetX,
  )
  option.time.offsetY = clamp(
    input.time?.offsetY,
    PAGE_FRAME_CHILD_OFFSET_RANGE.min,
    PAGE_FRAME_CHILD_OFFSET_RANGE.max,
    option.time.offsetY,
  )

  mergeChild(option.account, input.account)
  ;(['name', 'avatarUrl', 'role'] as const).forEach((key) => {
    if (typeof input.account?.[key] === 'string') option.account[key] = input.account[key]
  })
  option.account.offsetX = clamp(
    input.account?.offsetX,
    PAGE_FRAME_CHILD_OFFSET_RANGE.min,
    PAGE_FRAME_CHILD_OFFSET_RANGE.max,
    option.account.offsetX,
  )
  option.account.offsetY = clamp(
    input.account?.offsetY,
    PAGE_FRAME_CHILD_OFFSET_RANGE.min,
    PAGE_FRAME_CHILD_OFFSET_RANGE.max,
    option.account.offsetY,
  )

  mergeChild(option.menuSlots.left, input.menuSlots?.left)
  mergeChild(option.menuSlots.right, input.menuSlots?.right)
  ;(['left', 'right'] as const).forEach((side) => {
    const slot = option.menuSlots[side]
    const inputSlot = input.menuSlots?.[side]
    slot.offsetX = clamp(
      inputSlot?.offsetX,
      PAGE_FRAME_CHILD_OFFSET_RANGE.min,
      PAGE_FRAME_CHILD_OFFSET_RANGE.max,
      slot.offsetX,
    )
    slot.offsetY = clamp(
      inputSlot?.offsetY,
      PAGE_FRAME_CHILD_OFFSET_RANGE.min,
      PAGE_FRAME_CHILD_OFFSET_RANGE.max,
      slot.offsetY,
    )
    slot.itemGap = clamp(
      inputSlot?.itemGap,
      PAGE_FRAME_MENU_ITEM_GAP_RANGE.min,
      PAGE_FRAME_MENU_ITEM_GAP_RANGE.max,
      slot.itemGap,
    )
  })

  /**
   * 已保存的加工厂旧快照可能仍指向旧 SVG 或误用的截图。
   * 这里在菜单槽位归一化之后再迁移，才能同时把旧的“全为 0”默认位置展开到外框中心线；
   * 已经手动拖过的槽位则完整保留用户坐标。
   */
  const isLegacyFactoryBackground =
    option.background.value === PAGE_FRAME_FACTORY_BACKGROUND_URL ||
    option.background.value === PAGE_FRAME_FACTORY_LEGACY_REFERENCE_URL
  if (option.layout === 'factory-bottom' && isLegacyFactoryBackground) {
    option.background.value = PAGE_FRAME_FACTORY_REFERENCE_URL
    const hasExplicitMenuOffsets =
      (typeof input.menuSlots?.left?.offsetX === 'number' && input.menuSlots.left.offsetX !== 0) ||
      (typeof input.menuSlots?.right?.offsetX === 'number' && input.menuSlots.right.offsetX !== 0)
    if (
      !hasExplicitMenuOffsets &&
      option.menuSlots.left.offsetX === 0 &&
      option.menuSlots.right.offsetX === 0
    ) {
      option.menuSlots.left.offsetX = -PAGE_FRAME_FACTORY_MENU_SPREAD_X
      option.menuSlots.right.offsetX = PAGE_FRAME_FACTORY_MENU_SPREAD_X
    }
  }

  if (Array.isArray(input.menuChildren)) {
    option.menuChildren = input.menuChildren
      .filter((child): child is PageFrameMenuChild => Boolean(child && typeof child === 'object'))
      .map((child, index) => {
        const side = child.side === 'right' ? 'right' : 'left'
        const defaultsForChild = menuChild(
          String(child.id || `page-frame-menu-${index + 1}`),
          normalizePageMenuLabel(child.label),
          side,
        )
        return {
          ...defaultsForChild,
          offsetX: clamp(
            child.offsetX,
            PAGE_FRAME_CHILD_OFFSET_RANGE.min,
            PAGE_FRAME_CHILD_OFFSET_RANGE.max,
            defaultsForChild.offsetX,
          ),
          offsetY: clamp(
            child.offsetY,
            PAGE_FRAME_CHILD_OFFSET_RANGE.min,
            PAGE_FRAME_CHILD_OFFSET_RANGE.max,
            defaultsForChild.offsetY,
          ),
          scale: clamp(
            child.scale,
            PAGE_FRAME_MENU_SCALE_RANGE.min,
            PAGE_FRAME_MENU_SCALE_RANGE.max,
            defaultsForChild.scale,
          ),
          labelOffsetX: clamp(
            child.labelOffsetX,
            PAGE_FRAME_CHILD_OFFSET_RANGE.min,
            PAGE_FRAME_CHILD_OFFSET_RANGE.max,
            defaultsForChild.labelOffsetX,
          ),
          labelOffsetY: clamp(
            child.labelOffsetY,
            PAGE_FRAME_CHILD_OFFSET_RANGE.min,
            PAGE_FRAME_CHILD_OFFSET_RANGE.max,
            defaultsForChild.labelOffsetY,
          ),
          labelScale: clamp(
            child.labelScale,
            PAGE_FRAME_MENU_SCALE_RANGE.min,
            PAGE_FRAME_MENU_SCALE_RANGE.max,
            defaultsForChild.labelScale,
          ),
          iconOffsetX: clamp(
            child.iconOffsetX,
            PAGE_FRAME_CHILD_OFFSET_RANGE.min,
            PAGE_FRAME_CHILD_OFFSET_RANGE.max,
            defaultsForChild.iconOffsetX,
          ),
          iconOffsetY: clamp(
            child.iconOffsetY,
            PAGE_FRAME_CHILD_OFFSET_RANGE.min,
            PAGE_FRAME_CHILD_OFFSET_RANGE.max,
            defaultsForChild.iconOffsetY,
          ),
          iconScale: clamp(
            child.iconScale,
            PAGE_FRAME_MENU_SCALE_RANGE.min,
            PAGE_FRAME_MENU_SCALE_RANGE.max,
            defaultsForChild.iconScale,
          ),
          activeIconScale: clamp(
            child.activeIconScale,
            PAGE_FRAME_MENU_SCALE_RANGE.min,
            PAGE_FRAME_MENU_SCALE_RANGE.max,
            clamp(
              child.iconScale,
              PAGE_FRAME_MENU_SCALE_RANGE.min,
              PAGE_FRAME_MENU_SCALE_RANGE.max,
              defaultsForChild.activeIconScale,
            ),
          ),
          pageUrl: typeof child.pageUrl === 'string' ? child.pageUrl : '',
          openInNewWindow:
            child.openInNewWindow === true ||
            (child.openInNewWindow == null && legacyOpenInNewWindow),
          iconUrl: typeof child.iconUrl === 'string' ? child.iconUrl : defaultsForChild.iconUrl,
          activeIconUrl:
            typeof child.activeIconUrl === 'string'
              ? child.activeIconUrl
              : defaultsForChild.activeIconUrl,
          activeBackgroundImage:
            typeof child.activeBackgroundImage === 'string'
              ? child.activeBackgroundImage
              : defaultsForChild.activeBackgroundImage,
          visible: child.visible !== false,
          locked: child.locked === true,
          interactiveEvent: normalizeInteractiveEventList(child.interactiveEvent),
          children: normalizeMenuTree(child.children, 2, legacyOpenInNewWindow),
          style: normalizeTextStyle(child.style, defaultsForChild.style),
        }
      })
  }

  const requestedDefaultMenuId =
    typeof input.defaultMenuId === 'string' ? input.defaultMenuId.trim() : defaults.defaultMenuId
  option.defaultMenuId = option.menuChildren.some((child) => child.id === requestedDefaultMenuId)
    ? requestedDefaultMenuId
    : ''

  return option
}

export const findPageFrameChild = (
  option: PageFrameOption,
  childId: string,
): PageFrameSelectableChild | null => {
  const fixed: PageFrameSelectableChild[] = [
    option.logo,
    option.menuSlots.left,
    option.title,
    option.menuSlots.right,
    option.weather,
    option.time,
    option.account,
  ]
  return (
    fixed.find((child) => child.id === childId) ||
    option.menuChildren.find((child) => child.id === childId) ||
    null
  )
}

export const createPageFrameMenuChild = (
  index: number,
  side: 'left' | 'right',
): PageFrameMenuChild =>
  menuChild(
    `page-frame-menu-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    '',
    side,
  )

/** 选中图标未配置时继续使用普通图标；两个地址都为空时不渲染图标节点。 */
export const getPageFrameMenuIcon = (
  menu: Pick<PageFrameMenuChild, 'iconUrl' | 'activeIconUrl'>,
  active: boolean,
) => (active && menu.activeIconUrl ? menu.activeIconUrl : menu.iconUrl) || ''

export const movePageFrameMenuChild = (option: PageFrameOption, childId: string, delta: -1 | 1) => {
  const child = option.menuChildren.find((item) => item.id === childId)
  if (!child || child.locked) return false
  const sideItems = option.menuChildren
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.side === child.side)
  const position = sideItems.findIndex(({ item }) => item.id === childId)
  const current = sideItems[position]
  const target = sideItems[position + delta]
  if (!current || !target) return false
  ;[option.menuChildren[current.index], option.menuChildren[target.index]] = [
    option.menuChildren[target.index],
    option.menuChildren[current.index],
  ]
  return true
}

export const removePageFrameMenuChild = (option: PageFrameOption, childId: string) => {
  const index = option.menuChildren.findIndex((item) => item.id === childId)
  if (index < 0 || option.menuChildren[index].locked) return false
  option.menuChildren.splice(index, 1)
  if (option.defaultMenuId === childId) {
    option.defaultMenuId = option.menuChildren.find((item) => item.visible)?.id || ''
  }
  return true
}

export type PageFrameMenuDataRow = {
  id?: unknown
  label?: unknown
  name?: unknown
  pageUrl?: unknown
  side?: unknown
  parentId?: unknown
  visible?: unknown
  openInNewWindow?: unknown
}

/** 将数组、JSON 字符串或多行记录稳定组装为最多三级的左右菜单树。 */
export const normalizePageFrameMenuData = (value: unknown): PageFrameMenuChild[] => {
  let rows: unknown = value
  if (typeof rows === 'string') {
    try {
      rows = JSON.parse(rows)
    } catch {
      return []
    }
  }
  if (!Array.isArray(rows) || rows.length === 0) return []

  const records = rows.filter((row): row is PageFrameMenuDataRow =>
    Boolean(row && typeof row === 'object'),
  )
  if (!records.length) return []

  const ids = new Set<string>()
  const normalized = records.map((row, index) => {
    let id = String(row.id ?? `data-menu-${index + 1}`)
    while (ids.has(id)) id = `${id}-${index + 1}`
    ids.add(id)
    return {
      id,
      label: normalizePageMenuLabel(row.label ?? row.name),
      pageUrl: typeof row.pageUrl === 'string' ? row.pageUrl : '',
      side: row.side === 'right' ? ('right' as const) : ('left' as const),
      explicitSide: row.side === 'left' || row.side === 'right',
      parentId: row.parentId == null || row.parentId === '' ? null : String(row.parentId),
      openInNewWindow: row.openInNewWindow === true,
      visible: row.visible !== false,
      children: [] as PageMenuNode[],
    }
  })
  const byId = new Map(normalized.map((row) => [row.id, row]))
  const roots: typeof normalized = []

  normalized.forEach((row) => {
    const parent = row.parentId ? byId.get(row.parentId) : null
    if (!parent || parent === row) roots.push(row)
    else parent.children.push(row)
  })

  const toNode = (row: (typeof normalized)[number], depth: number): PageMenuNode => ({
    id: row.id,
    label: row.label,
    pageUrl: row.pageUrl,
    openInNewWindow: row.openInNewWindow,
    visible: row.visible,
    children: depth >= 3 ? [] : row.children.map((child) => toNode(child as typeof row, depth + 1)),
  })

  const splitIndex = Math.ceil(roots.length / 2)
  return roots.map((row, index) => ({
    ...menuChild(
      row.id,
      row.label,
      row.explicitSide ? row.side : index < splitIndex ? 'left' : 'right',
      row.children.map((child) => toNode(child as typeof row, 2)),
    ),
    pageUrl: row.pageUrl,
    openInNewWindow: row.openInNewWindow,
    visible: row.visible,
  }))
}
