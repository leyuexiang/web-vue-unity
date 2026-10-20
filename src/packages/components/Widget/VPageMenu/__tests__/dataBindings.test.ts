import { describe, expect, it } from 'vitest'
import { applyPageFrameBindings } from '../pageFrameDataBindings'
import Config from '../config'
import type { ComponentDataBindingRule } from '@/types/data-config'

const binding = (sourceField: string, targetPath: string): ComponentDataBindingRule => ({
  kind: 'widget',
  sourceField,
  targetPath,
})

describe('页面框架统一数据绑定', () => {
  it('把标题、Logo、天气和管理员写入各自子节点', () => {
    const component = new Config()
    const row = { title: '数据标题', logo: '/logo.png', temp: '18°C', account: '值班员' }
    applyPageFrameBindings(
      component,
      [
        binding('title', 'title.text'),
        binding('logo', 'logo.imageUrl'),
        binding('temp', 'weather.temperature'),
        binding('date', 'time.date'),
        binding('clock', 'time.time'),
        binding('account', 'account.name'),
      ],
      { ...row, date: '2026-07-07', clock: '10:10:07' },
    )
    expect(component.option.title.text).toBe('数据标题')
    expect(component.option.logo.imageUrl).toBe('/logo.png')
    expect(component.option.weather.temperature).toBe('18°C')
    expect(component.option.time).toMatchObject({ date: '2026-07-07', time: '10:10:07' })
    expect(component.option.account.name).toBe('值班员')
  })

  it('将接口返回的天气图标自动识别为图标库编码或图片地址', () => {
    const component = new Config()

    applyPageFrameBindings(component, [binding('icon', 'weather.icon')], {
      icon: 'wi:day-rain',
    })
    expect(component.option.weather.iconName).toBe('wi:day-rain')
    expect(component.option.weather.iconUrl).toBe('')

    applyPageFrameBindings(component, [binding('icon', 'weather.icon')], {
      icon: 'https://example.com/weather.png',
    })
    expect(component.option.weather.iconName).toBe('')
    expect(component.option.weather.iconUrl).toBe('https://example.com/weather.png')
  })

  it('把 JSON 字符串和多行记录转换为三级菜单', () => {
    const component = new Config()
    applyPageFrameBindings(component, [binding('menus', 'menuItems')], {
      menus: JSON.stringify([
        { id: 'a', label: '首页', side: 'left' },
        { id: 'b', label: '详情', parentId: 'a' },
      ]),
    })
    expect(component.option.menuChildren).toHaveLength(1)
    expect(component.option.menuChildren[0].children[0].label).toBe('详情')

    const rows = [
      { id: 'x', label: '监控', menus: 'scalar' },
      { id: 'y', label: '报表', menus: 'scalar' },
    ]
    applyPageFrameBindings(component, [binding('menus', 'menuItems')], rows[0], rows)
    expect(component.option.menuChildren.map((item) => item.label)).toEqual(['监控', '报表'])
  })

  it('多请求顺序应用时保留其他请求字段，空菜单保留上一有效快照', () => {
    const component = new Config()
    const originalMenuIds = component.option.menuChildren.map((item) => item.id)
    applyPageFrameBindings(component, [binding('title', 'title.text')], { title: '请求一' })
    applyPageFrameBindings(component, [binding('weather', 'weather.condition')], {
      weather: '多云',
    })
    applyPageFrameBindings(component, [binding('menus', 'menuItems')], { menus: [] })
    expect(component.option.title.text).toBe('请求一')
    expect(component.option.weather.condition).toBe('多云')
    expect(component.option.menuChildren.map((item) => item.id)).toEqual(originalMenuIds)
  })

  it('数据菜单刷新时按稳定 ID 保留已经配置的事件和图片', () => {
    const component = new Config()
    component.option.menuChildren[0].interactiveEvent = [
      { id: 'home-click' },
    ] as (typeof component.option.menuChildren)[number]['interactiveEvent']
    component.option.menuChildren[0].iconUrl = '/menu.png'
    component.option.menuChildren[0].activeIconUrl = '/menu-active.png'
    component.option.menuChildren[0].activeBackgroundImage = '/menu-bg.png'
    const stableId = component.option.menuChildren[0].id

    applyPageFrameBindings(component, [binding('menus', 'menuItems')], {
      menus: [{ id: stableId, label: '首页', side: 'left' }],
    })

    expect(component.option.menuChildren[0].interactiveEvent).toEqual([{ id: 'home-click' }])
    expect(component.option.menuChildren[0]).toMatchObject({
      iconUrl: '/menu.png',
      activeIconUrl: '/menu-active.png',
      activeBackgroundImage: '/menu-bg.png',
    })
  })

  it('数据菜单刷新时保留默认项，否则回退到新的第一个可见菜单', () => {
    const component = new Config()
    const originalDefaultMenuId = component.option.defaultMenuId

    applyPageFrameBindings(component, [binding('menus', 'menuItems')], {
      menus: [{ id: originalDefaultMenuId, label: '首页', side: 'left' }],
    })
    expect(component.option.defaultMenuId).toBe(originalDefaultMenuId)

    applyPageFrameBindings(component, [binding('menus', 'menuItems')], {
      menus: [
        { id: 'new-hidden', label: '隐藏', side: 'left', visible: false },
        { id: 'new-visible', label: '新首页', side: 'right' },
      ],
    })
    expect(component.option.defaultMenuId).toBe('new-visible')
  })

  it('无权限字段只隐藏受保护槽位，不影响框架和公开槽位', () => {
    const component = new Config()
    applyPageFrameBindings(component, [binding('account', 'account.name')], {
      account: { authorized: false },
    })
    expect(component.option.account.visible).toBe(false)
    expect(component.option.title.visible).toBe(true)
    expect(component.option.background.value).toContain('page-frame-topbar.png')
  })
})
