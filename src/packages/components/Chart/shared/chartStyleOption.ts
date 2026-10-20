import { cloneDeep, isArray, merge } from 'lodash-es'
import type { ChartOptionRecord, PanelChartOption } from './chartConfigTypes'

const AXIS_RANGE_KEYS = ['min', 'max', 'interval'] as const
const AXIS_KEYS = ['xAxis', 'yAxis'] as const
const SERIES_DATA_KEYS = ['data', 'links', 'nodes', 'edges', 'encode'] as const

const isChartOptionRecord = (value: unknown): value is ChartOptionRecord =>
  !!value && typeof value === 'object' && !isArray(value)

/**
 * 统一坐标轴范围字段的存储类型：空字符串删除，有限数字字符串迁移为 number。
 * 非数字字符串可能是 ECharts 支持的 `dataMin`、`dataMax` 等高级值，因此原样保留，避免破坏旧配置。
 */
const normalizeAxisRangeRecord = (axis: ChartOptionRecord) => {
  let nextAxis: ChartOptionRecord | null = null

  AXIS_RANGE_KEYS.forEach((key) => {
    const value = axis[key]
    if (typeof value !== 'string') return

    const trimmedValue = value.trim()
    if (trimmedValue === '') {
      nextAxis ||= { ...axis }
      delete nextAxis[key]
      return
    }

    const numericValue = Number(trimmedValue)
    if (!Number.isFinite(numericValue)) return
    nextAxis ||= { ...axis }
    nextAxis[key] = numericValue
  })

  return nextAxis ? { value: nextAxis, changed: true } : { value: axis, changed: false }
}

const normalizeAxisRangeValue = (axisValue: unknown) => {
  if (isArray(axisValue)) {
    let changed = false
    const nextAxisList = axisValue.map((axisItem) => {
      if (!isChartOptionRecord(axisItem)) return axisItem
      const normalized = normalizeAxisRangeRecord(axisItem)
      changed ||= normalized.changed
      return normalized.value
    })

    return changed ? { value: nextAxisList, changed } : { value: axisValue, changed: false }
  }

  if (!isChartOptionRecord(axisValue)) {
    return { value: axisValue, changed: false }
  }

  return normalizeAxisRangeRecord(axisValue)
}

/**
 * 清理坐标轴范围里的空字符串并迁移历史数字字符串，不触碰 `axis.data`。
 * 这个函数用于普通样式面板输入过程，保证用户展开 X/Y 轴或清空范围时不会误删默认数据。
 */
export const normalizeChartAxisRangeFields = <T extends ChartOptionRecord>(option: T): T => {
  if (!isChartOptionRecord(option)) return option

  let nextOption: ChartOptionRecord | null = null

  AXIS_KEYS.forEach((axisKey) => {
    const normalized = normalizeAxisRangeValue(option[axisKey])
    if (!normalized.changed) return
    nextOption ||= { ...option }
    nextOption[axisKey] = normalized.value
  })

  return (nextOption || option) as T
}

const stripAxisDataFields = (axisValue: unknown): unknown => {
  if (isArray(axisValue)) {
    return axisValue.map(stripAxisDataFields)
  }

  if (!isChartOptionRecord(axisValue)) return axisValue

  const nextAxis = { ...axisValue }
  delete nextAxis.data

  return normalizeAxisRangeRecord(nextAxis).value
}

const stripLegendDataFields = (legendValue: unknown): unknown => {
  if (isArray(legendValue)) {
    return legendValue.map(stripLegendDataFields)
  }

  if (!isChartOptionRecord(legendValue)) return legendValue

  const nextLegend = { ...legendValue }
  delete nextLegend.data
  return nextLegend
}

const stripRadarDataFields = (radarValue: unknown): unknown => {
  if (isArray(radarValue)) {
    return radarValue.map(stripRadarDataFields)
  }

  if (!isChartOptionRecord(radarValue)) return radarValue

  const nextRadar = { ...radarValue }
  delete nextRadar.indicator
  return nextRadar
}

const stripSeriesDataFields = (seriesValue: unknown): unknown => {
  if (isArray(seriesValue)) {
    return seriesValue.map(stripSeriesDataFields)
  }

  if (!isChartOptionRecord(seriesValue)) return seriesValue

  const nextSeries = { ...seriesValue }
  SERIES_DATA_KEYS.forEach((key) => {
    delete nextSeries[key]
  })

  return nextSeries
}

/**
 * 从完整 ECharts 配置中剥离真实数据字段，只留下可由基础面板维护的样式模板。
 *
 * 业务边界：
 * - `chartOption` 只保存标题、轴、图例、系列视觉效果等样式；
 * - 分类图、饼环图、矩形树图、雷达图、桑基图等真实数据统一交给 `dataConfig`；
 * - 默认图表配置仍可携带示例数据，调用方只有在需要“样式视图”或保存数据配置后才执行清洗。
 */
