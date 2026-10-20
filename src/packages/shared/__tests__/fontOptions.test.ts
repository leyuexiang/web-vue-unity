import { describe, expect, it } from 'vitest'
import { FONT_FAMILY_OPTIONS } from '../fontOptions'
import { PAGE_PAGINATION_FONT_OPTIONS } from '../../components/Widget/PagePagination/appearance'

/** 字体列表提取不能改变分页器已保存的字体值，也不能创建重复菜单项。 */
describe('二维组件公共字体选项', () => {
  it('分页器沿用同一列表，保持已有配置兼容', () => {
    expect(PAGE_PAGINATION_FONT_OPTIONS).toBe(FONT_FAMILY_OPTIONS)
    expect(FONT_FAMILY_OPTIONS.find((font) => font.label === '微软雅黑')?.value).toBe(
      '"Microsoft YaHei", "PingFang SC", sans-serif',
    )
  })

  it('所有选项唯一且包含通用字体回退', () => {
    expect(new Set(FONT_FAMILY_OPTIONS.map((font) => font.value)).size).toBe(
      FONT_FAMILY_OPTIONS.length,
    )
    for (const font of FONT_FAMILY_OPTIONS) {
      expect(font.label).not.toBe('')
      expect(font.value).toMatch(/(?:sans-serif|serif)$/)
    }
  })
})
