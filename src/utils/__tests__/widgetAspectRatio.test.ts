import { describe, expect, it } from 'vitest'
import {
  getAspectLockedRect,
  getWidgetAspectRatio,
  getWidgetSize,
  toggleWidgetAspectRatio,
} from '../widgetAspectRatio'

/** 用非整数比例覆盖窄线条组件，避免仅用正方形掩盖精度与方向错误。 */
const createAttr = () => ({ l: 20, t: 30, w: 289, h: 10, zIndex: 0, aspectRatio: 0 })

describe('二维组件比例锁', () => {
  it('锁定当前比例，输入两轴同步，解锁后独立修改，再锁定采集新比例', () => {
    const attr = createAttr()
    toggleWidgetAspectRatio(attr)
    expect(getWidgetSize(attr, 'w', 578)).toEqual({ w: 578, h: 20 })
    Object.assign(attr, getWidgetSize(attr, 'h', 7))
    expect(attr.w / attr.h).toBeCloseTo(28.9)
    toggleWidgetAspectRatio(attr)
    Object.assign(attr, getWidgetSize(attr, 'w', 140))
    expect(attr.h).toBe(7)
    toggleWidgetAspectRatio(attr)
    expect(attr.aspectRatio).toBe(20)
    expect(getWidgetAspectRatio(JSON.parse(JSON.stringify(attr)))).toBe(20)
  })

  it('旧场景自由缩放，零尺寸不能锁定；锁定后缩到零仍可恢复', () => {
    expect(getWidgetAspectRatio({})).toBe(0)
    const attr = createAttr()
    attr.h = 0
    toggleWidgetAspectRatio(attr)
    expect(attr.aspectRatio).toBe(0)
    attr.h = 10
    toggleWidgetAspectRatio(attr)
    Object.assign(attr, getWidgetSize(attr, 'w', 0))
    expect(getWidgetSize(attr, 'h', 10)).toEqual({ w: 289, h: 10 })
  })

  // 八个控制点都必须维持同一比例，并固定对应的对角或对边中点。
  it.each([
    [false, undefined],
    [true, undefined],
    [undefined, false],
    [undefined, true],
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ] as const)('拖拽方向 %s / %s 保持比例与锚点', (horizontal, vertical) => {
    const attr = createAttr()
    toggleWidgetAspectRatio(attr)
    const rect = getAspectLockedRect(attr, horizontal, vertical, 15, 3)
    expect(rect.w / rect.h).toBeCloseTo(attr.aspectRatio)
    const anchorX = horizontal === undefined ? 0.5 : horizontal ? 0 : 1
    const anchorY = vertical === undefined ? 0.5 : vertical ? 0 : 1
    expect(rect.l + rect.w * anchorX).toBeCloseTo(attr.l + attr.w * anchorX)
    expect(rect.t + rect.h * anchorY).toBeCloseTo(attr.t + attr.h * anchorY)
    const collapsed = getAspectLockedRect(
      attr,
      horizontal,
      vertical,
      horizontal ? -10000 : 10000,
      vertical ? -10000 : 10000,
    )
    expect(collapsed.w).toBe(0)
    expect(collapsed.h).toBe(0)
  })
})
