import type { WidgetAttr } from '@/packages/components/type'

/** 只接受有限正比例，兼容旧场景缺省值以及无效的外部配置。 */
export const getWidgetAspectRatio = (attr: Pick<WidgetAttr, 'aspectRatio'>): number =>
  Number.isFinite(attr.aspectRatio) && attr.aspectRatio! > 0 ? attr.aspectRatio! : 0

/** 保存锁定瞬间的比例；零尺寸没有有效比例，需先设置正宽高。 */
export const toggleWidgetAspectRatio = (attr: WidgetAttr): void => {
  attr.aspectRatio = getWidgetAspectRatio(attr)
    ? 0
    : attr.w > 0 && attr.h > 0 && Number.isFinite(attr.w / attr.h)
      ? attr.w / attr.h
      : 0
}

/** 输入与拖拽共用尺寸计算，不分别取整，避免连续调整造成比例漂移。 */
export const getWidgetSize = (attr: WidgetAttr, axis: 'w' | 'h', value: number) => {
  const ratio = getWidgetAspectRatio(attr)
  const size = Math.max(0, value)
  return ratio
    ? axis === 'w'
      ? { w: size, h: size / ratio }
      : { w: size * ratio, h: size }
    : { w: axis === 'w' ? size : attr.w, h: axis === 'h' ? size : attr.h }
}

/**
 * 角点按位移在比例对角线上的投影缩放，避免横纵主轴切换导致跳动。
 * 角点固定对角；单边固定对边中点。收缩到零后仍保留比例，可再次放大。
 */
export const getAspectLockedRect = (
  origin: WidgetAttr,
  horizontal: boolean | undefined,
  vertical: boolean | undefined,
  dx: number,
  dy: number,
) => {
  const ratio = getWidgetAspectRatio(origin)
  const widthDelta = horizontal === undefined ? 0 : horizontal ? dx : -dx
  const heightDelta = vertical === undefined ? 0 : vertical ? dy : -dy
  const size =
    horizontal === undefined
      ? getWidgetSize(origin, 'h', origin.h + heightDelta)
      : vertical === undefined
        ? getWidgetSize(origin, 'w', origin.w + widthDelta)
        : getWidgetSize(
            origin,
            'w',
            origin.w + (widthDelta + heightDelta / ratio) / (1 + 1 / ratio ** 2),
          )
  return {
    ...size,
    l:
      origin.l +
      (horizontal === undefined ? (origin.w - size.w) / 2 : horizontal ? 0 : origin.w - size.w),
    t:
      origin.t +
      (vertical === undefined ? (origin.h - size.h) / 2 : vertical ? 0 : origin.h - size.h),
  }
}
