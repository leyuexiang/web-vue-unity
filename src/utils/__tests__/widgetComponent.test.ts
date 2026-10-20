import { describe, expect, it } from 'vitest'
import BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import { mergeWidgetComponentWithDefaults } from '../widgetComponent'
import PageFrameConfig from '@/packages/components/Widget/VPageMenu/config'

class DefaultChartConfig extends BaseWidgetConfig {
  override attr = { l: 0, t: 0, w: 300, h: 200, zIndex: 0 }
  override info = { name: '图表', keyName: 'VTest', packageName: 'Chart', icon: '' }
  override option = {
    chartOption: {
      yAxis: { type: 'value', color: () => '#000' },
      series: [{ type: 'bar', data: [1, 2, 3] }],
    },
  }
}

describe('二维组件配置恢复', () => {
  it('以保存数据覆盖默认配置，同时补回未落库的内置函数', () => {
    const saved = {
      attr: { l: 10, t: 20, w: 500, h: 280, zIndex: 2 },
      info: { name: '图表', keyName: 'VTest', packageName: 'Chart', icon: '' },
      option: {
        chartOption: {
          yAxis: { type: 'value' },
          series: [{ type: 'bar', data: [9] }],
        },
      },
      styles: { animations: [] },
      statusList: [],
      interactiveEvent: [],
    } as unknown as DefaultChartConfig

    const restored = mergeWidgetComponentWithDefaults(new DefaultChartConfig(), saved)

    expect(restored.attr).toMatchObject({ l: 10, t: 20, w: 500, h: 280, zIndex: 2 })
    expect(restored.option.chartOption.series).toEqual([{ type: 'bar', data: [9] }])
    expect(restored.option.chartOption.yAxis.color()).toBe('#000')
  })

  it('将旧 VPageMenu 统一重置为页面框架 v2 并保留位置与通用状态', () => {
    const saved = new PageFrameConfig()
    saved.attr = { l: 123, t: 456, w: 800, h: 88, zIndex: 7 }
    saved.option = {
      title: '旧标题',
      menus: [{ id: 'legacy-menu', label: '旧菜单', children: [] }],
      barBackgroundImage: 'legacy.png',
      visible: false,
      locked: true,
    } as unknown as PageFrameConfig['option']
    saved.styles = { animations: ['animate__fadeIn'] }
    saved.dataConfig = { legacy: true } as never

    const restored = mergeWidgetComponentWithDefaults(new PageFrameConfig(), saved)

    expect(restored.attr).toMatchObject({ l: 123, t: 456, w: 1920, h: 1080, zIndex: 7 })
    expect(restored.option.schemaVersion).toBe(2)
    expect(restored.option.title.text).not.toBe('旧标题')
    expect(restored.option.menuChildren.some((item) => item.id === 'legacy-menu')).toBe(false)
    expect(restored.option.background.value).toContain('page-frame-topbar.png')
    expect(restored.option.visible).toBe(false)
    expect(restored.option.locked).toBe(true)
    expect(restored.styles.animations).toEqual(['animate__fadeIn'])
    expect(restored.dataConfig).toBeUndefined()
  })
})
