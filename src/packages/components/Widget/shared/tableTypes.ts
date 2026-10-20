export type TableAlign = 'left' | 'center' | 'right'
export type TableCarousel = 'single' | 'page'
export type TableToggle = 'on' | 'off'
export type TableCellValue = string | number | boolean | null | undefined

/**
 * tablePlus 的三种迁移预设。
 * 源项目通过同一个 tablePlus 图元和不同配置组合出这三种表格，
 * 当前项目保留为独立部件，便于在资源面板中直接拖入和配置。
 */
export type TablePlusVariant = 'zebra' | 'scroll' | 'pagination'

export interface TableListDataItem {
  name: string
  value: number | string
}

export interface TableListOption {
  /** 独立文字区域的可选字体；旧配置缺失时保留原来的继承样式。 */
  indexFontFamily?: string
  leftFontFamily?: string
  rightFontFamily?: string
  dataset: TableListDataItem[]
  rowNum: number
  waitTime: number
  unit: string
  sort: boolean
  color: string
  textColor: string
  borderColor: string
  carousel: TableCarousel
  indexFontSize: number
  leftFontSize: number
  rightFontSize: number
  label: string
  visible?: boolean
}

export interface TableScrollBoardOption {
  /** 独立文字区域的可选字体；旧配置缺失时保留原来的继承样式。 */
  headerFontFamily?: string
  bodyFontFamily?: string
  indexFontFamily?: string
  header: string[]
  dataset: TableCellValue[][]
  index: boolean
  columnWidth: number[]
  align: TableAlign[]
  rowNum: number
  waitTime: number
  headerHeight: number
  carousel: TableCarousel
  headerBGC: string
  oddRowBGC: string
  evenRowBGC: string
  label: string
  visible?: boolean
}

export interface TableBasicColumn {
  title: string
  key: string
}

export interface TableBasicRow {
  key: string | number
  [key: string]: TableCellValue
}

export interface TableBasicOption {
  /** 独立文字区域的可选字体；旧配置缺失时保留原来的继承样式。 */
  headerFontFamily?: string
  bodyFontFamily?: string
  searchFontFamily?: string
  paginationFontFamily?: string
  dataset: {
    dimensions: TableBasicColumn[]
    source: TableBasicRow[]
  }
  pagination: {
    page: number
    pageSize: number
  }
  align: TableAlign
  style: {
    border: TableToggle
    singleColumn: TableToggle
    singleLine: TableToggle
    bottomBordered: TableToggle
    striped: TableToggle
    fontSize: number
    borderWidth: number
    borderColor: string
    borderStyle: string
  }
  inputShow: 'none' | 'flex'
  label: string
  visible?: boolean
}

export interface TablePlusLinkParameter {
  /** URL 查询参数名，例如 id、mode。 */
  name: string
  /** 当前行中提供参数值的数据字段。 */
  valueKey: string
}

export interface TablePlusLinkConfig {
  /** 所有行共用的固定地址，也作为行地址字段为空时的回退。 */
  baseUrl?: string
  /** 当前行中提供完整或相对 URL 的字段，用于每行跳转不同页面。 */
  urlKey?: string
  /** 查询参数与行数据字段的映射；空数组表示不追加查询参数。 */
  params?: TablePlusLinkParameter[]
  /** 兼容旧场景的单参数来源字段，新配置使用 params。 */
  valueKey?: string
  /** 兼容旧场景的单参数名，新配置使用 params。 */
  queryParam?: string
  text?: string
  target?: '_self' | '_blank'
}

export interface TablePlusColumn extends TableBasicColumn {
  /** 可选固定列宽，缺省时由表格按剩余空间平均分配。 */
  width?: number
  /** 操作列链接使用静态声明替代源项目可执行的 columns.fnJs。 */
  link?: TablePlusLinkConfig
}

export interface TablePlusStyle {
  /** 是否绘制表头。 */
  colHeaders: boolean
  /** 是否绘制最外层边框。 */
  bordered: boolean
  /** 是否绘制水平分隔线。 */
  hLine: boolean
  /** 是否绘制垂直分隔线。 */
  vLine: boolean
  /** 是否绘制交替行背景。 */
  stripe: boolean
  /** 交替行背景色，沿用源 tablePlus 默认值。 */
  stripeColor: string
  background: string
  headerBackground: string
  textColor: string
  headerTextColor: string
  borderColor: string
  fontSize: number
}

export interface TablePlusPagination {
  page: number
  pageSize: number
  pageSizeOptions: number[]
  maxPageBtn: number
  /** total 允许大于当前 dataset，用于服务端分页场景。 */
  total?: number
}

export interface TablePlusOption {
  variant: TablePlusVariant
  dataset: {
    dimensions: TablePlusColumn[]
    source: TableBasicRow[]
  }
  align: TableAlign
  rowHeight: number
  colWidth: number
  maxNum?: number
  swiper: boolean
  waitTime: number
  carousel: TableCarousel
  style: TablePlusStyle
  pagination?: TablePlusPagination
  /** 源项目 columns.fnJs 的安全静态替代，用于状态文字着色。 */
  cellTextColors?: Record<string, Record<string, string>>
  label: string
  visible?: boolean
}
