import { cloneDeep } from 'lodash-es'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import { getChartPanelSchema } from '@/packages/components/Chart/shared/chartConfigMeta'
import { normalizeTreemapNodeValue } from '@/packages/components/Chart/shared/treemapTheme'
import {
  CHART_AUTO_MEASURE_FIELD_LIMIT,
  type ChartBindingRule,
  type ComponentDataConfig,
} from '@/types/data-config'
import { extractCategorySeriesValue } from './chartDataInference'
import { appLogger } from '@/utils/logger'
import { resolveChartMeasureTargetField } from './multiRequestProtocol'

export type ChartDatasetPayload = {
  dimensions: string[]
  source: Record<string, unknown>[]
  series: Array<Record<string, unknown>>
}

export type ChartRuntimeResolvedData = {
  dimensions: string[]
  source: Record<string, unknown>[]
  raw: unknown
}

const RADAR_SERIES_PALETTE = [
  { line: '#3B82F6', area: 'rgba(59, 130, 246, 0.18)' },
  { line: '#22D3EE', area: 'rgba(34, 211, 238, 0.14)' },
  { line: '#A855F7', area: 'rgba(168, 85, 247, 0.14)' },
  { line: '#F59E0B', area: 'rgba(245, 158, 11, 0.14)' },
  { line: '#10B981', area: 'rgba(16, 185, 129, 0.14)' },
  { line: '#F43F5E', area: 'rgba(244, 63, 94, 0.14)' },
]

const CATEGORY_SERIES_PALETTE = [
  { line: '#4F83FF', fill: 'rgba(79, 131, 255, 0.18)' },
  { line: '#47C0DE', fill: 'rgba(71, 192, 222, 0.18)' },
  { line: '#A855F7', fill: 'rgba(168, 85, 247, 0.18)' },
  { line: '#F59E0B', fill: 'rgba(245, 158, 11, 0.18)' },
  { line: '#10B981', fill: 'rgba(16, 185, 129, 0.18)' },
  { line: '#F43F5E', fill: 'rgba(244, 63, 94, 0.18)' },
]

const getRadarSeriesPalette = (index: number) => RADAR_SERIES_PALETTE[index % RADAR_SERIES_PALETTE.length]

const getCategorySeriesPalette = (index: number) =>
  CATEGORY_SERIES_PALETTE[index % CATEGORY_SERIES_PALETTE.length]

const truncateCategoryProductLabel = (value: unknown) => {
  const text = String(value ?? '')
  return text.length > 5 ? `${text.slice(0, 5)}...` : text
}

const applyCategoryProductLabelFormatter = (
  chartOption: Record<string, unknown>,
  isHorizontalBar: boolean,
  dimensionField: string,
) => {
  if (dimensionField !== 'product') return chartOption

  const axisKey = isHorizontalBar ? 'yAxis' : 'xAxis'
  const axisConfig = chartOption[axisKey]
  const axisList = Array.isArray(axisConfig) ? axisConfig : [axisConfig].filter(Boolean)

  axisList.forEach((axisItem) => {
    if (!axisItem || typeof axisItem !== 'object') return
    const axisRecord = axisItem as Record<string, unknown>
    if (axisRecord.type !== 'category') return

    axisRecord.axisLabel = {
      ...((axisRecord.axisLabel as Record<string, unknown> | undefined) || {}),
      formatter: (value: unknown) => truncateCategoryProductLabel(value),
    }
  })

  return chartOption
}

