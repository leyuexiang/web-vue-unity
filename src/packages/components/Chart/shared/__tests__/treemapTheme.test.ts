import { describe, expect, it } from 'vitest'
import {
  createTreemapLabelFormatter,
  extractTreemapValueUnit,
  getTreemapGapColor,
  getTreemapLabelColor,
  normalizeTreemapNodeValue,
  normalizeTreemapValueUnit,
  setTreemapGapColor,
  setTreemapLabelColor,
} from '../treemapTheme'

describe('矩形树图数值单位', () => {
  it('生成可序列化标签并能读取已保存单位', () => {
    const formatter = createTreemapLabelFormatter('万元')

    expect(formatter).toBe('{name|{b}}\n{value|{c}}{unit|万元}')
    expect(extractTreemapValueUnit(formatter)).toBe('万元')
  })

  it('允许清空单位并过滤会破坏富文本语法的字符', () => {
    expect(createTreemapLabelFormatter('')).toBe('{name|{b}}\n{value|{c}}')
    expect(normalizeTreemapValueUnit(' 千克|{测试}\n ')).toBe('千克测试')
  })

  it('只接受可转换为有限数字的单数值', () => {
    expect(normalizeTreemapNodeValue(64)).toBe(64)
    expect(normalizeTreemapNodeValue('72')).toBe(72)
    expect(normalizeTreemapNodeValue([90, 72])).toBe(0)
    expect(normalizeTreemapNodeValue([])).toBe(0)
  })

  it('标签颜色同步覆盖富文本分段，避免被分段样式遮蔽', () => {
    const series = {
      label: {
        color: '#111111',
        rich: {
          name: { color: '#222222' },
          value: { color: '#333333' },
          unit: { color: '#444444' },
        },
      },
      itemStyle: {},
      levels: [],
    }

    expect(getTreemapLabelColor(series)).toBe('#222222')
    setTreemapLabelColor(series, '#55AA77')

    expect(series.label.color).toBe('#55AA77')
    expect(series.label.rich.name.color).toBe('#55AA77')
    expect(series.label.rich.value.color).toBe('#55AA77')
    expect(series.label.rich.unit.color).toBe('#55AA77')
  })

  it('间隙颜色同步覆盖系列级与层级样式', () => {
    const series = {
      label: { color: '#FFFFFF' },
      itemStyle: { borderColor: '#111111' },
      levels: [{ itemStyle: { borderColor: '#222222' } }],
    }

    expect(getTreemapGapColor(series)).toBe('#222222')
    setTreemapGapColor(series, '#336699')

    expect(series.itemStyle.borderColor).toBe('#336699')
    expect(series.levels[0].itemStyle.borderColor).toBe('#336699')
  })
})
