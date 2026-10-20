import { computed, ref, watch } from 'vue'
import { cloneDeep, isArray, merge } from 'lodash-es'
import { getChartPanelSchema } from './chartConfigMeta'
import {
  mergeChartStyleOption,
  normalizeChartAxisRangeFields,
  sanitizeChartStyleOption,
} from './chartStyleOption'
import type {
  ChartAxisOption,
  ChartGridOption,
  ChartLegendOption,
  ChartOptionRecord,
  ChartGaugeSeriesOption,
  ChartPieSeriesOption,
  ChartRadarOption,
  ChartSeriesOption,
  ChartTreemapSeriesOption,
  ChartTitleOption,
  PanelChartOption,
} from './chartConfigTypes'

export type { PanelChartOption } from './chartConfigTypes'

export type PanelOptionModel = {
  label?: string
  chartOption?: PanelChartOption
}

type GenericChartConfigPanelEmit = {
  (e: 'update:option', value: PanelOptionModel): void
}

/**
 * 通用图表配置面板的默认值注入、结构兜底和双向同步逻辑统一下沉到组合函数。
 *
 * 这样 SFC 可以专注模板拆分，脚本逻辑也能被系列子面板复用，
 * 后续再拆轴配置、图例配置时不需要继续在单文件里搬运这批默认值工具。
 */