const applyExplicitValueAxisIntervalRules = (chartOption: Record<string, unknown>) => {
  const axisGroups = [
    ...(Array.isArray(chartOption.xAxis) ? chartOption.xAxis : [chartOption.xAxis].filter(Boolean)),
    ...(Array.isArray(chartOption.yAxis) ? chartOption.yAxis : [chartOption.yAxis].filter(Boolean)),
  ]

  axisGroups.forEach((axisItem) => {
    if (!axisItem || typeof axisItem !== 'object') return
    const axisRecord = axisItem as Record<string, unknown>
    if (axisRecord.type !== 'value') return

    const intervalValue = Number(axisRecord.interval)
    if (!Number.isFinite(intervalValue) || intervalValue <= 0) return

    const minValue = Number(axisRecord.min)
    const maxValue = Number(axisRecord.max)

    axisRecord.axisLabel = {
      ...((axisRecord.axisLabel as Record<string, unknown> | undefined) || {}),
      hideOverlap: false,
      showMinLabel: true,
      showMaxLabel: true,
    }

    if (Number.isFinite(minValue) && Number.isFinite(maxValue) && maxValue > minValue) {
      axisRecord.splitNumber = Math.max(1, Math.round((maxValue - minValue) / intervalValue))
    }
  })

  return chartOption
}

export const buildChartDataset = (
  chartRule: ChartBindingRule | undefined,
  rows: Record<string, unknown>[],
  options: {
    horizontalBar?: boolean
  } = {},
): ChartDatasetPayload => {
  if (!chartRule || rows.length === 0) {
    return {
      dimensions: [],
      source: [],
      series: [],
    }
  }

  const dimensions = [chartRule.dimensionField, ...chartRule.measureFields]
  const source = rows.map((row) => {
    const entry: Record<string, unknown> = {}
    dimensions.forEach((field) => {
      if (!(field in row)) {
        // 图表绑定缺字段时继续生成数据，缺失值交给图表默认空值处理。
        appLogger.warn('ChartRuntimeOptions', '图表绑定缺少来源字段', field)
      }

      if (chartRule.chartDataShape === 'category-value' && field !== chartRule.dimensionField) {
        entry[field] = extractCategorySeriesValue(row[field], row[chartRule.dimensionField])
        return
      }

      entry[field] = row[field]
    })
    return entry
  })

  const series =
    chartRule.chartDataShape === 'name-value'
      ? chartRule.measureFields.slice(0, 1).map((measureField) => ({
          encode: {
            itemName: chartRule.dimensionField,
            value: measureField,
          },
          name: measureField,
        }))
      : chartRule.measureFields.map((measureField) => ({
          encode: {
            x: options.horizontalBar ? measureField : chartRule.dimensionField,
            y: options.horizontalBar ? chartRule.dimensionField : measureField,
          },
          name: measureField,
        }))

  return {
    dimensions,
    source,
    series,
  }
}

export const applyChartData = (
  component: BaseWidgetConfig,
  datasetPayload: ChartDatasetPayload,
) => {
  if (!component?.dataConfig) return

  component.dataConfig.dataset.dimensions = datasetPayload.dimensions
  component.dataConfig.dataset.source = datasetPayload.source
}

const applyGaugeRuntimeOption = (
  chartOption: Record<string, unknown>,
  chartRule: ChartBindingRule,
  source: Record<string, unknown>[],
) => {
  if (!Array.isArray(chartOption.series) || source.length === 0) return chartOption

  chartOption.series = (chartOption.series as Array<Record<string, unknown>>).map((seriesItem, seriesIndex) => {
    const nextSeries = cloneDeep(seriesItem)
    const fallbackName = String(nextSeries.name || `gauge${seriesIndex + 1}`)
    const gaugeRows = source.length > 1 ? source : [source[0]]
    nextSeries.data = gaugeRows.map((row) => ({
      name: String(row[chartRule.dimensionField] || fallbackName),
      value: Number(row[chartRule.measureFields[0]] ?? 0),
    }))
    delete nextSeries.encode
    return nextSeries
  })

  delete chartOption.dataset
  return chartOption
}

