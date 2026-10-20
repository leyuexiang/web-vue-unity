import { cloneDeep } from 'lodash-es'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import { getChartPanelSchema } from '@/packages/components/Chart/shared/chartConfigMeta'
import { normalizeTreemapNodeValue } from '@/packages/components/Chart/shared/treemapTheme'
import {
  type ChartBindingRule,
  type ComponentDataConfig,
  createEmptyDataConfig,
  isChartBindingRule,
} from '@/types/data-config'

type ChartDatasetRows = {
  dimensions: string[]
  source: Record<string, unknown>[]
  measureFields: string[]
}

type NormalizedChartEditorPayload = {
  dimensions: string[]
  source: Record<string, unknown>[]
  binding: ChartBindingRule | null
}

/**
 * 读取分类图单个数据点在当前分类行对应的真实数值。
 *
 * ECharts 分类图常见数据格式并不只有纯数值，还可能是：
 * - `['Mon', 33]`
 * - `{ value: 33 }`
 * - `{ value: ['Mon', 33] }`
 *
 * 正负柱状图默认就使用了 `[分类, 数值]` 元组。
 * 如果这里直接把整组数组写进 measure 字段，后续再经过统一 dataset 映射，
 * 柱体数值就会变成数组，最终只剩背景柱、不剩真正的进度柱。
 */
export const extractCategorySeriesValue = (datum: unknown, categoryName: unknown) => {
  if (Array.isArray(datum)) {
    if (datum.length === 0) return null
    if (datum.length === 1) return datum[0]

    // 优先识别 `[分类, 数值]` 结构，命中后只返回当前行真正需要的数值部分。
    if (datum[0] === categoryName) {
      return datum[1]
    }

    // 其余元组结构保守兜底为最后一项，避免继续把整段数组落进 measure 字段。
    return datum[datum.length - 1]
  }

  if (datum && typeof datum === 'object' && 'value' in (datum as Record<string, unknown>)) {
    const value = (datum as Record<string, unknown>).value
    if (Array.isArray(value)) {
      if (value.length === 0) return null
      if (value.length === 1) return value[0]
      if (value[0] === categoryName) {
        return value[1]
      }
      return value[value.length - 1]
    }
    return value
  }

  return datum
}

/**
 * 把分类轴与多系列 `series.data` 推导成统一二维表结构。
 *
 * 这一步是图表数据面板、运行时映射和旧配置升级的共同基础，
 * 单独抽离后可以避免同一套解包逻辑在多个入口重复维护。
 */
const inferCategorySeriesRows = (
  categoryAxisData: unknown[],
  series: Array<Record<string, unknown>>,
  dimensionField = 'product',
): ChartDatasetRows => {
  const measureFields = series.map((_, index) => `data${index + 1}`)
  const source = categoryAxisData.map((name, rowIndex) => {
    const row: Record<string, unknown> = { [dimensionField]: name }
    series.forEach((serie, seriesIndex) => {
      const data = Array.isArray(serie.data) ? serie.data : []
      /**
       * 分类图推导时统一把 ECharts 原始 data 项解包成单值，
       * 这样右侧“数据内容”编辑后再保存，运行时拿到的仍然是合法数值列。
       */
      row[`data${seriesIndex + 1}`] = extractCategorySeriesValue(data[rowIndex], name)
    })
    return row
  })

  return {
    dimensions: [dimensionField, ...measureFields],
    source,
    measureFields,
  }
}

/**
 * 从图表配置中读取分类轴数据。
 *
 * 分类图既可能挂在 `xAxis.data`，也可能是横向条形图挂在 `yAxis.data`，
 * 所以这里统一封装成一个可复用入口。
 */
const getAxisCategoryData = (
  chartOption: Record<string, unknown>,
  axisKey: 'xAxis' | 'yAxis',
): unknown[] => {
  const axis = chartOption[axisKey] as Record<string, unknown> | undefined
  return Array.isArray(axis?.data) ? (axis.data as unknown[]) || [] : []
}

