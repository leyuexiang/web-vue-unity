import { describe, expect, it } from 'vitest'
import * as echarts from 'echarts'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import { createEmptyDataConfig, createDataConfigRequestItem } from '@/types/data-config'
import type { ChartBindingRule, ComponentDataConfig } from '@/types/data-config'
import { buildChartRuntimeOption } from '../chartRuntimeOptions'
import { buildWidgetRuntimeOption } from '../index'

const createStaticChartDataConfig = (
  dimensions: string[],
  source: Record<string, unknown>[],
  rule: ChartBindingRule,
): ComponentDataConfig => {
  const dataConfig = createEmptyDataConfig()
  dataConfig.dataset.dimensions = dimensions
  dataConfig.dataset.source = source
  dataConfig.request.config = {
    data: source,
  }
  dataConfig.bindings = [rule]
  return dataConfig
}

const createChartComponent = (
  keyName: string,
  chartOption: Record<string, unknown>,
  dataConfig: ComponentDataConfig,
): BaseWidgetConfig =>
  ({
    attr: { l: 0, t: 0, w: 320, h: 240, zIndex: 0 },
    info: { name: keyName, keyName, packageName: 'Chart', icon: '' },
    option: { label: keyName, chartOption },
    styles: { animations: [] },
    dataConfig,
    statusList: [],
    interactiveEvent: [],
  }) as unknown as BaseWidgetConfig

/** 创建最小普通控件，专门验证多请求映射不会只执行请求1。 */
const createWidgetComponent = (dataConfig: ComponentDataConfig): BaseWidgetConfig =>
  ({
    attr: { l: 0, t: 0, w: 320, h: 240, zIndex: 0 },
    info: { name: '输入框', keyName: 'VInputsText', packageName: 'Widget', icon: '' },
    option: { label: '输入框', value: '', visible: true },
    styles: { animations: [] },
    dataConfig,
    statusList: [],
    interactiveEvent: [],
  }) as unknown as BaseWidgetConfig

