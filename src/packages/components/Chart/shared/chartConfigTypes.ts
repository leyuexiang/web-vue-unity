export type ChartFamily = 'line' | 'bar' | 'pie' | 'gauge' | 'radar' | 'sankey' | 'treemap'

/**
 * 图表配置值的基础类型。
 * 这里单独拆出来，是为了让共享配置面板摆脱显式任意类型，
 * 同时保留 ECharts 配置项“键不固定、值可嵌套”的动态结构。
 */
export type ChartOptionPrimitive = string | number | boolean | null | undefined

/**
 * 图表配置对象。
 * 采用递归定义，既能表达嵌套对象，也能表达数组配置，
 * 适合承载标题、坐标轴、系列等不同结构的配置块。
 */
export type ChartOptionValue = ChartOptionPrimitive | ChartOptionRecord | ChartOptionValue[]

/**
 * 通用图表配置记录。
 * 面板内部所有“按键访问”的配置项都统一落到这个类型上，
 * 这样既能通过静态检查，也方便后续继续细化具体字段类型。
 */
export interface ChartOptionRecord {
  [key: string]: unknown
}

export type ChartRangePair = [string | number, string | number]

export type ChartColorStops = Array<[number, string]>

export interface ChartTextStyleRecord {
  color: string
  fontSize: number
  [key: string]: unknown
}

export interface ChartLineStyleRecord {
  color?: string
  width: number
  type?: string
  opacity?: number
  curveness?: number
  [key: string]: unknown
}

export interface ChartItemStyleRecord {
  color?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number | number[]
  gapWidth?: number
  [key: string]: unknown
}

export interface ChartGaugeAxisLineStyleRecord {
  width: number
  color?: ChartColorStops
  [key: string]: unknown
}

export interface ChartLabelRecord {
  show: boolean
  color: string
  fontSize: number
  position: string
  [key: string]: unknown
}

export interface ChartTitleOption extends ChartOptionRecord {
  show: boolean
  text: string
  subtext: string
  left: string
  textStyle: ChartTextStyleRecord
  subtextStyle: ChartTextStyleRecord
}

export interface ChartGridOption extends ChartOptionRecord {
  top: string | number
  right: string | number
  bottom: string | number
  left: string | number
  containLabel: boolean
}

export interface ChartLegendOption extends ChartOptionRecord {
  show: boolean
  left: string | number
  top: string | number
  orient: string
  icon: string
  itemWidth: number
  itemHeight: number
  textStyle: ChartTextStyleRecord
}

export interface ChartAxisOption extends ChartOptionRecord {
  show: boolean
  type: string
  name: string
  position: string
  /** 基础面板只维护数值范围；ECharts 的函数或特殊字符串仍可通过高级配置表达。 */
  min?: number
  max?: number
  interval?: number
  nameGap: number
  nameTextStyle: ChartTextStyleRecord
  axisLabel: ChartLabelRecord & { rotate: number }
  axisLine: {
    show: boolean
    onZero: boolean
    lineStyle: ChartLineStyleRecord
    [key: string]: unknown
  }
  axisTick: {
    show: boolean
    length: number
    [key: string]: unknown
  }
  splitLine: {
    show: boolean
    lineStyle: ChartLineStyleRecord
    [key: string]: unknown
  }
}

export interface ChartRadarOption extends ChartOptionRecord {
  center: ChartRangePair
  radius: string | number
  shape: string
  splitNumber: number
  indicator?: ChartOptionRecord[]
  axisName: ChartTextStyleRecord
  axisLine: {
    lineStyle: ChartLineStyleRecord
    [key: string]: unknown
  }
  splitLine: {
    lineStyle: ChartLineStyleRecord
    [key: string]: unknown
  }
  splitArea: {
    areaStyle: {
      color: string[]
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}

export interface ChartSeriesOption extends ChartOptionRecord {
  type: string
  name?: string
  smooth: boolean
  symbol?: string
  symbolSize: number
  lineStyle: ChartLineStyleRecord
  itemStyle: ChartItemStyleRecord
  label: ChartLabelRecord
  areaStyle: {
    color?: string
    opacity: number
    [key: string]: unknown
  }
  barWidth: string | number
  barMaxWidth: string | number
  stack: string
  showBackground: boolean
  backgroundStyle: {
    color?: string
    [key: string]: unknown
  }
  radius: string | number | ChartRangePair
  center: ChartRangePair
  startAngle: number
  roseType: false | 'radius' | 'area'
  labelLine: {
    show: boolean
    length: number
    length2: number
    [key: string]: unknown
  }
  min: number
  max: number
  splitNumber: number
  endAngle: number
  axisLine: {
    lineStyle: ChartGaugeAxisLineStyleRecord
    [key: string]: unknown
  }
  progress: {
    show: boolean
    width: number
    itemStyle: ChartItemStyleRecord
    [key: string]: unknown
  }
  pointer: {
    width: number
    length: string | number
    itemStyle: ChartItemStyleRecord
    [key: string]: unknown
  }
  anchor: {
    show: boolean
    size: number
    itemStyle: ChartItemStyleRecord
    [key: string]: unknown
  }
  detail: ChartTextStyleRecord
  data?: ChartSeriesDataItem[]
  nodeWidth: number
  nodeGap: number
  top: string | number
  right: string | number
  bottom: string | number
  left: string | number
}

export interface ChartSeriesDataItem extends ChartOptionRecord {
  name?: string
  value?: number | string | number[] | string[]
  lineStyle: ChartLineStyleRecord
  itemStyle: ChartItemStyleRecord
  areaStyle: {
    color?: string
    opacity?: number
    [key: string]: unknown
  }
}

export interface ChartPieSeriesOption extends ChartSeriesOption {
  radius: string | number | ChartRangePair
}

export type ChartGaugeSeriesOption = ChartSeriesOption

/**
 * 矩形树图系列在通用系列字段之外使用独立的布局和交互属性。
 * 把面板会直接编辑的字段显式建模，避免新增图表族后退回无类型的深层属性访问。
 */
export interface ChartTreemapSeriesOption extends ChartSeriesOption {
  sort: boolean | 'asc' | 'desc'
  roam: boolean | string
  nodeClick: 'zoomToNode' | 'link' | false
  visibleMin: number
  squareRatio: number
  breadcrumb: {
    show: boolean
    [key: string]: unknown
  }
  upperLabel: ChartLabelRecord
  levels: ChartOptionRecord[]
}

export interface PanelChartOption extends ChartOptionRecord {
  /**
   * ECharts 的标题既可以是单个配置对象，也可以是多个标题配置数组；
   * 面板默认值合并必须保留调用方原有的数据形态，避免打开面板时丢失副标题块。
   */
  title?: ChartTitleOption | ChartTitleOption[]
  grid?: ChartGridOption
  legend?: ChartLegendOption
  xAxis?: ChartAxisOption | ChartAxisOption[]
  yAxis?: ChartAxisOption | ChartAxisOption[]
  radar?: ChartRadarOption
  series?: ChartSeriesOption[]
}

export interface ChartPanelSupports {
  title: boolean
  grid: boolean
  legend: boolean
  xAxis: boolean
  yAxis: boolean
  visualMap: boolean
  radar: boolean
}

export interface ChartPanelFlags {
  area?: boolean
  horizontalBar?: boolean
  multiYAxis?: boolean
  pieLike?: boolean
  gaugeLike?: boolean
  sankeyLike?: boolean
  treemapLike?: boolean
}

export interface ChartPanelSchema {
  chartKey: string
  family: ChartFamily
  seriesLabel: string
  supports: ChartPanelSupports
  flags: ChartPanelFlags
}
