import { describe, expect, it } from 'vitest'
import { getImageShapeStyle, normalizeImageShape } from '../shape'

describe('二维图片边缘形状', () => {
  it('支持圆形、三角形、五角星和六边形裁剪路径', () => {
    expect(getImageShapeStyle('circle', 12)).toEqual({
      borderRadius: '0',
      clipPath: 'circle(50% at 50% 50%)',
    })
    expect(getImageShapeStyle('triangle', 12).clipPath).toContain('polygon(')
    expect(getImageShapeStyle('pentagram', 12).clipPath).toContain('polygon(')
    expect(getImageShapeStyle('hexagon', 12).clipPath).toContain('polygon(')
  })

  it('矩形保留圆角，未知或缺失形状安全回退', () => {
    expect(getImageShapeStyle('rectangle', 16)).toEqual({
      borderRadius: '16px',
      clipPath: 'none',
    })
    expect(getImageShapeStyle(undefined, 16)).toEqual({
      borderRadius: '16px',
      clipPath: 'none',
    })
    expect(normalizeImageShape('unknown')).toBe('rectangle')
  })
})
