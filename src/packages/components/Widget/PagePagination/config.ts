import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { PAGE_PAGINATION_APPEARANCE_DEFAULTS } from './appearance'
import { PAGE_PAGINATION_SAMPLE_IMAGES } from './sampleImages'

/** 页面分页器单个页签的可序列化配置。eventValue 用于交互规则匹配，不保存页面地址。 */
export interface PagePaginationItem {
  id: string
  label: string
  eventValue: string
  /** 普通态与选中态图片独立保存；沿用 iconUrl 字段兼容已有场景图片。 */
  iconUrl?: string
  activeIconUrl?: string
  /** 资源市场稳定编号；地址用于即时渲染，编号用于资源依赖恢复。 */
  iconResourceKey?: string
  activeIconResourceKey?: string
  /** 仅兼容旧场景，界面不再提供字体图标选择。 */
  icon?: string
  /** 页签文字独立外观，缺失时由运行时回退到分页器全局默认值。 */
  fontFamily?: string
  fontSize?: number
  fontColor?: string
  fontWeight?: string | number
}

export interface PagePaginationOption {
  value: string
  pageSize: number
  backgroundImage: string
  /** 翻页箭头可选资源；地址用于即时渲染，编号用于资源依赖恢复。 */
  previousArrowUrl?: string
  nextArrowUrl?: string
  previousArrowResourceKey?: string
  nextArrowResourceKey?: string
  items: PagePaginationItem[]
  label: string
  imageWidth?: number
  imageHeight?: number
  imageTextGap?: number
  itemGap?: number
  fontSize?: number
  textColor?: string | null
  activeTextColor?: string | null
  labelFontFamily?: string
  labelFontSize?: number
  labelFontColor?: string | null
  labelFontWeight?: string | number
}

export const VPagePaginationInfo = {
  name: '页面分页器',
  keyName: 'VPagePagination',
  packageName: 'Widget',
  icon: new URL('./preview.svg', import.meta.url).href,
}

const defaultItems: PagePaginationItem[] = [
  {
    id: 'page-pagination-overview',
    label: '工厂总览',
    eventValue: 'factory-overview',
    ...PAGE_PAGINATION_SAMPLE_IMAGES.overview,
  },
  {
    id: 'page-pagination-process',
    label: '加工工序',
    eventValue: 'processing',
    ...PAGE_PAGINATION_SAMPLE_IMAGES.process,
  },
  {
    id: 'page-pagination-quality',
    label: '质检管控',
    eventValue: 'quality-control',
    ...PAGE_PAGINATION_SAMPLE_IMAGES.quality,
  },
  {
    id: 'page-pagination-equipment',
    label: '设备管理',
    eventValue: 'equipment',
    ...PAGE_PAGINATION_SAMPLE_IMAGES.equipment,
  },
]

export default class Config extends BaseConfig {
  /** 图文按钮使用画布内像素尺寸，由外层编辑器统一缩放。 */
  public attr = { l: 0, t: 0, w: 1064, h: 164, zIndex: -1 }
  public info = clone(VPagePaginationInfo)
  public option: PagePaginationOption = {
    value: defaultItems[0].eventValue,
    pageSize: 4,
    backgroundImage: '',
    previousArrowUrl: '',
    nextArrowUrl: '',
    // 按钮对象逐项复制，编辑一个分页器时不会污染其他实例的默认配置。
    items: defaultItems.map((item) => ({ ...item })),
    label: '页面分页器',
    ...PAGE_PAGINATION_APPEARANCE_DEFAULTS,
  }
}