export const useGenericChartConfigPanel = (
  props: { option: PanelOptionModel; chartKey: string },
  emit: GenericChartConfigPanelEmit,
) => {
  const optionModel = computed(() => props.option)
  const schema = computed(() => getChartPanelSchema(props.chartKey))
  const seriesSectionName = computed(() => `series-${schema.value.family}`)
  const activeSections = ref<string[]>([])
  const isSectionActive = (name: string) => activeSections.value.includes(name)

  /**
   * 图表进入属性面板时默认展开“标题”分组，与 Figma 的首屏示例保持一致；
   * 仅在图表类型切换且当前没有用户展开状态时初始化，不会覆盖用户主动折叠后的选择。
   */
  watch(
    () => schema.value.supports.title,
    (supportsTitle) => {
      if (supportsTitle && activeSections.value.length === 0) {
        activeSections.value = ['title']
      }
    },
    { immediate: true },
  )
  let isApplyingDefaults = false
  let isNormalizingAxisRange = false

  /**
   * 将外部图表配置收窄成可写对象。
   * ECharts 允许大量未知扩展字段，这里只排除数组和非对象，具体可编辑字段再由下方片段类型兜底。
   */
  const toChartOptionRecord = (value: unknown): PanelChartOption =>
    value && typeof value === 'object' && !isArray(value) ? (value as PanelChartOption) : {}

  const toChartOptionRecordList = (value: unknown): PanelChartOption[] =>
    isArray(value)
      ? value
          .filter(
            (item): item is PanelChartOption =>
              !!item && typeof item === 'object' && !isArray(item),
          )
          .map((item) => item as PanelChartOption)
      : []

  const chartOption = computed<PanelChartOption>(() => {
    if (!props.option.chartOption || typeof props.option.chartOption !== 'object') {
      props.option.chartOption = {}
    }
    return props.option.chartOption
  })

  const chartOptionModel = computed({
    get: () => sanitizeChartStyleOption(chartOption.value),
    set: (value: PanelChartOption) => {
      props.option.chartOption = mergeChartStyleOption(chartOption.value, value)
      emit('update:option', props.option)
    },
  })

  const defaultTitle = (): ChartTitleOption => ({
    show: false,
    text: '',
    subtext: '',
    left: 'center',
    textStyle: { color: '#000000', fontSize: 18 },
    subtextStyle: { color: '#666666', fontSize: 12 },
  })

  const defaultGrid = (): ChartGridOption => ({
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
    containLabel: true,
  })

  const createDefaultAxis = (type: 'x' | 'y'): ChartAxisOption => ({
    show: true,
    type:
      schema.value.flags.horizontalBar && type === 'x'
        ? 'value'
        : schema.value.flags.horizontalBar && type === 'y'
          ? 'category'
          : type === 'x'
            ? 'category'
            : 'value',
    name: '',
    position: type === 'x' ? 'bottom' : 'left',
    nameGap: 15,
    nameTextStyle: { color: '#000000', fontSize: 12 },
    axisLabel: { show: true, color: '#000000', fontSize: 12, position: 'outside', rotate: 0 },
    axisLine: {
      show: true,
      onZero: true,
      lineStyle: { color: 'rgba(0,0,0,0.35)', width: 1 },
    },
    axisTick: { show: false, length: 6 },
    splitLine: {
      show: type === 'y',
      lineStyle: { color: 'rgba(0,0,0,0.12)', width: 1, type: 'solid' },
    },
  })

  const defaultLegend = (): ChartLegendOption => ({
    show: true,
    left: 'left',
    top: 0,
    orient: 'horizontal',
    icon: 'circle',
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: '#000000', fontSize: 12 },
  })

  /**
   * 系列配置模板会按图表家族读取不同字段，基础默认值保证传入子面板的系列对象具备稳定结构。
   * 这样模板不需要到处做空值判断，也避免继续依赖显式任意类型放开深层访问。
   */
  const createBaseSeries = (type: string): ChartSeriesOption => ({
    type,
    smooth: false,
    symbolSize: 6,
    lineStyle: { width: 2, type: 'solid', color: '#3B82F6' },
    itemStyle: { color: '#3B82F6', borderRadius: 0 },
    label: { show: false, color: '#000000', fontSize: 12, position: 'top' },
    areaStyle: { color: 'rgba(59,130,246,0.18)', opacity: 1 },
    barWidth: '',
    barMaxWidth: '',
    stack: '',
    showBackground: false,
    backgroundStyle: { color: 'rgba(0,0,0,0.08)' },
    radius: ['0%', '70%'],
    center: ['50%', '50%'],
    startAngle: 90,
    roseType: false,
    labelLine: { show: true, length: 16, length2: 20 },
    min: 0,
    max: 100,
    splitNumber: 5,
    endAngle: -45,
    axisLine: { lineStyle: { width: 10, color: [[1, 'rgba(59,130,246,0.18)']] } },
    progress: { show: false, width: 10, itemStyle: { color: '#3B82F6' } },
    pointer: { width: 4, length: '55%', itemStyle: { color: '#3B82F6' } },
    anchor: { show: false, size: 10, itemStyle: { color: '#3B82F6' } },
    detail: { fontSize: 18, color: '#000000' },
    nodeWidth: 18,
    nodeGap: 18,
    left: '4%',
    top: '6%',
    right: '4%',
    bottom: '6%',
  })

  const defaultLineSeries = (): ChartSeriesOption =>
    merge({}, createBaseSeries('line'), {
      itemStyle: { color: '#3B82F6' },
    }) as ChartSeriesOption

  const defaultBarSeries = (): ChartSeriesOption => createBaseSeries('bar')

  const defaultPieSeries = (): ChartPieSeriesOption =>
    merge({}, createBaseSeries('pie'), {
      label: { show: true, color: '#FFFFFF', fontSize: 12, position: 'outside' },
    }) as ChartPieSeriesOption

  const defaultGaugeSeries = (): ChartGaugeSeriesOption =>
    merge({}, createBaseSeries('gauge'), {
      startAngle: 225,
      radius: '95%',
    }) as ChartGaugeSeriesOption

  const defaultRadar = (): ChartRadarOption => ({
    center: ['50%', '50%'],
    radius: '65%',
    shape: 'polygon',
    splitNumber: 5,
    axisName: { color: '#000000', fontSize: 12 },
    axisLine: { lineStyle: { color: 'rgba(0,0,0,0.25)', width: 1 } },
    splitLine: { lineStyle: { color: 'rgba(0,0,0,0.18)', width: 1 } },
    splitArea: { areaStyle: { color: ['transparent'] } },
  })

  const defaultRadarSeries = (): ChartSeriesOption => ({
    ...createBaseSeries('radar'),
    symbol: 'circle',
  })

  const defaultSankeySeries = (): ChartSeriesOption =>
    merge({}, createBaseSeries('sankey'), {
      lineStyle: { opacity: 0.35, curveness: 0.5 },
      label: { color: '#000000', fontSize: 12 },
    }) as ChartSeriesOption

  /**
   * 矩形树图只补充属性面板需要的稳定结构，不覆盖组件配置中的颜色数组、富文本或示例数据。
   * 这样首次展开面板不会破坏参考图样式，保存数据配置后也仍能把该对象作为纯样式模板复用。
   */
  const defaultTreemapSeries = (): ChartTreemapSeriesOption =>
    merge({}, createBaseSeries('treemap'), {
      sort: false,
      roam: false,
      nodeClick: false,
      visibleMin: 1,
      squareRatio: 1.618,
      breadcrumb: { show: false },
      upperLabel: { show: false, color: '#FFFFFF', fontSize: 12, position: 'inside' },
      label: { show: true, color: '#FFFFFF', fontSize: 18, position: 'insideTopLeft' },
      itemStyle: { borderColor: '#26362E', borderWidth: 0, gapWidth: 3 },
      levels: [],
    }) as ChartTreemapSeriesOption

  const mergeSection = <T extends ChartOptionRecord>(current: unknown, defaults: T): T =>
    merge({}, defaults, cloneDeep(toChartOptionRecord(current))) as T

  /**
   * 标题是 ECharts 中少数允许“单对象/数组”两种形态的面板分组。
   * 数组必须逐项合并默认字段并保持数组形态；直接交给 toChartOptionRecord 会把数组当成空对象，
   * 触发标题面板时就会覆盖原有的多个标题配置。
   */
  const mergeTitleSection = (current: unknown): ChartTitleOption | ChartTitleOption[] => {
    const defaults = defaultTitle()
    if (isArray(current)) {
      return current.map((item) => mergeSection(item, defaults))
    }

    return mergeSection(current, defaults)
  }

  const withDefaultsGuard = (updater: () => void) => {
    isApplyingDefaults = true
    updater()
    queueMicrotask(() => {
      isApplyingDefaults = false
    })
  }

  const ensureAxisDefaults = (axis: 'x' | 'y') => {
    const axisKey = axis === 'x' ? 'xAxis' : 'yAxis'
    const createDefaults = createDefaultAxis(axis)
    const axisValue = chartOption.value[axisKey]

    if (isArray(axisValue)) {
      chartOption.value[axisKey] = toChartOptionRecordList(axisValue).map((item) =>
        mergeSection(item, createDefaults),
      )
      return
    }

    if (axis === 'y' && schema.value.flags.multiYAxis) {
      chartOption.value.yAxis = [
        mergeSection(chartOption.value.yAxis, createDefaults),
        mergeSection(undefined, createDefaults),
      ]
      return
    }

    chartOption.value[axisKey] = mergeSection(chartOption.value[axisKey], createDefaults)
  }

  const ensureSeriesDefaults = () => {
    if (!isArray(chartOption.value.series)) {
      chartOption.value.series = []
    }

    const seriesList = toChartOptionRecordList(chartOption.value.series)

    if (schema.value.family === 'line') {
      chartOption.value.series = seriesList.map((item) => mergeSection(item, defaultLineSeries()))
    } else if (schema.value.family === 'bar') {
      chartOption.value.series = seriesList.map((item) => mergeSection(item, defaultBarSeries()))
    } else if (schema.value.family === 'pie') {
      chartOption.value.series[0] = mergeSection(chartOption.value.series[0], defaultPieSeries())
    } else if (schema.value.family === 'gauge') {
      chartOption.value.series[0] = mergeSection(chartOption.value.series[0], defaultGaugeSeries())
    } else if (schema.value.family === 'radar') {
      chartOption.value.radar = mergeSection(chartOption.value.radar, defaultRadar())
      chartOption.value.series[0] = mergeSection(chartOption.value.series[0], defaultRadarSeries())
    } else if (schema.value.family === 'sankey') {
      chartOption.value.series[0] = mergeSection(chartOption.value.series[0], defaultSankeySeries())
    } else if (schema.value.family === 'treemap') {
      chartOption.value.series[0] = mergeSection(
        chartOption.value.series[0],
        defaultTreemapSeries(),
      )
    }
  }

  /**
   * 样式面板允许用户把坐标轴最小值、最大值和间隔清空。
   * 清空后必须删除字段，避免 ECharts 把空字符串当成有效范围并把默认数据压成空图。
   */
  const normalizeAxisRangeForCurrentOption = () => {
    const normalized = normalizeChartAxisRangeFields(chartOption.value)
    if (normalized === chartOption.value) return false

    isNormalizingAxisRange = true
    props.option.chartOption = normalized
    queueMicrotask(() => {
      isNormalizingAxisRange = false
    })
    return true
  }

  const ensureSectionDefaults = (sectionName: string) => {
    withDefaultsGuard(() => {
      switch (sectionName) {
        case 'title':
          if (schema.value.supports.title)
            chartOption.value.title = mergeTitleSection(chartOption.value.title)
          break
        case 'grid':
          if (schema.value.supports.grid)
            chartOption.value.grid = mergeSection(chartOption.value.grid, defaultGrid())
          break
        case 'legend':
          if (schema.value.supports.legend)
            chartOption.value.legend = mergeSection(chartOption.value.legend, defaultLegend())
          break
        case 'xAxis':
          if (schema.value.supports.xAxis) ensureAxisDefaults('x')
          break
        case 'yAxis':
          if (schema.value.supports.yAxis) ensureAxisDefaults('y')
          break
        case 'radar':
          if (schema.value.supports.radar)
            chartOption.value.radar = mergeSection(chartOption.value.radar, defaultRadar())
          break
        case 'advanced':
          break
        default:
          if (sectionName === seriesSectionName.value) ensureSeriesDefaults()
          break
      }
      normalizeAxisRangeForCurrentOption()
    })
  }

  const ensureDefaultsForActiveSections = () => {
    activeSections.value.forEach((sectionName) => ensureSectionDefaults(sectionName))
  }

  watch(() => props.chartKey, ensureDefaultsForActiveSections, { immediate: true })
  watch(() => props.option, ensureDefaultsForActiveSections, { immediate: true })
  watch(() => activeSections.value.slice(), ensureDefaultsForActiveSections, { immediate: true })
  watch(
    () => props.option,
    (value) => {
      if (isApplyingDefaults || isNormalizingAxisRange) return
      normalizeAxisRangeForCurrentOption()
      emit('update:option', value)
    },
    { deep: true },
  )

  const title = computed<ChartTitleOption>(() => {
    const currentTitle = chartOption.value.title
    // 属性面板当前编辑第一个标题项；其余数组项仍保留在 chartOption 中供 ECharts 渲染。
    if (isArray(currentTitle)) return currentTitle[0] ?? defaultTitle()
    return currentTitle ?? defaultTitle()
  })
  const grid = computed<ChartGridOption>(() => chartOption.value.grid ?? defaultGrid())
  const legend = computed<ChartLegendOption>(() => chartOption.value.legend ?? defaultLegend())
  const radar = computed<ChartRadarOption>(() => chartOption.value.radar ?? defaultRadar())

  const xAxes = computed<ChartAxisOption[]>(() =>
    isArray(chartOption.value.xAxis)
      ? chartOption.value.xAxis
      : [chartOption.value.xAxis].filter((item): item is ChartAxisOption => !!item),
  )
  const yAxes = computed<ChartAxisOption[]>(() =>
    isArray(chartOption.value.yAxis)
      ? chartOption.value.yAxis
      : [chartOption.value.yAxis].filter((item): item is ChartAxisOption => !!item),
  )
  const lineSeries = computed<ChartSeriesOption[]>(
    () => toChartOptionRecordList(chartOption.value.series) as ChartSeriesOption[],
  )
  const barSeries = computed<ChartSeriesOption[]>(
    () => toChartOptionRecordList(chartOption.value.series) as ChartSeriesOption[],
  )
  const pieSeries = computed<ChartPieSeriesOption>(
    () => (chartOption.value.series?.[0] as ChartPieSeriesOption | undefined) ?? defaultPieSeries(),
  )
  const gaugeSeries = computed<ChartGaugeSeriesOption>(
    () =>
      (chartOption.value.series?.[0] as ChartGaugeSeriesOption | undefined) ?? defaultGaugeSeries(),
  )
  const radarSeries = computed<ChartSeriesOption>(
    () => chartOption.value.series?.[0] ?? defaultRadarSeries(),
  )
  const sankeySeries = computed<ChartSeriesOption>(
    () => chartOption.value.series?.[0] ?? defaultSankeySeries(),
  )
  const treemapSeries = computed<ChartTreemapSeriesOption>(
    () =>
      (chartOption.value.series?.[0] as ChartTreemapSeriesOption | undefined) ??
      defaultTreemapSeries(),
  )

  const isColorEditable = (value: unknown) => value == null || typeof value === 'string'

  const seriesTitle = (seriesItem: ChartSeriesOption, index: number) =>
    seriesItem.name || `${schema.value.seriesLabel}-${index + 1}`

  const borderRadiusTextModel = (seriesItem: ChartSeriesOption) =>
    computed({
      get: () => {
        const value = seriesItem.itemStyle?.borderRadius
        return isArray(value) ? value.join(',') : `${value ?? 0}`
      },
      set: (value: string) => {
        const normalized = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => Number(item))
        if (!normalized.length) {
          seriesItem.itemStyle.borderRadius = 0
        } else if (normalized.length === 1) {
          seriesItem.itemStyle.borderRadius = normalized[0]
        } else {
          seriesItem.itemStyle.borderRadius = normalized
        }
      },
    })

  const pieRadiusModel = {
    inner: computed({
      get: () => (isArray(pieSeries.value.radius) ? pieSeries.value.radius[0] : '0%'),
      set: (value: string) => {
        const outer = isArray(pieSeries.value.radius)
          ? pieSeries.value.radius[1]
          : pieSeries.value.radius
        pieSeries.value.radius = [value, outer || '70%']
      },
    }),
    outer: computed({
      get: () =>
        isArray(pieSeries.value.radius) ? pieSeries.value.radius[1] : pieSeries.value.radius,
      set: (value: string) => {
        const inner = isArray(pieSeries.value.radius) ? pieSeries.value.radius[0] : '0%'
        pieSeries.value.radius = [inner || '0%', value]
      },
    }),
  }

  const pieCenterModel = {
    x: computed({
      get: () => pieSeries.value.center?.[0] ?? '50%',
      set: (value: string) => {
        pieSeries.value.center = [value, pieSeries.value.center?.[1] ?? '50%']
      },
    }),
    y: computed({
      get: () => pieSeries.value.center?.[1] ?? '50%',
      set: (value: string) => {
        pieSeries.value.center = [pieSeries.value.center?.[0] ?? '50%', value]
      },
    }),
  }

  const gaugeRadiusValue = computed(() =>
    isArray(gaugeSeries.value.radius) ? '95%' : gaugeSeries.value.radius,
  )
  const setGaugeRadius = (value: string | number) => {
    gaugeSeries.value.radius = value
  }

  return {
    optionModel,
    schema,
    seriesSectionName,
    activeSections,
    isSectionActive,
    chartOptionModel,
    title,
    grid,
    legend,
    radar,
    xAxes,
    yAxes,
    lineSeries,
    barSeries,
    pieSeries,
    gaugeSeries,
    radarSeries,
    sankeySeries,
    treemapSeries,
    isColorEditable,
    seriesTitle,
    borderRadiusTextModel,
    pieRadiusModel,
    pieCenterModel,
    gaugeRadiusValue,
    setGaugeRadius,
  }
}
