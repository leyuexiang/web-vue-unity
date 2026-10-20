import { describe, expect, it } from 'vitest'
import {
  mergeChartStyleOption,
  normalizeChartAxisRangeFields,
  sanitizeChartStyleOption,
} from '../chartStyleOption'
import type { ChartOptionRecord } from '../chartConfigTypes'

const getRecord = (value: unknown) => value as ChartOptionRecord
const getRecordList = (value: unknown) => value as ChartOptionRecord[]

describe('chartStyleOption', () => {
  it('清洗柱状图、条形图、折线图和面积图的数据字段，同时保留样式字段', () => {
    const style = sanitizeChartStyleOption({
      dataset: {
        source: [{ month: '一月', sales: 18 }],
      },
      legend: {
        data: ['销售额'],
        textStyle: { color: '#111111' },
      },
      xAxis: {
        type: 'category',
        data: ['一月', '二月'],
        min: '',
        max: '100',
        axisLabel: { color: '#222222' },
      },
      yAxis: [
        {
          type: 'value',
          data: [18, 26],
          min: 0,
          interval: ' ',
          splitLine: { show: true },
        },
      ],
      series: [
        {
          type: 'bar',
          data: [18, 26],
          encode: { x: 'month', y: 'sales' },
          barWidth: 18,
          itemStyle: { color: '#3B82F6' },
        },
      ],
    })

    const xAxis = getRecord(style.xAxis)
    const yAxis = getRecordList(style.yAxis)[0]
    const legend = getRecord(style.legend)
    const series = getRecordList(style.series)[0]

    expect(style.dataset).toBeUndefined()
    expect(xAxis.data).toBeUndefined()
    expect(xAxis.min).toBeUndefined()
    expect(xAxis.max).toBe(100)
    expect(yAxis.data).toBeUndefined()
    expect(yAxis.interval).toBeUndefined()
    expect(yAxis.min).toBe(0)
    expect(legend.data).toBeUndefined()
    expect(legend.textStyle).toEqual({ color: '#111111' })
    expect(series.data).toBeUndefined()
    expect(series.encode).toBeUndefined()
    expect(series.barWidth).toBe(18)
    expect(series.itemStyle).toEqual({ color: '#3B82F6' })
  })

  it('清洗饼图、环图和仪表盘的数据字段，同时保留半径、中心点、指针和进度样式', () => {
    const style = sanitizeChartStyleOption({
      series: [
        {
          type: 'pie',
          radius: ['42%', '72%'],
          center: ['50%', '48%'],
          data: [{ name: 'A', value: 12 }],
          label: { show: true },
        },
        {
          type: 'gauge',
          min: 0,
          max: 100,
          data: [{ name: '完成率', value: 66 }],
          progress: { show: true, width: 12 },
          pointer: { width: 4, length: '55%' },
          detail: { fontSize: 18 },
        },
      ],
    })

    const series = getRecordList(style.series)

    expect(series[0].data).toBeUndefined()
    expect(series[0].radius).toEqual(['42%', '72%'])
    expect(series[0].center).toEqual(['50%', '48%'])
    expect(series[1].data).toBeUndefined()
    expect(series[1].progress).toEqual({ show: true, width: 12 })
    expect(series[1].pointer).toEqual({ width: 4, length: '55%' })
    expect(series[1].detail).toEqual({ fontSize: 18 })
  })

  it('清洗雷达图的指标和系列数据，同时保留雷达网格与系列视觉样式', () => {
    const style = sanitizeChartStyleOption({
      radar: {
        indicator: [{ name: '速度', max: 100 }],
        radius: '65%',
        shape: 'polygon',
        axisName: { color: '#000000', fontSize: 12 },
        splitLine: { lineStyle: { color: '#999999', width: 1 } },
      },
      series: [
        {
          type: 'radar',
          data: [{ name: 'A', value: [60] }],
          lineStyle: { width: 2, color: '#3B82F6' },
          itemStyle: { color: '#3B82F6' },
          areaStyle: { color: 'rgba(59,130,246,0.18)', opacity: 1 },
        },
      ],
    })

    const radar = getRecord(style.radar)
    const series = getRecordList(style.series)[0]

    expect(radar.indicator).toBeUndefined()
    expect(radar.radius).toBe('65%')
    expect(radar.splitLine).toEqual({ lineStyle: { color: '#999999', width: 1 } })
    expect(series.data).toBeUndefined()
    expect(series.lineStyle).toEqual({ width: 2, color: '#3B82F6' })
    expect(series.itemStyle).toEqual({ color: '#3B82F6' })
    expect(series.areaStyle).toEqual({ color: 'rgba(59,130,246,0.18)', opacity: 1 })
  })

  it('清洗桑基图节点和连线数据，同时保留布局、节点和线条样式', () => {
    const style = sanitizeChartStyleOption({
      series: [
        {
          type: 'sankey',
          data: [{ name: 'A' }],
          nodes: [{ name: 'B' }],
          links: [{ source: 'A', target: 'B', value: 1 }],
          edges: [{ source: 'B', target: 'C', value: 2 }],
          nodeWidth: 20,
          nodeGap: 16,
          lineStyle: { opacity: 0.45, curveness: 0.55 },
          label: { color: '#111111', fontSize: 12 },
        },
      ],
    })

    const series = getRecordList(style.series)[0]

    expect(series.data).toBeUndefined()
    expect(series.nodes).toBeUndefined()
    expect(series.links).toBeUndefined()
    expect(series.edges).toBeUndefined()
    expect(series.nodeWidth).toBe(20)
    expect(series.nodeGap).toBe(16)
    expect(series.lineStyle).toEqual({ opacity: 0.45, curveness: 0.55 })
    expect(series.label).toEqual({ color: '#111111', fontSize: 12 })
  })

  it('清洗矩形树图节点数据，同时保留标签、分块间距和颜色层级', () => {
    const style = sanitizeChartStyleOption({
      series: [
        {
          type: 'treemap',
          data: [{ name: '当归', value: 580 }],
          label: { show: true, color: '#FFFFFF', fontSize: 18 },
          itemStyle: { borderColor: '#26362E', gapWidth: 3 },
          levels: [{ color: ['#48C66B', '#4BC48A'], colorMappingBy: 'index' }],
        },
      ],
    })

    const series = getRecordList(style.series)[0]

    expect(series.data).toBeUndefined()
    expect(series.label).toEqual({ show: true, color: '#FFFFFF', fontSize: 18 })
    expect(series.itemStyle).toEqual({ borderColor: '#26362E', gapWidth: 3 })
    expect(series.levels).toEqual([{ color: ['#48C66B', '#4BC48A'], colorMappingBy: 'index' }])
  })

  it('样式 JSON 合并时拒绝新数据字段，并保留当前默认数据', () => {
    const merged = mergeChartStyleOption(
      {
        xAxis: { data: ['一月'], axisLabel: { color: '#111111' } },
        series: [{ type: 'bar', data: [10], itemStyle: { color: '#111111' } }],
      },
      {
        dataset: { source: [{ month: '二月', sales: 99 }] },
        xAxis: { data: ['二月'], min: '', axisLabel: { color: '#222222' } },
        series: [{ data: [99], itemStyle: { color: '#222222' }, barWidth: 24 }],
      },
    )

    const xAxis = getRecord(merged.xAxis)
    const series = getRecordList(merged.series)[0]

    expect(merged.dataset).toBeUndefined()
    expect(xAxis.data).toEqual(['一月'])
    expect(xAxis.min).toBeUndefined()
    expect(xAxis.axisLabel).toEqual({ color: '#222222' })
    expect(series.data).toEqual([10])
    expect(series.itemStyle).toEqual({ color: '#222222' })
    expect(series.barWidth).toBe(24)
  })

  it('删除空范围并把历史数字字符串迁移为数值，不删除轴数据和有效零值', () => {
    const option = {
      xAxis: {
        data: ['一月'],
        min: '',
        max: '0',
        interval: 0,
      },
      yAxis: [
        {
          data: [10],
          min: ' ',
          max: 0,
        },
      ],
    }

    const normalized = normalizeChartAxisRangeFields(option)
    const xAxis = getRecord(normalized.xAxis)
    const yAxis = getRecordList(normalized.yAxis)[0]

    expect(normalized).not.toBe(option)
    expect(xAxis.data).toEqual(['一月'])
    expect(xAxis.min).toBeUndefined()
    expect(xAxis.max).toBe(0)
    expect(xAxis.interval).toBe(0)
    expect(yAxis.data).toEqual([10])
    expect(yAxis.min).toBeUndefined()
    expect(yAxis.max).toBe(0)
  })
})
