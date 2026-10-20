import { describe, expect, it } from 'vitest'
import {
  PAGE_MENU_FONT_SIZE_RANGE,
  PAGE_MENU_START_SPACING_RANGE,
  PAGE_MENU_SUBTITLE_SPACING_RANGE,
  PAGE_MENU_TITLE_OFFSET_RANGE,
  normalizePageMenuFontSize,
  normalizePageMenuOffset,
  normalizePageMenuTitlePosition,
  toPageMenuCssImage,
} from '../appearance'

describe('页面菜单外观配置', () => {
  it('将异常标题字号限制在组件安全范围内', () => {
    const range = PAGE_MENU_FONT_SIZE_RANGE.title

    expect(normalizePageMenuFontSize('invalid', range, 25)).toBe(25)
    expect(normalizePageMenuFontSize(4, range, 25)).toBe(range.min)
    expect(normalizePageMenuFontSize(100, range, 25)).toBe(range.max)
  })

  it('独立限制副标题字号与主副标题间隔', () => {
    const fontSizeRange = PAGE_MENU_FONT_SIZE_RANGE.subtitle

    expect(normalizePageMenuFontSize(undefined, fontSizeRange, 9)).toBe(9)
    expect(normalizePageMenuFontSize(2, fontSizeRange, 9)).toBe(fontSizeRange.min)
    expect(normalizePageMenuFontSize(99, fontSizeRange, 9)).toBe(fontSizeRange.max)
    expect(normalizePageMenuOffset(-1, PAGE_MENU_SUBTITLE_SPACING_RANGE)).toBe(
      PAGE_MENU_SUBTITLE_SPACING_RANGE.min,
    )
    expect(normalizePageMenuOffset(99, PAGE_MENU_SUBTITLE_SPACING_RANGE)).toBe(
      PAGE_MENU_SUBTITLE_SPACING_RANGE.max,
    )
  })

  it('将按钮起始距离限制在导航栏安全范围内', () => {
    expect(normalizePageMenuOffset(undefined, PAGE_MENU_START_SPACING_RANGE, 18)).toBe(18)
    expect(normalizePageMenuOffset(-1, PAGE_MENU_START_SPACING_RANGE, 18)).toBe(
      PAGE_MENU_START_SPACING_RANGE.min,
    )
    expect(normalizePageMenuOffset(999, PAGE_MENU_START_SPACING_RANGE, 18)).toBe(
      PAGE_MENU_START_SPACING_RANGE.max,
    )
  })

  it('将资源地址安全转换为 CSS 背景图片值', () => {
    expect(toPageMenuCssImage('')).toBe('none')
    expect(toPageMenuCssImage(' https://example.com/menu background.png ')).toBe(
      'url("https://example.com/menu background.png")',
    )
  })

  it('兼容旧场景并限制标题位置为三个有效模式', () => {
    expect(normalizePageMenuTitlePosition('left')).toBe('left')
    expect(normalizePageMenuTitlePosition('right')).toBe('right')
    expect(normalizePageMenuTitlePosition('center')).toBe('center')
    expect(normalizePageMenuTitlePosition(undefined)).toBe('center')
    expect(normalizePageMenuTitlePosition('invalid')).toBe('center')
  })

  it('将标题水平和垂直微调限制在安全像素范围内', () => {
    expect(normalizePageMenuOffset(999, PAGE_MENU_TITLE_OFFSET_RANGE.horizontal)).toBe(
      PAGE_MENU_TITLE_OFFSET_RANGE.horizontal.max,
    )
    expect(normalizePageMenuOffset(-999, PAGE_MENU_TITLE_OFFSET_RANGE.vertical)).toBe(
      PAGE_MENU_TITLE_OFFSET_RANGE.vertical.min,
    )
    expect(normalizePageMenuOffset(undefined, PAGE_MENU_TITLE_OFFSET_RANGE.horizontal)).toBe(0)
  })
})