const applyRadarRuntimeOption = (
  chartOption: Record<string, unknown>,
  chartRule: ChartBindingRule,
  source: Record<string, unknown>[],
) => {
  if (!Array.isArray(chartOption.series) || source.length === 0) return chartOption

  const oldIndicators = Array.isArray((chartOption.radar as Record<string, unknown> | undefined)?.indicator)
    ? (((chartOption.radar as Record<string, unknown>).indicator as Array<Record<string, unknown>>) || [])
    : []

  if (chartOption.radar && typeof chartOption.radar === 'object') {
    ;(chartOption.radar as Record<string, unknown>).indicator = source.map((row, index) => ({
      name: String(row[chartRule.dimensionField] || `indicator${index + 1}`),
      max: Number(oldIndicators[index]?.max ?? 100),
    }))
  }

  const baseSeries = cloneDeep((chartOption.series as Array<Record<string, unknown>>)[0] || {})
  const oldData = Array.isArray(baseSeries.data) ? (baseSeries.data as Array<Record<string, unknown>>) : []

  baseSeries.data = chartRule.measureFields.map((measureField, index) => {
    const previousItem = oldData[index] || {}
    const palette = getRadarSeriesPalette(index)
    return {
      ...previousItem,
      name: measureField,
      value: source.map((row) => Number(row[measureField] ?? 0)),
      lineStyle: {
        color: palette.line,
        ...((previousItem.lineStyle as Record<string, unknown> | undefined) || {}),
      },
      itemStyle: {
        color: palette.line,
        ...((previousItem.itemStyle as Record<string, unknown> | undefined) || {}),
      },
      areaStyle: {
        color: palette.area,
        ...((previousItem.areaStyle as Record<string, unknown> | undefined) || {}),
      },
    }
  })
  delete baseSeries.encode
  chartOption.series = [baseSeries]

  delete chartOption.dataset
  return chartOption
}

const applySankeyRuntimeOption = (
  chartOption: Record<string, unknown>,
  payload: unknown,
) => {
  if (!Array.isArray(chartOption.series)) return chartOption
  if (!payload || typeof payload !== 'object') return chartOption

  const nodes = Array.isArray((payload as Record<string, unknown>).nodes)
    ? (cloneDeep((payload as Record<string, unknown>).nodes) as unknown[])
    : []
  const links = Array.isArray((payload as Record<string, unknown>).links)
    ? (cloneDeep((payload as Record<string, unknown>).links) as unknown[])
    : []

  if (nodes.length === 0 && links.length === 0) return chartOption

  chartOption.series = (chartOption.series as Array<Record<string, unknown>>).map((seriesItem) => {
    const nextSeries = cloneDeep(seriesItem)
    nextSeries.data = nodes
    nextSeries.links = links
    delete nextSeries.encode
    return nextSeries
  })

  delete chartOption.dataset
  return chartOption
}

/**
 * 将统一 name/value 数据恢复为矩形树图原生节点。
 *
 * 矩形树图不走 dataset/encode：直接生成 series.data 能保留原生节点结构和层级扩展空间，
 * 同时系列级 levels、标签和间隙样式继续来自持久化的样式模板。
 */
const applyTreemapRuntimeOption = (
  chartOption: Record<string, unknown>,
  chartRule: ChartBindingRule,
  source: Record<string, unknown>[],
) => {
  if (!Array.isArray(chartOption.series) || source.length === 0) return chartOption

  const measureField = chartRule.measureFields[0]
  chartOption.series = (chartOption.series as Array<Record<string, unknown>>).map((seriesItem) => {
    const nextSeries = cloneDeep(seriesItem)
    nextSeries.data = source.map((row) => {
      return {
        name: String(row[chartRule.dimensionField] ?? ''),
        // 单个数值同时参与面积布局和标签展示，与 ECharts 官方基础节点结构保持一致。
        value: normalizeTreemapNodeValue(row[measureField]),
      }
    })
    delete nextSeries.encode
    return nextSeries
  })

  delete chartOption.dataset
  return chartOption
}

/**
 * 分类图使用对象数组 dataset.source 时，ECharts 的 `{c}` 代表整行对象，直接显示会得到
 * `[object Object]`。这里只改写克隆后的运行时系列，按当前系列对应的度量维度取值，避免
 * 污染组件持久化的样式模板。
 */