describe('chart style/data separation runtime', () => {
  it('普通控件按请求独立应用映射，不受同名来源字段合并影响', () => {
    const dataConfig = createEmptyDataConfig()
    const firstRequest = createDataConfigRequestItem({
      id: 'request-1',
      request: { type: 'static', config: { data: [{ shared: '请求1文本' }] } },
      dataset: { dimensions: ['shared'], source: [{ shared: '请求1文本' }] },
      bindings: [
        { kind: 'widget', targetPath: 'value', sourceField: 'shared', valueType: 'string' },
      ],
    })
    const secondRequest = createDataConfigRequestItem({
      id: 'request-2',
      request: { type: 'static', config: { data: [{ shared: false }] } },
      dataset: { dimensions: ['shared'], source: [{ shared: false }] },
      bindings: [
        { kind: 'widget', targetPath: 'visible', sourceField: 'shared', valueType: 'boolean' },
      ],
    })
    dataConfig.requests = [firstRequest, secondRequest]
    dataConfig.request = firstRequest.request
    dataConfig.dataset = firstRequest.dataset
    dataConfig.bindings = firstRequest.bindings

    const runtime = buildWidgetRuntimeOption(createWidgetComponent(dataConfig)) as Record<
      string,
      unknown
    >
    expect(runtime.value).toBe('请求1文本')
    expect(runtime.visible).toBe(false)
  })

  it('多请求图表使用目标字段快照构建序列，删除的目标字段不会回退为来源字段', () => {
    const firstRule: ChartBindingRule = {
      kind: 'chart',
      targetDimensionField: 'product',
      targetMeasureFields: ['data1'],
      dimensionField: 'month',
      measureFields: ['sales'],
      seriesMode: 'single',
      chartDataShape: 'category-value',
      useDataset: true,
    }
    const secondRule: ChartBindingRule = {
      kind: 'chart',
      // 第二个请求没有维度目标，表示该映射未配置，不应把 category 回退进图表数据。
      targetDimensionField: '',
      targetMeasureFields: ['data2'],
      dimensionField: 'category',
      measureFields: ['count'],
      seriesMode: 'single',
      chartDataShape: 'category-value',
      useDataset: true,
    }
    const dataConfig = createEmptyDataConfig()
    const firstRequest = createDataConfigRequestItem({
      id: 'request-1',
      request: { type: 'static', config: { data: [{ month: '一月', sales: 12 }] } },
      dataset: { dimensions: ['month', 'sales'], source: [{ month: '一月', sales: 12 }] },
      bindings: [firstRule],
    })
    const secondRequest = createDataConfigRequestItem({
      id: 'request-2',
      request: { type: 'static', config: { data: [{ category: '一月', count: 7 }] } },
      dataset: { dimensions: ['category', 'count'], source: [{ category: '一月', count: 7 }] },
      bindings: [secondRule],
    })
    dataConfig.requests = [firstRequest, secondRequest]
    dataConfig.request = firstRequest.request
    dataConfig.dataset = firstRequest.dataset
    dataConfig.bindings = firstRequest.bindings

    const component = createChartComponent(
      'VBar',
      {
        xAxis: { type: 'category' },
        yAxis: { type: 'value' },
        series: [{ type: 'bar' }],
      },
      dataConfig,
    )

    const runtime = buildWidgetRuntimeOption(component) as {
      chartOption: {
        dataset?: { dimensions: string[]; source: Record<string, unknown>[] }
        series?: Array<Record<string, unknown>>
      }
    }
    expect(runtime.chartOption.dataset?.dimensions).toEqual(['product', 'data1', 'data2'])
    expect(runtime.chartOption.dataset?.source).toEqual([{ product: '一月', data1: 12, data2: 7 }])
    expect(runtime.chartOption.series?.[0]?.encode).toEqual({ x: 'product', y: 'data1' })
    expect(runtime.chartOption.dataset?.source[0]).not.toHaveProperty('category')
  })

  it('分类图使用样式模板和 dataConfig 临时组合运行时 option，且不反写持久化 chartOption', () => {
    const styleOnlyChartOption = {
      xAxis: {
        type: 'category',
        axisLabel: { color: '#111111' },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#222222' },
      },
      series: [
        {
          type: 'bar',
          barWidth: 22,
          itemStyle: { color: '#3B82F6' },
        },
      ],
    }
    const component = createChartComponent(
      'VBar',
      styleOnlyChartOption,
      createStaticChartDataConfig(
        ['month', 'sales'],
        [
          { month: '一月', sales: 18 },
          { month: '二月', sales: 26 },
        ],
        {
          kind: 'chart',
          dimensionField: 'month',
          measureFields: ['sales'],
          seriesMode: 'single',
          chartDataShape: 'category-value',
          useDataset: true,
        },
      ),
    )

    const chartRule = component.dataConfig?.bindings[0] as ChartBindingRule
    const runtimeOption = buildChartRuntimeOption(
      component,
      component.option as Record<string, unknown>,
      component.dataConfig as ComponentDataConfig,
      chartRule,
      {
        dimensions: ['month', 'sales'],
        source: component.dataConfig?.dataset.source || [],
        raw: component.dataConfig?.dataset.source || [],
      },
    ) as { chartOption: Record<string, unknown> }
    const runtimeChartOption = runtimeOption.chartOption
    const runtimeSeries = runtimeChartOption.series as Array<Record<string, unknown>>

    expect(runtimeChartOption.dataset).toEqual({
      dimensions: ['month', 'sales'],
      source: [
        { month: '一月', sales: 18 },
        { month: '二月', sales: 26 },
      ],
    })
    expect(runtimeSeries[0]).toMatchObject({
      type: 'bar',
      name: 'sales',
      barWidth: 22,
      itemStyle: { color: '#3B82F6' },
      encode: { x: 'month', y: 'sales' },
    })
    expect(runtimeSeries[0].data).toBeUndefined()
    expect(component.option).toEqual({ label: 'VBar', chartOption: styleOnlyChartOption })
  })

  it('对象型 dataset 将 {c} 标签改写为度量维度引用，且不反写样式模板', () => {
    const styleOnlyChartOption = {
      xAxis: { type: 'category' },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          label: { show: true, formatter: '{c}亩' },
        },
      ],
    }
    const component = createChartComponent(
      'VBar',
      styleOnlyChartOption,
      createStaticChartDataConfig(
        ['categoryName', 'areaMu'],
        [{ categoryName: '品类ID 2', areaMu: 20 }],
        {
          kind: 'chart',
          dimensionField: 'categoryName',
          measureFields: ['areaMu'],
          seriesMode: 'single',
          chartDataShape: 'category-value',
          useDataset: true,
        },
      ),
    )

    const runtime = buildWidgetRuntimeOption(component) as {
      chartOption: { series: Array<{ label?: { formatter?: string } }> }
    }

    expect(runtime.chartOption.series[0].label?.formatter).toBe('{@[1]}亩')
    expect(styleOnlyChartOption.series[0].label.formatter).toBe('{c}亩')

    const chart = echarts.init(null as unknown as HTMLElement, null, {
      renderer: 'svg',
      ssr: true,
      width: 424,
      height: 342,
    })
    try {
      chart.setOption(runtime.chartOption as echarts.EChartsOption)
      const svg = chart.renderToSVGString()
      expect(svg).toContain('20亩')
      expect(svg).not.toContain('[object Object]')
    } finally {
      chart.dispose()
    }
  })

  it('多系列对象型 dataset 分别引用各自的度量维度', () => {
    const component = createChartComponent(
      'VLine',
      {
        xAxis: { type: 'category' },
        yAxis: { type: 'value' },
        series: [
          { type: 'line', label: { show: true, formatter: '{c}%' } },
          { type: 'line', label: { show: true, formatter: '{c}%' } },
        ],
      },
      createStaticChartDataConfig(
        ['month', 'passRate', 'completionRate'],
        [{ month: '一月', passRate: 92, completionRate: 88 }],
        {
          kind: 'chart',
          dimensionField: 'month',
          measureFields: ['passRate', 'completionRate'],
          seriesMode: 'multi',
          chartDataShape: 'category-value',
          useDataset: true,
        },
      ),
    )

    const runtime = buildWidgetRuntimeOption(component) as {
      chartOption: { series: Array<{ label?: { formatter?: string } }> }
    }

    expect(runtime.chartOption.series.map((series) => series.label?.formatter)).toEqual([
      '{@[1]}%',
      '{@[2]}%',
    ])
  })

  it('雷达图使用 dataConfig 生成指标和系列数据，同时保留样式模板', () => {
    const styleOnlyChartOption = {
      radar: {
        radius: '65%',
        shape: 'polygon',
        axisName: { color: '#111111', fontSize: 12 },
      },
      series: [
        {
          type: 'radar',
          lineStyle: { width: 3, color: '#3B82F6' },
          itemStyle: { color: '#3B82F6' },
          areaStyle: { color: 'rgba(59,130,246,0.18)', opacity: 1 },
        },
      ],
    }
    const component = createChartComponent(
      'VRadarCircle',
      styleOnlyChartOption,
      createStaticChartDataConfig(
        ['indicator', '方案A', '方案B'],
        [
          { indicator: '速度', 方案A: 80, 方案B: 68 },
          { indicator: '质量', 方案A: 74, 方案B: 88 },
        ],
        {
          kind: 'chart',
          dimensionField: 'indicator',
          measureFields: ['方案A', '方案B'],
          seriesMode: 'multi',
          chartDataShape: 'category-value',
          useDataset: true,
        },
      ),
    )

    const chartRule = component.dataConfig?.bindings[0] as ChartBindingRule
    const runtimeOption = buildChartRuntimeOption(
      component,
      component.option as Record<string, unknown>,
      component.dataConfig as ComponentDataConfig,
      chartRule,
      {
        dimensions: ['indicator', '方案A', '方案B'],
        source: component.dataConfig?.dataset.source || [],
        raw: component.dataConfig?.dataset.source || [],
      },
    ) as { chartOption: Record<string, unknown> }
    const runtimeChartOption = runtimeOption.chartOption
    const radar = runtimeChartOption.radar as Record<string, unknown>
    const runtimeSeries = runtimeChartOption.series as Array<Record<string, unknown>>

    expect(radar.indicator).toEqual([
      { name: '速度', max: 100 },
      { name: '质量', max: 100 },
    ])
    expect(runtimeSeries[0].lineStyle).toEqual({ width: 3, color: '#3B82F6' })
    expect(runtimeSeries[0].data).toMatchObject([
      { name: '方案A', value: [80, 74] },
      { name: '方案B', value: [68, 88] },
    ])
    expect(component.option).toEqual({ label: 'VRadarCircle', chartOption: styleOnlyChartOption })
  })

  it('矩形树图使用 name/value 单值映射生成原生节点并保留系列层主题', () => {
    const styleOnlyChartOption = {
      series: [
        {
          type: 'treemap',
          label: {
            show: true,
            color: '#FFFFFF',
            formatter: '{name|{b}}\n{value|{c}}{unit|亩}',
          },
          levels: [{ color: ['#48C66B', '#4BC48A'], colorMappingBy: 'index' }],
          itemStyle: { borderColor: '#26362E', gapWidth: 3 },
        },
      ],
    }
    const component = createChartComponent(
      'VBasicTreemap',
      styleOnlyChartOption,
      createStaticChartDataConfig(
        ['name', 'value'],
        [
          { name: '当归', value: 320 },
          { name: '党参', value: 200 },
        ],
        {
          kind: 'chart',
          dimensionField: 'name',
          measureFields: ['value'],
          seriesMode: 'single',
          chartDataShape: 'name-value',
          useDataset: true,
        },
      ),
    )

    const chartRule = component.dataConfig?.bindings[0] as ChartBindingRule
    const runtimeOption = buildChartRuntimeOption(
      component,
      component.option as Record<string, unknown>,
      component.dataConfig as ComponentDataConfig,
      chartRule,
      {
        dimensions: ['name', 'value'],
        source: component.dataConfig?.dataset.source || [],
        raw: component.dataConfig?.dataset.source || [],
      },
    ) as { chartOption: Record<string, unknown> }
    const runtimeChartOption = runtimeOption.chartOption
    const runtimeSeries = runtimeChartOption.series as Array<Record<string, unknown>>

    expect(runtimeChartOption.dataset).toBeUndefined()
    expect(runtimeSeries[0].data).toEqual([
      { name: '当归', value: 320 },
      { name: '党参', value: 200 },
    ])
    expect(runtimeSeries[0].levels).toEqual([
      { color: ['#48C66B', '#4BC48A'], colorMappingBy: 'index' },
    ])
    expect(component.option).toEqual({
      label: 'VBasicTreemap',
      chartOption: styleOnlyChartOption,
    })
  })
})
