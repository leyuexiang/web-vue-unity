import { describe, expect, it } from 'vitest'
import { collectChartFontFields, updateChartFontField } from '../chartFontFields'
import { getChartPanelSchema } from '../chartConfigMeta'
import type { PanelChartOption } from '../chartConfigTypes'

/** 验证独立字体路径与数据隔离，避免修改某段文字时覆盖其他系列或原始数据。 */
describe('图表独立文字字体', () => {
  it('枚举多标题、多系列和富文本，不注入默认字体', () => {
    const option: PanelChartOption = {
      title: [{ text: '甲' }, { text: '乙' }],
      series: [
        { type: 'pie', label: { rich: { value: { fontFamily: 'serif' } } } },
        { type: 'gauge' },
      ],
    }
    const before = JSON.stringify(option)
    const fields = collectChartFontFields(option, getChartPanelSchema('VBar'))
    expect(fields.some((field) => field.key === JSON.stringify(['title', 1, 'textStyle']))).toBe(
      true,
    )
    expect(fields.some((field) => field.key === JSON.stringify(['series', 1, 'detail']))).toBe(true)
    expect(
      fields.find((field) => field.key === JSON.stringify(['series', 0, 'label', 'rich', 'value']))
        ?.value,
    ).toBe('serif')
    expect(JSON.stringify(option)).toBe(before)
  })

  it('只复制修改路径，保留数据引用及其他文字字体', () => {
    const data = [1, 2]
    const option: PanelChartOption = {
      series: [
        { type: 'bar', data },
        { type: 'bar', label: { fontFamily: 'serif' } },
      ],
    }
    const next = updateChartFontField(option, ['series', 0, 'label'], 'KaiTi, serif')
    expect(next.series?.[0]?.label?.fontFamily).toBe('KaiTi, serif')
    expect(next.series?.[1]).toBe(option.series?.[1])
    expect(next.series?.[0]?.data).toBe(data)
    expect(option.series?.[0]?.label).toBeUndefined()
  })
})