/**
 * 生成图表绑定规则。
 *
 * 图表模块里大量地方都要基于维度字段和度量字段拼同一套绑定结构，
 * 统一工厂后可以避免后续新增图表家族时到处复制粘贴。
 */
const createChartBindingRule = (
  dimensionField: string,
  measureFields: string[],
  chartDataShape: ChartBindingRule['chartDataShape'],
  targetDimensionField = dimensionField,
  targetMeasureFields = measureFields,
): ChartBindingRule => ({
  kind: 'chart',
  // 推导组件默认数据时同时固化目标字段，后续切换接口只替换来源字段。
  targetDimensionField,
  targetMeasureFields: [...targetMeasureFields],
  // 从组件模板推导出的度量字段都是必要字段，右侧面板只允许修改来源映射。
  targetMeasureFieldOrigins: targetMeasureFields.map(() => 'inferred'),
  dimensionField,
  measureFields,
  seriesMode: measureFields.length > 1 ? 'multi' : 'single',
  chartDataShape,
  useDataset: true,
})

/**
 * 为右侧“数据内容”区域提供当前图表真实展示数据的快照。
 * 这里优先保证“展示准确”，不强行把所有图表都塞进统一绑定协议。
 */
export const inferChartPreviewContentFromComponent = (component: BaseWidgetConfig) => {
  if (component.info.packageName !== 'Chart') return null

  const chartSchema = getChartPanelSchema(component.info.keyName)
  const chartOption = cloneDeep(
    (component.option as Record<string, unknown>)?.chartOption || {},
  ) as Record<string, unknown>

  if (chartOption.dataset) {
    return cloneDeep(chartOption.dataset)
  }

  const series = Array.isArray(chartOption.series)
    ? (chartOption.series as Array<Record<string, unknown>>)
    : []
  const xAxisData = getAxisCategoryData(chartOption, 'xAxis')
  const yAxisData = getAxisCategoryData(chartOption, 'yAxis')

  if (xAxisData.length > 0 && series.length > 0) {
    const inferred = inferCategorySeriesRows(xAxisData, series)
    return {
      dimensions: inferred.dimensions,
      source: inferred.source,
    }
  }

  // 横向柱状图的分类维度在 yAxis.data 上。
  if (yAxisData.length > 0 && series.length > 0) {
    const inferred = inferCategorySeriesRows(yAxisData, series)
    return {
      dimensions: inferred.dimensions,
      source: inferred.source,
    }
  }

  const firstSeries = series[0]
  const pieSeriesData = Array.isArray(firstSeries?.data) ? firstSeries.data : []
  const isNameValueSeries =
    pieSeriesData.length > 0 &&
    pieSeriesData.every(
      (item) =>
        Boolean(item) &&
        typeof item === 'object' &&
        'name' in (item as Record<string, unknown>) &&
        'value' in (item as Record<string, unknown>),
    )

  if (isNameValueSeries) {
    if (chartSchema.family === 'treemap') {
      return {
        dimensions: ['name', 'value'],
        source: pieSeriesData.map((item) => ({
          name: (item as Record<string, unknown>).name,
          value: normalizeTreemapNodeValue((item as Record<string, unknown>).value),
        })),
      }
    }

    return {
      dimensions: ['product', 'data1'],
      source: pieSeriesData.map((item) => ({
        product: (item as Record<string, unknown>).name,
        data1: (item as Record<string, unknown>).value,
      })),
    }
  }

  // 雷达图真实展示的是“指标项 × 系列值”的矩阵。
  const radar = chartOption.radar as Record<string, unknown> | undefined
  const radarIndicator = Array.isArray(radar?.indicator)
    ? (radar.indicator as Array<Record<string, unknown>>)
    : []
  const radarSeriesData = Array.isArray(firstSeries?.data)
    ? (firstSeries.data as Array<Record<string, unknown>>)
    : []
  if (radarIndicator.length > 0 && radarSeriesData.length > 0) {
    const measureFields = radarSeriesData.map((item, index) =>
      String(item.name || `data${index + 1}`),
    )
    const source = radarIndicator.map((indicatorItem, indicatorIndex) => {
      const row: Record<string, unknown> = {
        indicator: indicatorItem.name || `indicator${indicatorIndex + 1}`,
      }
      radarSeriesData.forEach((seriesItem, seriesIndex) => {
        const values = Array.isArray(seriesItem.value) ? seriesItem.value : []
        row[measureFields[seriesIndex]] = values[indicatorIndex]
      })
      return row
    })
    return {
      dimensions: ['indicator', ...measureFields],
      source,
    }
  }

  // 仪表盘只保留当前展示值，避免右侧内容空白。
  if (String(firstSeries?.type || '') === 'gauge') {
    const gaugeData = Array.isArray(firstSeries?.data) ? firstSeries.data : []
    return {
      dimensions: ['name', 'value'],
      source: gaugeData.map((item, index) => ({
        name:
          (item as Record<string, unknown>)?.name ||
          String(firstSeries?.name || `gauge${index + 1}`),
        value: (item as Record<string, unknown>)?.value ?? 0,
      })),
    }
  }

  // 桑基图无法映射成简单二维表，这里直接展示 nodes / links 原始结构。
  if (String(firstSeries?.type || '') === 'sankey') {
    return {
      nodes: cloneDeep((firstSeries?.data as unknown[]) || []),
      links: cloneDeep((firstSeries?.links as unknown[]) || []),
    }
  }

  // 兜底：尽量把 series 的原始展示数据给到右侧面板，避免出现“暂无数据”。
  if (series.length > 0) {
    return {
      series: series.map((item, index) => ({
        name: item.name || `series${index + 1}`,
        type: item.type,
        data: cloneDeep(item.data),
      })),
    }
  }

  return null
}