const rewriteCategoryDatasetLabelFormatter = (
  series: Record<string, unknown>,
  measureDimensionIndex: number,
) => {
  if (!series.label || typeof series.label !== 'object' || Array.isArray(series.label)) return

  const label = series.label as Record<string, unknown>
  if (typeof label.formatter !== 'string' || !label.formatter.includes('{c}')) return
//@ts-expect-error 动态属性访问，运行时类型安全
  label.formatter = label.formatter.replaceAll('{c}', `{@[${measureDimensionIndex}]}`)
}

const applyCategoryRuntimeOption = (
  chartOption: Record<string, unknown>,
  datasetPayload: ChartDatasetPayload,
  family: 'line' | 'bar',
  isAreaChart = false,
) => {
  const existingSeries = Array.isArray(chartOption.series)
    ? (chartOption.series as Array<Record<string, unknown>>)
    : []
  const templateSeries = cloneDeep(existingSeries[0] || { type: family })

  chartOption.series = datasetPayload.series.map((seriesMeta, index) => {
    const baseSeries =
      index < existingSeries.length ? cloneDeep(existingSeries[index]) : cloneDeep(templateSeries)
    const palette = getCategorySeriesPalette(index)

    delete baseSeries.data
    baseSeries.name = seriesMeta.name
    baseSeries.encode = seriesMeta.encode
    rewriteCategoryDatasetLabelFormatter(baseSeries, index + 1)
    baseSeries.type = baseSeries.type || family

    if (index >= existingSeries.length) {
      baseSeries.itemStyle = {
        ...((baseSeries.itemStyle as Record<string, unknown> | undefined) || {}),
        color: palette.line,
      }
      baseSeries.lineStyle = {
        ...((baseSeries.lineStyle as Record<string, unknown> | undefined) || {}),
        color: palette.line,
      }
      if (isAreaChart || baseSeries.areaStyle) {
        baseSeries.areaStyle = {
          ...((baseSeries.areaStyle as Record<string, unknown> | undefined) || {}),
          color: palette.fill,
        }
      }
    }

    return baseSeries
  })

  if (chartOption.legend && typeof chartOption.legend === 'object' && !Array.isArray(chartOption.legend)) {
    ;(chartOption.legend as Record<string, unknown>).data = datasetPayload.series
      .map((item) => item.name)
      .filter(Boolean)
  }

  return chartOption
}

const ensureRuntimeMeasureFields = (
  chartRule: ChartBindingRule,
  dimensions: string[],
  family: string,
) => {
  const runtimeChartRule = cloneDeep(chartRule)
  if (
    runtimeChartRule.chartDataShape !== 'category-value' ||
    (family !== 'line' && family !== 'bar') ||
    dimensions.length === 0
  ) {
    return runtimeChartRule
  }

  if (!runtimeChartRule.dimensionField || !dimensions.includes(runtimeChartRule.dimensionField)) {
    runtimeChartRule.dimensionField = dimensions[0] || runtimeChartRule.dimensionField
  }

  const candidateMeasureFields = dimensions.filter(
    (field) => field && field !== runtimeChartRule.dimensionField,
  )
  /**
   * 运行时先移除超范围的自动目标，再按图表总容量截断最终系列。
   * 人工自定义目标仍保存在配置和组件数据快照中，但不会突破图表只能消费两个系列的边界。
   * 这与面板自动映射上限共同生效，防止旧配置或原始数据集在预览时重新补出 data3。
   */
  const mergedMeasureFields = runtimeChartRule.measureFields
    .filter(
      (field, index) =>
        Boolean(field) && Boolean(resolveChartMeasureTargetField(runtimeChartRule, index)),
    )
    .slice(0, CHART_AUTO_MEASURE_FIELD_LIMIT)
  let measureCount = mergedMeasureFields.length
  candidateMeasureFields.forEach((field) => {
    if (
      measureCount < CHART_AUTO_MEASURE_FIELD_LIMIT &&
      !mergedMeasureFields.includes(field)
    ) {
      mergedMeasureFields.push(field)
      measureCount += 1
    }
  })
  runtimeChartRule.measureFields =
    mergedMeasureFields.length > 0 ? mergedMeasureFields : runtimeChartRule.measureFields
  runtimeChartRule.seriesMode = runtimeChartRule.measureFields.length > 1 ? 'multi' : 'single'
  return runtimeChartRule
}

