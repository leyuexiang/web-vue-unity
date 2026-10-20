import { describe, expect, it } from 'vitest'
import GroupedBarConfig from '../../VGroupedBar/config'
import MultiLineConfig from '../../VMultiLine/config'

type ChartConfigShape = {
  option: {
    chartOption: {
      series: Array<{
        symbolSize?: number
        lineStyle?: { width?: number }
        itemStyle?: { color?: string }
      }>
    }
  }
}

/**
 * 同类型图表会反复实例化同一个配置类，测试嵌套样式引用是否真正隔离。
 * 柱状图覆盖 itemStyle，折线图覆盖 lineStyle，避免只修复某一种系列结构后再次回归。
 */
describe('图表配置实例隔离', () => {
  it('柱状图的嵌套样式修改不会影响另一个实例', () => {
    const first = new GroupedBarConfig() as ChartConfigShape
    const second = new GroupedBarConfig() as ChartConfigShape
    const secondColorBefore = second.option.chartOption.series[0].itemStyle?.color

    first.option.chartOption.series[0].itemStyle!.color = '#FF0000'

    expect(second.option.chartOption.series[0].itemStyle?.color).toBe(secondColorBefore)
    expect(first.option.chartOption.series).not.toBe(second.option.chartOption.series)
  })

  it('折线图的嵌套系列修改不会影响另一个实例', () => {
    const Config = MultiLineConfig
    const first = new Config() as ChartConfigShape
    const second = new Config() as ChartConfigShape
    const secondSizeBefore = second.option.chartOption.series[0].symbolSize

    first.option.chartOption.series[0].symbolSize = 9

    expect(second.option.chartOption.series[0].symbolSize).toBe(secondSizeBefore)
    expect(first.option.chartOption).not.toBe(second.option.chartOption)
    expect(first.option.chartOption.series).not.toBe(second.option.chartOption.series)
  })
})