/**
 * 把图表内部统一协议里的 `dataset.source` 转回右侧“数据内容”更适合直接编辑的结构。
 * 这里的目标不是强行统一所有图表，而是尽量让右侧 JSON 长得像图表当前真正消费的数据。
 * 这样用户修改后，后续再归一化回内部协议时不会出现结构完全错位。
 */
export const buildChartEditorContent = (
  component: BaseWidgetConfig,
  dataConfig?: ComponentDataConfig | null,
) => {
  const chartSchema = getChartPanelSchema(component.info.keyName)
  const chartRule = dataConfig?.bindings.find(isChartBindingRule)
  const source = Array.isArray(dataConfig?.dataset.source) ? dataConfig?.dataset.source || [] : []
  const staticRequestData =
    dataConfig?.request.type === 'static'
      ? (dataConfig.request.config as { data?: unknown } | undefined)?.data
      : undefined

  // 仪表盘右侧直接暴露 name/value 列表，和 ECharts gauge.data 结构保持一致。
  if (chartSchema.family === 'gauge' && chartRule && source.length > 0) {
    const measureField = chartRule.measureFields[0]
    return source.map((row, index) => ({
      name: String(row[chartRule.dimensionField] || `gauge${index + 1}`),
      value: Number(row[measureField] ?? 0),
    }))
  }

  /**
   * 雷达图右侧编辑区展示“系列数组”更直观：
   * [
   *   { "name": "团队 A", "value": [68, 52, ...] },
   *   { "name": "团队 B", "value": [90, 79, ...] }
   * ]
   * 运行时再把这份结构归一化回内部矩阵。
   */
  if (chartSchema.family === 'radar' && chartRule && source.length > 0) {
    /**
     * 兼容早期错误保存成“系列行”的旧数据：
     * [
     *   { product: '团队 A', data1: [68, 52, ...] },
     *   { product: '团队 B', data1: [90, 79, ...] }
     * ]
     * 这里先把它恢复成右侧可编辑的系列数组，用户重新保存后会被归一化回标准矩阵。
     */
    const firstMeasureField = chartRule.measureFields[0]
    const looksLikeLegacySeriesRows =
      Boolean(firstMeasureField) && source.some((row) => Array.isArray(row[firstMeasureField]))

    if (looksLikeLegacySeriesRows && firstMeasureField) {
      return source.map((row, index) => ({
        name: String(row[chartRule.dimensionField] || `series${index + 1}`),
        value: Array.isArray(row[firstMeasureField])
          ? (row[firstMeasureField] as unknown[]).map((item) => Number(item ?? 0))
          : [],
      }))
    }

    return chartRule.measureFields.map((measureField) => ({
      name: measureField,
      value: source.map((row) => Number(row[measureField] ?? 0)),
    }))
  }

  // 饼环图和矩形树图都直接消费 name/value 节点，右侧统一展示最自然的节点列表结构。
  if (
    (chartSchema.family === 'pie' || chartSchema.family === 'treemap') &&
    chartRule &&
    source.length > 0
  ) {
    const measureField = chartRule.measureFields[0]
    return source.map((row) => ({
      name: row[chartRule.dimensionField],
      value: row[measureField],
    }))
  }

  // 桑基图右侧优先直接展示 nodes/links 原始结构，避免内部二维表协议把结构抹平。
  if (
    chartSchema.family === 'sankey' &&
    staticRequestData &&
    typeof staticRequestData === 'object' &&
    Array.isArray((staticRequestData as Record<string, unknown>).nodes) &&
    Array.isArray((staticRequestData as Record<string, unknown>).links)
  ) {
    return cloneDeep(staticRequestData)
  }

  // 普通分类图继续展示二维行数据，便于直接编辑字段映射。
  if (source.length > 0) {
    /**
     * 兼容已经被旧逻辑污染过的分类图静态数据。
     * 旧数据里 measure 字段可能仍是 `['Mon', 33]` 这种元组；
     * 这里在右侧“数据内容”回显前先修正成单值，避免用户继续基于脏结构编辑。
     */
    if (
      chartRule &&
      chartRule.chartDataShape === 'category-value' &&
      (chartSchema.family === 'line' || chartSchema.family === 'bar')
    ) {
      return cloneDeep(source).map((row) => {
        const nextRow = { ...row }
        chartRule.measureFields.forEach((measureField) => {
          nextRow[measureField] = extractCategorySeriesValue(
            row[measureField],
            row[chartRule.dimensionField],
          )
        })
        return nextRow
      })
    }

    return cloneDeep(source)
  }

  return inferChartPreviewContentFromComponent(component)
}