export const stripChartDataFields = (option: unknown): PanelChartOption => {
  const sourceOption = isChartOptionRecord(option) ? cloneDeep(option) : {}
  const nextOption = sourceOption as PanelChartOption

  delete nextOption.dataset

  if ('xAxis' in nextOption) {
    nextOption.xAxis = stripAxisDataFields(nextOption.xAxis) as PanelChartOption['xAxis']
  }
  if ('yAxis' in nextOption) {
    nextOption.yAxis = stripAxisDataFields(nextOption.yAxis) as PanelChartOption['yAxis']
  }
  if ('legend' in nextOption) {
    nextOption.legend = stripLegendDataFields(nextOption.legend) as PanelChartOption['legend']
  }
  if ('radar' in nextOption) {
    nextOption.radar = stripRadarDataFields(nextOption.radar) as PanelChartOption['radar']
  }
  if ('series' in nextOption) {
    nextOption.series = stripSeriesDataFields(nextOption.series) as PanelChartOption['series']
  }

  return normalizeChartAxisRangeFields(nextOption)
}

/**
 * 输出一份干净的图表样式配置。
 * 该函数不修改入参，适合用于“样式 JSON”展示、数据配置保存后的模板清洗和单元测试断言。
 */
export const sanitizeChartStyleOption = (option: unknown): PanelChartOption =>
  stripChartDataFields(option)

const extractAxisDataFields = (axisValue: unknown): unknown => {
  if (isArray(axisValue)) {
    const nextAxisList = axisValue.map(extractAxisDataFields)
    return nextAxisList.some(isChartOptionRecord) ? nextAxisList : undefined
  }

  if (!isChartOptionRecord(axisValue) || !('data' in axisValue)) return undefined

  return {
    data: cloneDeep(axisValue.data),
  }
}

const extractLegendDataFields = (legendValue: unknown): unknown => {
  if (isArray(legendValue)) {
    const nextLegendList = legendValue.map(extractLegendDataFields)
    return nextLegendList.some(isChartOptionRecord) ? nextLegendList : undefined
  }

  if (!isChartOptionRecord(legendValue) || !('data' in legendValue)) return undefined

  return {
    data: cloneDeep(legendValue.data),
  }
}

const extractSeriesDataFields = (seriesValue: unknown): unknown => {
  if (isArray(seriesValue)) {
    const nextSeriesList = seriesValue.map(extractSeriesDataFields)
    return nextSeriesList.some(isChartOptionRecord) ? nextSeriesList : undefined
  }

  if (!isChartOptionRecord(seriesValue)) return undefined

  const nextSeries: ChartOptionRecord = {}
  SERIES_DATA_KEYS.forEach((key) => {
    if (key in seriesValue) {
      nextSeries[key] = cloneDeep(seriesValue[key])
    }
  })

  return Object.keys(nextSeries).length > 0 ? nextSeries : undefined
}

const extractChartDataFields = (option: unknown): PanelChartOption => {
  if (!isChartOptionRecord(option)) return {}

  const dataFields: PanelChartOption = {}

  if ('dataset' in option) {
    dataFields.dataset = cloneDeep(option.dataset)
  }

  const xAxisData = extractAxisDataFields(option.xAxis)
  if (xAxisData) {
    dataFields.xAxis = xAxisData as PanelChartOption['xAxis']
  }

  const yAxisData = extractAxisDataFields(option.yAxis)
  if (yAxisData) {
    dataFields.yAxis = yAxisData as PanelChartOption['yAxis']
  }

  const legendData = extractLegendDataFields(option.legend)
  if (legendData) {
    dataFields.legend = legendData as PanelChartOption['legend']
  }

  if (isChartOptionRecord(option.radar) && 'indicator' in option.radar) {
    dataFields.radar = {
      indicator: cloneDeep(option.radar.indicator),
    } as PanelChartOption['radar']
  }

  const seriesData = extractSeriesDataFields(option.series)
  if (seriesData) {
    dataFields.series = seriesData as PanelChartOption['series']
  }

  return dataFields
}

/**
 * 将“样式 JSON”的保存结果合并回当前图表配置。
 *
 * 合并策略：
 * - 新 JSON 中的数据字段先被剥离，因此用户无法通过样式 JSON 改真实数据；
 * - 当前配置里已有的示例数据会被原样带回，保证未建立 `dataConfig` 的新拖入图表不会因为编辑样式而空白；
 * - 一旦数据面板保存了 `dataConfig`，保存链路会直接执行 `sanitizeChartStyleOption()`，此后 `chartOption` 固定为样式模板。
 */
export const mergeChartStyleOption = (
  currentOption: unknown,
  styleOption: unknown,
): PanelChartOption => {
  const nextStyleOption = sanitizeChartStyleOption(styleOption)
  const currentDataFields = extractChartDataFields(currentOption)
  return normalizeChartAxisRangeFields(
    merge({}, currentDataFields, nextStyleOption) as PanelChartOption,
  )
}
