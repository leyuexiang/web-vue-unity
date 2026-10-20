import { effectScope, nextTick, reactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { PanelChartOption } from '../chartConfigTypes'
import { useGenericChartConfigPanel, type PanelOptionModel } from '../useGenericChartConfigPanel'

/**
 * 序列化的 ECharts 配置可能只包含用户显式设置的标题字段；
 * 测试入口保留 unknown 边界，用于验证组合函数能在运行时补齐内部面板所需的完整字段。
 */
const createProps = (title: unknown) =>
  reactive<{ option: PanelOptionModel; chartKey: string }>({
    option: { chartOption: { title } as PanelChartOption },
    chartKey: 'VLine',
  })

describe('useGenericChartConfigPanel 标题默认值', () => {
  it('自动展开标题分组时保留 ECharts 标题数组及每一项配置', async () => {
    const props = createProps([
      { text: '主标题', show: true },
      { text: '副标题', left: 'right', textStyle: { color: '#ff0000' } },
    ])
    const scope = effectScope()

    scope.run(() => {
      useGenericChartConfigPanel(props, vi.fn())
    })
    await nextTick()

    const title = props.option.chartOption?.title
    expect(Array.isArray(title)).toBe(true)
    expect(title).toHaveLength(2)
    expect(title).toEqual([
      expect.objectContaining({
        text: '主标题',
        show: true,
        textStyle: expect.objectContaining({ color: '#000000', fontSize: 18 }),
      }),
      expect.objectContaining({
        text: '副标题',
        left: 'right',
        textStyle: expect.objectContaining({ color: '#ff0000', fontSize: 18 }),
      }),
    ])

    scope.stop()
  })

  it('单个标题配置仍保持对象形态并补齐默认字段', async () => {
    const props = createProps({ text: '单标题', left: 'right' })
    const scope = effectScope()

    scope.run(() => {
      useGenericChartConfigPanel(props, vi.fn())
    })
    await nextTick()

    const title = props.option.chartOption?.title
    expect(Array.isArray(title)).toBe(false)
    expect(title).toEqual(
      expect.objectContaining({
        text: '单标题',
        left: 'right',
        textStyle: expect.objectContaining({ color: '#000000', fontSize: 18 }),
      }),
    )

    scope.stop()
  })
})
