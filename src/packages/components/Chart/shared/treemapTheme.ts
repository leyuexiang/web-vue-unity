/**
 * 基础矩形树图的颜色序列。
 *
 * 颜色顺序按参考图从绿色平滑过渡到青蓝，再用亮绿色收尾；颜色保存在系列层而不是
 * 单个数据节点上，这样数据面板替换 series.data 后仍能保持同一视觉主题。
 */
export const treemapBasicColors = ['#48C66B', '#4BC48A', '#4DBFA7', '#4BB7BF', '#4C9FC2', '#62C447']

export const treemapGapColor = '#26362E'
export const treemapLabelColor = '#F5FFFA'

const treemapValueLabelPrefix = '{name|{b}}\n{value|{c}}'
const treemapRichLabelKeys = ['name', 'value', 'unit'] as const

type TreemapRichLabelStyle = {
  color?: string
  [key: string]: unknown
}

type TreemapEditableSeries = {
  label: {
    color: string
    rich?: Record<string, TreemapRichLabelStyle>
    [key: string]: unknown
  }
  itemStyle: {
    borderColor?: string
    [key: string]: unknown
  }
  levels?: Array<{
    itemStyle?: {
      borderColor?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }>
}

/**
 * 清理矩形树图单位中的富文本控制字符。
 * 单位会写入 ECharts 可序列化格式化字符串，过滤花括号、竖线和换行可避免用户输入破坏标签语法。
 */
export const normalizeTreemapValueUnit = (value: unknown) =>
  String(value ?? '')
    .replace(/[{}|\r\n]/g, '')
    .trim()
    .slice(0, 16)

/** 根据可配置单位生成可持久化的矩形树图标签格式，不使用保存后会丢失的函数。 */
export const createTreemapLabelFormatter = (unit: unknown) => {
  const normalizedUnit = normalizeTreemapValueUnit(unit)
  return normalizedUnit
    ? `${treemapValueLabelPrefix}{unit|${normalizedUnit}}`
    : treemapValueLabelPrefix
}

/** 从现有格式化字符串读取单位，兼容首次集成时已保存的“亩”标签。 */
export const extractTreemapValueUnit = (formatter: unknown) => {
  if (typeof formatter !== 'string') return ''
  return formatter.match(/\{unit\|([^{}|]*)\}$/)?.[1] ?? ''
}

/** 把基础矩形树图节点值收敛为官方示例使用的单数值结构，非法值统一回退为 0。 */
export const normalizeTreemapNodeValue = (value: unknown) => {
  if (Array.isArray(value)) return 0
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

/**
 * 读取矩形树图实际生效的标签颜色。
 * 富文本分段样式的优先级高于 label.color，因此优先读取名称分段，确保面板展示值与画布一致。
 */
export const getTreemapLabelColor = (series: TreemapEditableSeries) =>
  series.label.rich?.name?.color ?? series.label.color

/**
 * 同步标签基础色和全部富文本分段色。
 * 只修改 label.color 会被 rich.name/value/unit 覆盖，造成属性面板已变色但画布无变化。
 */
export const setTreemapLabelColor = (series: TreemapEditableSeries, color: string) => {
  series.label.color = color
  const rich = series.label.rich
  if (!rich) return

  treemapRichLabelKeys.forEach((key) => {
    if (rich[key]) rich[key].color = color
  })
}

/**
 * 读取首层节点实际使用的间隙颜色；未配置层级样式时退回系列级颜色。
 */
export const getTreemapGapColor = (series: TreemapEditableSeries) =>
  series.levels?.[0]?.itemStyle?.borderColor ?? series.itemStyle.borderColor ?? treemapGapColor

/**
 * 同步系列级和各层级的间隙颜色。
 * ECharts 会让 levels[].itemStyle 覆盖 series.itemStyle，二者必须一起更新才能兼容已保存配置。
 */
export const setTreemapGapColor = (series: TreemapEditableSeries, color: string) => {
  series.itemStyle.borderColor = color
  series.levels?.forEach((level) => {
    level.itemStyle ??= {}
    level.itemStyle.borderColor = color
  })
}

/**
 * 生成矩形树图的首层主题。
 *
 * 统一按数据索引映射颜色，避免数值变化导致同一业务项在刷新后随机换色；深色间隙与参考图一致，
 * 同时不额外设置外边框，保证宽扁组件中的有效绘制面积最大化。
 */
export const createBasicTreemapLevel = () => ({
  color: [...treemapBasicColors],
  colorMappingBy: 'index' as const,
  itemStyle: {
    borderColor: treemapGapColor,
    borderWidth: 0,
    gapWidth: 3,
  },
})
