import { describe, expect, it } from 'vitest'
import { getChartPanelSchema } from '../chartConfigMeta'

describe('chartConfigMeta 矩形树图配置', () => {
  it('将基础为矩形树图识别为无坐标轴的独立图表族', () => {
    const schema = getChartPanelSchema('VBasicTreemap')

    expect(schema.family).toBe('treemap')
    expect(schema.seriesLabel).toBe('矩形树图')
    expect(schema.supports).toEqual({
      title: true,
      grid: false,
      legend: false,
      xAxis: false,
      yAxis: false,
      visualMap: false,
      radar: false,
    })
  })
})
