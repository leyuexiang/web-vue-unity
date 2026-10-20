import { describe, expect, it } from 'vitest'
import Config from '../config'
import { PAGE_PAGINATION_APPEARANCE_DEFAULTS, normalizePagePaginationSize } from '../appearance'
import { PAGE_PAGINATION_SAMPLE_IMAGES } from '../sampleImages'
import {
  PAGE_PAGINATION_PAGE_SIZE_RANGE,
  createPagePaginationItem,
  getPagePaginationArrowImage,
  getPagePaginationImage,
  getPagePaginationLabelStyle,
  normalizePagePaginationItems,
  normalizePagePaginationPageSize,
} from '../model'

describe('页面分页器图文按钮模型', () => {
  it('限制每屏数量，同时保留所有按钮供翻页访问', () => {
    expect(normalizePagePaginationPageSize(undefined)).toBe(4)
    expect(normalizePagePaginationPageSize(0)).toBe(PAGE_PAGINATION_PAGE_SIZE_RANGE.min)
    expect(normalizePagePaginationPageSize(99)).toBe(PAGE_PAGINATION_PAGE_SIZE_RANGE.max)
    expect(normalizePagePaginationPageSize(3.8)).toBe(3)
    expect(
      normalizePagePaginationItems(
        Array.from({ length: 12 }, (_, i) => createPagePaginationItem(i)),
      ),
    ).toHaveLength(12)
  })

  it('兼容旧字体图标，且用户自定义图片优先于示例图', () => {
    const items = normalizePagePaginationItems([
      { id: 'one', icon: 'uim:house-user', eventValue: 'overview' },
      {
        id: 'two',
        icon: 'uim:house-user',
        iconUrl: ' /custom.png ',
        activeIconUrl: '/selected.png',
      },
      { id: 'empty', icon: 'uim:house-user', iconUrl: '' },
      null,
      [],
    ])
    expect(items).toHaveLength(3)
    expect(items[0].iconUrl).toBe(PAGE_PAGINATION_SAMPLE_IMAGES.overview.iconUrl)
    expect(items[0].eventValue).toBe('overview')
    expect(items[1].iconUrl).toBe('/custom.png')
    expect(items[1].activeIconUrl).toBe('/selected.png')
    expect(items[2].iconUrl).toBe('')
  })

  it('选中图片缺省时回退普通图，配置图片后精确切换', () => {
    const item = {
      ...createPagePaginationItem(0),
      iconUrl: '/normal.png',
      activeIconUrl: '/active.png',
    }
    expect(getPagePaginationImage(item, false)).toBe('/normal.png')
    expect(getPagePaginationImage(item, true)).toBe('/active.png')
    expect(getPagePaginationImage({ ...item, activeIconUrl: '' }, true)).toBe('/normal.png')
    expect(getPagePaginationImage(createPagePaginationItem(0), true)).toBe('')
  })

  it('箭头图片地址可序列化，清空后回退 CSS 箭头', () => {
    const config = new Config()
    config.option.previousArrowUrl = '  /previous-arrow.svg  '
    config.option.nextArrowUrl = '/next-arrow.svg'
    config.option.previousArrowResourceKey = 'oss-previous-arrow'
    config.option.nextArrowResourceKey = 'oss-next-arrow'

    expect(getPagePaginationArrowImage(config.option, 'previous')).toBe('/previous-arrow.svg')
    expect(getPagePaginationArrowImage(config.option, 'next')).toBe('/next-arrow.svg')
    expect(JSON.parse(JSON.stringify(config.option))).toMatchObject({
      previousArrowUrl: '  /previous-arrow.svg  ',
      nextArrowUrl: '/next-arrow.svg',
      previousArrowResourceKey: 'oss-previous-arrow',
      nextArrowResourceKey: 'oss-next-arrow',
    })

    config.option.previousArrowUrl = ''
    config.option.nextArrowUrl = '   '
    expect(getPagePaginationArrowImage(config.option, 'previous')).toBe('')
    expect(getPagePaginationArrowImage(config.option, 'next')).toBe('')
  })

  it('将每个按钮的字体、字号、颜色和粗细转换为运行时样式', () => {
    expect(
      getPagePaginationLabelStyle(
        {
          ...createPagePaginationItem(0),
          fontFamily: 'Arial, sans-serif',
          fontSize: 26,
          fontColor: '#ffcc00',
          fontWeight: 'bold',
        },
        {
          fontFamily: 'sans-serif',
          fontSize: 20,
          fontColor: '#fff',
          fontWeight: 'normal',
        },
      ),
    ).toEqual({
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      color: '#ffcc00',
      fontWeight: 'bold',
    })
  })

  it('删除后新增不重复使用已有事件值', () => {
    const existing = [createPagePaginationItem(0), createPagePaginationItem(2)]
    const item = createPagePaginationItem(2, existing)
    expect(item.label).toBe('页签3')
    expect(item.eventValue).toBe('page-4')
    expect(item.id).not.toBe(existing[0].id)
  })

  it('多个实例不共享按钮，图片配置可以完整序列化', () => {
    const first = new Config()
    const second = new Config()
    first.option.items[0].label = '独立按钮'
    first.option.items[0].activeIconUrl = '/custom-active.png'
    expect(second.option.items[0].label).toBe('工厂总览')
    expect(second.option.items[0].activeIconUrl).toBe('')
    expect(JSON.parse(JSON.stringify(first.option)).items[0]).toEqual(first.option.items[0])
  })

  it('旧场景缺少尺寸、控件清空及越界时有一致回退', () => {
    expect(normalizePagePaginationSize('imageWidth', undefined)).toBe(
      PAGE_PAGINATION_APPEARANCE_DEFAULTS.imageWidth,
    )
    expect(normalizePagePaginationSize('imageHeight', null)).toBe(
      PAGE_PAGINATION_APPEARANCE_DEFAULTS.imageHeight,
    )
    expect(normalizePagePaginationSize('fontSize', NaN)).toBe(
      PAGE_PAGINATION_APPEARANCE_DEFAULTS.fontSize,
    )
    expect(normalizePagePaginationSize('imageTextGap', -10)).toBe(0)
    expect(normalizePagePaginationSize('imageWidth', 999)).toBe(512)
  })
})