export const buildChartRuntimeOption = (
  component: BaseWidgetConfig,
  baseOption: Record<string, unknown>,
  dataConfig: ComponentDataConfig,
  chartRule: ChartBindingRule,
  runtimeResolved: ChartRuntimeResolvedData,
) => {
  const chartOption = cloneDeep((baseOption.chartOption as Record<string, unknown> | undefined) || {})
  const chartSchema = getChartPanelSchema(component.info.keyName)
  const runtimeChartRule = ensureRuntimeMeasureFields(
    chartRule,
    Array.isArray(dataConfig.dataset.dimensions) ? dataConfig.dataset.dimensions : [],
    chartSchema.family,
  )
  const datasetPayload = buildChartDataset(runtimeChartRule, dataConfig.dataset.source || [], {
    horizontalBar: Boolean(chartSchema.flags.horizontalBar),
  })

  if (chartSchema.family === 'gauge') {
    return {
      ...baseOption,
      chartOption: applyGaugeRuntimeOption(chartOption, runtimeChartRule, dataConfig.dataset.source || []),
    }
  }

  if (chartSchema.family === 'radar') {
    return {
      ...baseOption,
      chartOption: applyRadarRuntimeOption(chartOption, runtimeChartRule, dataConfig.dataset.source || []),
    }
  }

  if (chartSchema.family === 'sankey') {
    return {
      ...baseOption,
      chartOption: applySankeyRuntimeOption(chartOption, runtimeResolved.raw),
    }
  }

  if (chartSchema.family === 'treemap') {
    return {
      ...baseOption,
      chartOption: applyTreemapRuntimeOption(
        chartOption,
        runtimeChartRule,
        dataConfig.dataset.source || [],
      ),
    }
  }

  if (datasetPayload.source.length === 0) return baseOption

  chartOption.dataset = {
    dimensions: datasetPayload.dimensions,
    source: datasetPayload.source,
  }

  if (runtimeChartRule.chartDataShape === 'category-value' && chartOption.xAxis && !Array.isArray(chartOption.xAxis)) {
    delete (chartOption.xAxis as Record<string, unknown>).data
  }

  if (runtimeChartRule.chartDataShape === 'category-value' && chartOption.yAxis && !Array.isArray(chartOption.yAxis)) {
    delete (chartOption.yAxis as Record<string, unknown>).data
  }

  if (chartSchema.family === 'line' || chartSchema.family === 'bar') {
    applyCategoryProductLabelFormatter(
      chartOption,
      Boolean(chartSchema.flags.horizontalBar),
      runtimeChartRule.dimensionField,
    )
    applyExplicitValueAxisIntervalRules(chartOption)

    return {
      ...baseOption,
      chartOption: applyCategoryRuntimeOption(
        chartOption,
        datasetPayload,
        chartSchema.family,
        Boolean(chartSchema.flags.area),
      ),
    }
  }

  if (Array.isArray(chartOption.series)) {
    chartOption.series = chartOption.series.map((series, index) => {
      const nextSeries = cloneDeep(series) as Record<string, unknown>
      delete nextSeries.data
      const encode = datasetPayload.series[index]?.encode || datasetPayload.series[0]?.encode
      if (encode) {
        nextSeries.encode = encode
      }
      if (datasetPayload.series[index]?.name) {
        nextSeries.name = datasetPayload.series[index].name
      }
      return nextSeries
    })
  }

  return {
    ...baseOption,
    chartOption,
  }
}
