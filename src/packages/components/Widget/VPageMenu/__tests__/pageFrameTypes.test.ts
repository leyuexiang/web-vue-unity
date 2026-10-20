import { describe, expect, it } from 'vitest'
import Config from '../config'
import {
  createDefaultPageFrameOption,
  createFactoryBottomPageFrameOption,
  createShowroomPageFrameOption,
  PAGE_FRAME_FACTORY_BACKGROUND_URL,
  PAGE_FRAME_FACTORY_LEGACY_REFERENCE_URL,
  PAGE_FRAME_FACTORY_MENU_ITEM_GAP,
  PAGE_FRAME_FACTORY_MENU_SPREAD_X,
  findPageFrameChild,
  getPageFrameMenuIcon,
  normalizePageFrameMenuData,
  normalizePageFrameOption,
  movePageFrameMenuChild,
  removePageFrameMenuChild,
  resolvePageFrameWeatherIconName,
  resolvePageFrameWeatherImage,
} from '../pageFrameTypes'

describe('页面框架 v2 数据模型', () => {
  it('默认包含六个固定槽位和稳定 ID', () => {
    const option = createDefaultPageFrameOption()
    const slots = [
      option.logo,
      option.menuSlots.left,
      option.title,
      option.menuSlots.right,
      option.weather,
      option.time,
      option.account,
    ]
    expect(option.schemaVersion).toBe(2)
    expect(option.layout).toBe('topbar')
    expect(new Set(slots.map((slot) => slot.slot))).toEqual(
      new Set(['logo', 'left-menu', 'title', 'right-menu', 'weather', 'time', 'account']),
    )
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(7)
    expect(slots.every((slot) => slot.interactiveEvent.length === 0)).toBe(true)
    expect(option.menuChildren.every((child) => child.interactiveEvent.length === 0)).toBe(true)
    expect(option.logo.text).toBe('XX企业')
    expect(option.title.text).toBe('数字孪生平台')
    expect(option.title).toMatchObject({ offsetX: 0, offsetY: 0 })
    expect(option.weather.images.map((image) => image.condition)).toEqual([
      '晴',
      '少云',
      '多云',
      '阴',
      '小雨',
      '中雨',
      '大雨',
      '雷阵雨',
      '小雪',
      '中雪',
      '大雪',
      '雾',
      '霾',
    ])
    expect(option.weather.images.every((image) => image.imageUrl === '')).toBe(true)
    expect(option.time).toMatchObject({
      date: '2026-07-07',
      time: '10:10:07',
      offsetX: 0,
      offsetY: 0,
    })
    expect(option.menuSlots.left).toMatchObject({ offsetX: 0, offsetY: 0, itemGap: 10 })
    expect(option.menuSlots.right).toMatchObject({ offsetX: 0, offsetY: 0, itemGap: 10 })
    expect(option.menuChildren.map((item) => item.label)).toEqual(['', '', '', '', '', ''])
    expect(option.defaultMenuId).toBe(option.menuChildren[0].id)
    expect(option.menuChildren.every((item) => item.children.length === 0)).toBe(true)
  })

  it('保留底部菜单布局并让未知布局安全回退到顶部菜单', () => {
    const option = createDefaultPageFrameOption()
    option.layout = 'factory-bottom'
    expect(normalizePageFrameOption(option).layout).toBe('factory-bottom')
    ;(option as unknown as { layout: string }).layout = 'unknown'
    expect(normalizePageFrameOption(option).layout).toBe('topbar')
  })

  it('加工厂第二页预设使用整屏设计稿背景', () => {
    const option = createFactoryBottomPageFrameOption()
    expect(option.layout).toBe('factory-bottom')
    expect(option.background.value).toContain('factory-frame.png')
    expect(option.menuSlots.left).toMatchObject({
      offsetX: -PAGE_FRAME_FACTORY_MENU_SPREAD_X,
      offsetY: 0,
    })
    expect(option.menuSlots.right).toMatchObject({
      offsetX: PAGE_FRAME_FACTORY_MENU_SPREAD_X,
      offsetY: 0,
    })
    expect(option.menuSlots.left.itemGap).toBe(PAGE_FRAME_FACTORY_MENU_ITEM_GAP)
    expect(option.menuSlots.right.itemGap).toBe(PAGE_FRAME_FACTORY_MENU_ITEM_GAP)
  })

  it('孪生展厅预设保留原图、顶部菜单与默认选中状态', () => {
    const option = createShowroomPageFrameOption()
    const normalized = normalizePageFrameOption(option)
    expect(normalized.layout).toBe('showroom-top')
    expect(normalized.background.value).toContain('page-frame-showroom.png')
    expect(normalized.menuChildren.map((menu) => menu.label)).toEqual([
      '全局沙盘',
      '科普馆',
      '药材商品馆',
      '道地溯源馆',
      '品牌馆',
    ])
    expect(normalized.defaultMenuId).toBe(normalized.menuChildren[0].id)
    expect(normalized.menuSlots.right.visible).toBe(false)
    expect(normalized.menuChildren.every((menu) => menu.interactiveEvent.length === 0)).toBe(true)
    expect(normalized.menuChildren.every((menu) => menu.iconUrl.includes('-normal.png'))).toBe(true)
    expect(normalized.menuChildren.every((menu) => menu.activeIconUrl.includes('-active.png'))).toBe(true)
    expect(getPageFrameMenuIcon(normalized.menuChildren[0], false)).toBe(normalized.menuChildren[0].iconUrl)
    expect(getPageFrameMenuIcon(normalized.menuChildren[0], true)).toBe(normalized.menuChildren[0].activeIconUrl)
  })

  it('把已保存的旧加工厂 SVG 背景迁移为整屏设计稿', () => {
    const option = createDefaultPageFrameOption()
    option.layout = 'factory-bottom'
    option.background.value = PAGE_FRAME_FACTORY_BACKGROUND_URL

    const result = normalizePageFrameOption(option)
    expect(result.background.value).toContain('factory-frame.png')
    expect(result.menuSlots.left.offsetX).toBe(-PAGE_FRAME_FACTORY_MENU_SPREAD_X)
    expect(result.menuSlots.right.offsetX).toBe(PAGE_FRAME_FACTORY_MENU_SPREAD_X)
  })

  it('把上一版误用的加工厂截图和零位菜单一起迁移', () => {
    const option = createDefaultPageFrameOption()
    option.layout = 'factory-bottom'
    option.background.value = PAGE_FRAME_FACTORY_LEGACY_REFERENCE_URL

    const result = normalizePageFrameOption(option)
    expect(result.background.value).toContain('factory-frame.png')
    expect(result.menuSlots.left.offsetX).toBe(-PAGE_FRAME_FACTORY_MENU_SPREAD_X)
    expect(result.menuSlots.right.offsetX).toBe(PAGE_FRAME_FACTORY_MENU_SPREAD_X)
  })

  it('归一化默认选中菜单并在菜单不存在时清空配置', () => {
    const input = createDefaultPageFrameOption()
    input.defaultMenuId = input.menuChildren[2].id
    expect(normalizePageFrameOption(input).defaultMenuId).toBe(input.menuChildren[2].id)

    input.defaultMenuId = 'missing-menu'
    expect(normalizePageFrameOption(input).defaultMenuId).toBe('')
  })

  it('归一化时独立保留固定槽位与菜单项的公共交互事件', () => {
    const option = createDefaultPageFrameOption()
    option.weather.interactiveEvent = [
      { id: 'weather-event' },
    ] as typeof option.weather.interactiveEvent
    option.menuChildren[0].interactiveEvent = [
      { id: 'menu-event' },
    ] as (typeof option.menuChildren)[number]['interactiveEvent']

    const result = normalizePageFrameOption(option)

    expect(result.weather.interactiveEvent).toEqual([{ id: 'weather-event' }])
    expect(result.menuChildren[0].interactiveEvent).toEqual([{ id: 'menu-event' }])
    expect(result.weather.interactiveEvent).not.toBe(option.weather.interactiveEvent)
  })

  it('默认配置覆盖 1920×1080 且页面地址为空', () => {
    const config = new Config()
    expect(config.attr).toMatchObject({ l: 0, t: 0, w: 1920, h: 1080 })
    expect(config.option.background.value).toContain('page-frame-topbar.png')
    expect(config.option.background).not.toHaveProperty('fit')
    expect(config.option.background).not.toHaveProperty('fallbackColor')
    expect(config.option.logo).toMatchObject({ offsetX: 0, offsetY: 0 })
    expect(config.option.weather).toMatchObject({ offsetX: 0, offsetY: 0 })
    expect(config.option.account).toMatchObject({ offsetX: 0, offsetY: 0 })
    expect(config.option.menuChildren.every((item) => item.activeBackgroundImage === '')).toBe(true)
    expect(config.option.menuChildren.every((item) => item.iconUrl === '')).toBe(true)
    expect(config.option.menuChildren.every((item) => item.activeIconUrl === '')).toBe(true)
    expect(config.option).not.toHaveProperty('openInNewWindow')
    expect(config.option.menuChildren.every((item) => item.openInNewWindow === false)).toBe(true)
    expect(config.option.menuChildren.every((item) => item.pageUrl === '')).toBe(true)
  })

  it('归一化非法图片、字号、透明度和四级菜单', () => {
    const input = createDefaultPageFrameOption()
    input.background.value = ''
    input.background.opacity = 7
    input.logo.offsetX = 9999
    input.logo.offsetY = -9999
    input.title.offsetX = 9999
    input.title.offsetY = -9999
    input.weather.offsetX = -9999
    input.weather.offsetY = 9999
    input.account.offsetX = 9999
    input.account.offsetY = -9999
    input.menuSlots.left.offsetX = -9999
    input.menuSlots.right.offsetY = 9999
    input.menuSlots.left.itemGap = -1
    input.menuSlots.right.itemGap = 999
    input.title.style.fontSize = Number.NaN
    input.menuChildren[0].children = [
      {
        id: '2',
        label: '二',
        pageUrl: '',
        openInNewWindow: false,
        visible: true,
        children: [
          {
            id: '3',
            label: '三',
            pageUrl: '',
            openInNewWindow: false,
            visible: true,
            children: [
              {
                id: '4',
                label: '四',
                pageUrl: '',
                openInNewWindow: false,
                visible: true,
                children: [],
              },
            ],
          },
        ],
      },
    ]
    const result = normalizePageFrameOption(input)
    expect(result.background.value).toContain('page-frame-topbar.png')
    expect(result.background.opacity).toBe(1)
    expect(result.logo).toMatchObject({ offsetX: 2000, offsetY: -2000 })
    expect(result.title).toMatchObject({ offsetX: 2000, offsetY: -2000 })
    expect(result.weather).toMatchObject({ offsetX: -2000, offsetY: 2000 })
    expect(result.account).toMatchObject({ offsetX: 2000, offsetY: -2000 })
    expect(result.menuSlots.left).toMatchObject({ offsetX: -2000, offsetY: 0 })
    expect(result.menuSlots.right).toMatchObject({ offsetX: 0, offsetY: 2000 })
    expect(result.menuSlots.left.itemGap).toBe(0)
    expect(result.menuSlots.right.itemGap).toBe(96)
    expect(result.title.style.fontSize).toBe(28)
    expect(result.menuChildren[0].children[0].children[0].children).toEqual([])
  })

  it('支持为多个天气分别配置图片，并按当前天气自动切换', () => {
    const input = createDefaultPageFrameOption()
    input.weather.iconUrl = '/weather-default.png'
    input.weather.images = [
      { id: 'sunny', condition: '晴', iconName: 'wi:day-sunny', imageUrl: '/sunny.png' },
      { id: 'cloudy', condition: '多云', iconName: 'wi:day-cloudy', imageUrl: '/cloudy.png' },
      { id: 'cloudy', condition: '小雨', iconName: 'wi:day-rain', imageUrl: '/rain.png' },
    ]
    const result = normalizePageFrameOption(input)
    expect(result.weather.images.map((image) => image.id)).toEqual(['sunny', 'cloudy', 'cloudy-3'])
    expect(resolvePageFrameWeatherImage(result.weather)).toBe('/sunny.png')
    expect(resolvePageFrameWeatherIconName(result.weather)).toBe('wi:day-sunny')
    result.weather.condition = '多云'
    expect(resolvePageFrameWeatherImage(result.weather)).toBe('/cloudy.png')
    expect(resolvePageFrameWeatherIconName(result.weather)).toBe('wi:day-cloudy')
    result.weather.condition = '雾'
    expect(resolvePageFrameWeatherImage(result.weather)).toBe('/weather-default.png')
  })

  it('接口图标编码优先于条件图片并直接渲染天气图标库图标', () => {
    const option = createDefaultPageFrameOption()
    option.weather.iconName = 'wi:day-rain'
    option.weather.iconUrl = '/weather-default.png'

    const result = normalizePageFrameOption(option)
    expect(resolvePageFrameWeatherImage(result.weather)).toBe('')
    expect(resolvePageFrameWeatherIconName(result.weather)).toBe('wi:day-rain')
  })

  it('为旧场景自动补齐预置天气图片，并保留显式清空的列表', () => {
    const legacy = createDefaultPageFrameOption() as unknown as {
      weather: { images?: unknown }
    }
    delete legacy.weather.images
    expect(normalizePageFrameOption(legacy).weather.images).toHaveLength(13)

    const empty = createDefaultPageFrameOption()
    empty.weather.images = []
    expect(normalizePageFrameOption(empty).weather.images).toEqual([])
  })

  it('将旧天气槽位中的时间迁移为独立时间槽位', () => {
    const legacy = createDefaultPageFrameOption() as unknown as {
      weather: { time?: unknown }
      time?: unknown
    }
    legacy.weather.time = '09:30:00'
    delete legacy.time
    const result = normalizePageFrameOption(legacy)
    expect(result.time.time).toBe('09:30:00')
    expect(result.time.date).toBe('2026-07-07')
  })

  it('将旧版框架级跳转方式迁移为各菜单的默认打开方式', () => {
    const legacy = createDefaultPageFrameOption() as unknown as {
      openInNewWindow: boolean
      menuChildren: Array<Record<string, unknown>>
    }
    legacy.openInNewWindow = true
    delete legacy.menuChildren[0].openInNewWindow
    const result = normalizePageFrameOption(legacy)
    expect(result.menuChildren[0].openInNewWindow).toBe(true)
    expect(result).not.toHaveProperty('openInNewWindow')
  })

  it('按 parentId 组装三级菜单并截断更深层级', () => {
    const menus = normalizePageFrameMenuData([
      { id: 'root', label: '根', side: 'right' },
      { id: 'child', label: '二级', parentId: 'root' },
      { id: 'grandchild', label: '三级', parentId: 'child' },
      { id: 'ignored-depth', label: '四级', parentId: 'grandchild' },
    ])
    expect(menus).toHaveLength(1)
    expect(menus[0].side).toBe('right')
    expect(menus[0].children[0].children[0].label).toBe('三级')
    expect(menus[0].children[0].children[0].children).toEqual([])
  })

  it('接口未指定 side 时按可见根数量分配且奇数左侧多一个', () => {
    const menus = normalizePageFrameMenuData([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ])
    expect(menus.map((item) => item.side)).toEqual(['left', 'left', 'right'])
  })

  it('空菜单接口值不会产生替换数组', () => {
    expect(normalizePageFrameMenuData([])).toEqual([])
    expect(normalizePageFrameMenuData('invalid json')).toEqual([])
    const option = createDefaultPageFrameOption()
    expect(findPageFrameChild(option, option.title.id)).toBe(option.title)
  })

  it('一级菜单只能在所属左右槽位内排序，并支持显隐和删除', () => {
    const option = createDefaultPageFrameOption()
    const left = option.menuChildren.filter((item) => item.side === 'left')
    const rightFirstId = option.menuChildren.find((item) => item.side === 'right')!.id
    left[0].visible = false
    expect(movePageFrameMenuChild(option, left[0].id, 1)).toBe(true)
    expect(
      option.menuChildren.filter((item) => item.side === 'left').map((item) => item.id),
    ).toEqual([left[1].id, left[0].id, left[2].id])
    expect(option.menuChildren.find((item) => item.side === 'right')!.id).toBe(rightFirstId)
    expect(left[0].visible).toBe(false)
    expect(removePageFrameMenuChild(option, left[0].id)).toBe(true)
    expect(option.menuChildren.some((item) => item.id === left[0].id)).toBe(false)
  })

  it('删除默认菜单后自动回退到剩余菜单', () => {
    const option = createDefaultPageFrameOption()
    const defaultMenuId = option.defaultMenuId

    expect(removePageFrameMenuChild(option, defaultMenuId)).toBe(true)
    expect(option.defaultMenuId).toBe(option.menuChildren[0].id)
  })

  it('菜单图标可分别配置，且缺少选中图标时回退到普通图标', () => {
    const option = createDefaultPageFrameOption()
    const menu = option.menuChildren[0]
    menu.iconUrl = '/menu.png'
    expect(getPageFrameMenuIcon(menu, false)).toBe('/menu.png')
    expect(getPageFrameMenuIcon(menu, true)).toBe('/menu.png')

    menu.activeIconUrl = '/menu-active.png'
    expect(getPageFrameMenuIcon(menu, true)).toBe('/menu-active.png')
    expect(getPageFrameMenuIcon(menu, false)).toBe('/menu.png')
  })
})