/**
 * 把右侧静态 JSON 编辑区的内容归一化成内部统一协议使用的二维行数据。
 * 右侧允许按图表“更自然”的结构编辑，但运行时仍消费统一的 `dataset.source`。
 */
export const normalizeStaticChartEditorPayload = (
  component: BaseWidgetConfig,
  payload: unknown,
  normalizeRows: (
    payload: unknown,
    resultPath?: string,
  ) => { dimensions: string[]; source: Record<string, unknown>[] },
  currentConfig?: ComponentDataConfig | null,
): NormalizedChartEditorPayload => {
  const chartSchema = getChartPanelSchema(component.info.keyName)
  const chartRule = currentConfig?.bindings.find(isChartBindingRule)

  if (chartSchema.family === 'treemap') {
    const normalized = normalizeRows(payload)
    return {
      dimensions: ['name', 'value'],
      source: normalized.source.map((row) => ({
        name: row.name ?? '',
        value: normalizeTreemapNodeValue(row.value),
      })),
      // 静态编辑后必须同步更新来源字段，不能继续沿用首次集成时错误生成的 product/data1。
      binding: createChartBindingRule('name', ['value'], 'name-value'),
    }
  }

  if (chartSchema.family === 'gauge') {
    const rows = Array.isArray(payload)
      ? payload.filter((item): item is Record<string, unknown> =>
          Boolean(item && typeof item === 'object'),
        )
      : Array.isArray((payload as { source?: unknown } | null | undefined)?.source)
        ? ((payload as { source: unknown[] }).source.filter(
            (item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'),
          ) as Record<string, unknown>[])
        : []

    return {
      dimensions: ['name', 'value'],
      source: rows.map((row, index) => ({
        name: String(row.name || row.label || `gauge${index + 1}`),
        value: Number(row.value ?? 0),
      })),
      binding: createChartBindingRule('name', ['value'], 'name-value'),
    }
  }

  if (chartSchema.family === 'radar') {
    const radarSeries = Array.isArray(payload)
      ? payload.filter((item): item is Record<string, unknown> =>
          Boolean(item && typeof item === 'object'),
        )
      : []
    const chartOption = (component.option as Record<string, unknown>)?.chartOption as
      | Record<string, unknown>
      | undefined
    const radar = chartOption?.radar as Record<string, unknown> | undefined
    const indicatorList = Array.isArray(radar?.indicator)
      ? (radar.indicator as Array<Record<string, unknown>>)
      : []
    const indicatorNames = indicatorList.map((item, index) =>
      String(item.name || `indicator${index + 1}`),
    )
    const valueLists = radarSeries.map((item) => (Array.isArray(item.value) ? item.value : []))
    const maxValueLength = valueLists.reduce(
      (max, item) => Math.max(max, item.length),
      indicatorNames.length,
    )
    const finalIndicatorNames =
      indicatorNames.length >= maxValueLength
        ? indicatorNames.slice(0, maxValueLength)
        : [
            ...indicatorNames,
            ...Array.from(
              { length: maxValueLength - indicatorNames.length },
              (_, index) => `indicator${indicatorNames.length + index + 1}`,
            ),
          ]

    const measureFields = radarSeries.map((item, index) => String(item.name || `data${index + 1}`))
    const source = finalIndicatorNames.map((indicatorName, indicatorIndex) => {
      const row: Record<string, unknown> = { indicator: indicatorName }
      radarSeries.forEach((seriesItem, seriesIndex) => {
        const value = Array.isArray(seriesItem.value) ? seriesItem.value[indicatorIndex] : 0
        row[measureFields[seriesIndex]] = Number(value ?? 0)
      })
      return row
    })

    return {
      dimensions: ['indicator', ...measureFields],
      source,
      binding: createChartBindingRule('indicator', measureFields, 'category-value'),
    }
  }

  const normalized = normalizeRows(payload)
  return {
    dimensions: normalized.dimensions,
    source: normalized.source,
    binding: chartRule || null,
  }
}

/**
 * 从当前图表组件的 chartOption 里反推一份可编辑的数据协议。
 * 这里的作用不是替代用户显式配置，而是保证首次打开“数据”面板时，
 * 右侧能直接展示当前图表实际正在使用的数据结构和默认映射。
 */
export const inferChartDataConfigFromComponent = (
  component: BaseWidgetConfig,
  normalizeRows: (
    payload: unknown,
    resultPath?: string,
  ) => { dimensions: string[]; source: Record<string, unknown>[] },
): ComponentDataConfig | null => {
  if (component.info.packageName !== 'Chart') return null

  const chartOption = cloneDeep(
    (component.option as Record<string, unknown>)?.chartOption || {},
  ) as Record<string, unknown>
  const chartSchema = getChartPanelSchema(component.info.keyName)
  const config = createEmptyDataConfig()
  const xAxisData = getAxisCategoryData(chartOption, 'xAxis')
  const yAxisData = getAxisCategoryData(chartOption, 'yAxis')
  const series = Array.isArray(chartOption.series)
    ? (chartOption.series as Array<Record<string, unknown>>)
    : []

  if (xAxisData.length > 0 && series.length > 0) {
    const inferred = inferCategorySeriesRows(xAxisData, series)
    config.dataset.dimensions = inferred.dimensions
    config.dataset.source = inferred.source
    config.request.config = { data: inferred.source }
    config.bindings = [createChartBindingRule('product', inferred.measureFields, 'category-value')]
    return config
  }

  if (yAxisData.length > 0 && series.length > 0) {
    const inferred = inferCategorySeriesRows(yAxisData, series)
    config.dataset.dimensions = inferred.dimensions
    config.dataset.source = inferred.source
    config.request.config = { data: inferred.source }
    config.bindings = [createChartBindingRule('product', inferred.measureFields, 'category-value')]
    return config
  }

  const firstSeries = series[0]
  const pieSeriesData = Array.isArray(firstSeries?.data) ? firstSeries.data : []
  const isNameValueSeries =
    pieSeriesData.length > 0 &&
    pieSeriesData.every(
      (item) =>
        Boolean(item) &&
        typeof item === 'object' &&
        'name' in (item as Record<string, unknown>) &&
        'value' in (item as Record<string, unknown>),
    )

  if (isNameValueSeries) {
    if (chartSchema.family === 'treemap') {
      const source = pieSeriesData.map((item) => ({
        name: (item as Record<string, unknown>).name,
        value: normalizeTreemapNodeValue((item as Record<string, unknown>).value),
      }))
      config.dataset.dimensions = ['name', 'value']
      config.dataset.source = source
      config.request.config = { data: source }
      config.bindings = [createChartBindingRule('name', ['value'], 'name-value')]
      return config
    }

    const source = pieSeriesData.map((item) => ({
      product: (item as Record<string, unknown>).name,
      data1: (item as Record<string, unknown>).value,
    }))
    config.dataset.dimensions = ['product', 'data1']
    config.dataset.source = source
    config.request.config = { data: source }
    config.bindings = [
      createChartBindingRule('product', ['data1'], 'name-value', 'name', ['value']),
    ]
    return config
  }

  // 仪表盘首版直接按 name/value 识别，避免落到通用分类图兜底里。
  if (chartSchema.family === 'gauge') {
    const gaugePreview = buildChartEditorContent(component, config)
    const source = Array.isArray(gaugePreview)
      ? gaugePreview.map((item) => ({
          name: (item as Record<string, unknown>).name,
          value: (item as Record<string, unknown>).value,
        }))
      : []
    config.dataset.dimensions = ['name', 'value']
    config.dataset.source = source
    config.request.config = { data: gaugePreview }
    config.bindings = [createChartBindingRule('name', ['value'], 'name-value')]
    return config
  }

  // 雷达图首版按“指标行 + 多系列值”的内部矩阵存储，但右侧内容展示为系列数组。
  if (chartSchema.family === 'radar') {
    const radarPreview = buildChartEditorContent(component, config)
    const normalizedRadar = normalizeStaticChartEditorPayload(
      component,
      radarPreview,
      normalizeRows,
      config,
    )
    config.dataset.dimensions = normalizedRadar.dimensions
    config.dataset.source = normalizedRadar.source
    config.request.config = { data: radarPreview }
    config.bindings = normalizedRadar.binding ? [normalizedRadar.binding] : []
    return config
  }

  const radarPreview = inferChartPreviewContentFromComponent(component) as {
    dimensions?: string[]
    source?: Record<string, unknown>[]
  } | null
  if (radarPreview?.dimensions?.length && radarPreview?.source?.length) {
    const [dimensionField, ...measureFields] = radarPreview.dimensions
    config.dataset.dimensions = radarPreview.dimensions
    config.dataset.source = radarPreview.source
    config.request.config = { data: radarPreview.source }
    config.bindings = [createChartBindingRule(dimensionField, measureFields, 'category-value')]
    return config
  }

  return config
}
