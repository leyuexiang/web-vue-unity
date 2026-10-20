import type { CSSProperties } from 'vue'

/**
 * 图片边缘形状。
 *
 * `rectangle` 保留原有矩形图片行为，并继续支持 `borderRadius` 圆角；其余形状通过
 * CSS `clip-path` 裁剪图片边界，避免为每种形状创建额外的 DOM 或画布节点。
 */
export type ImageShape = 'rectangle' | 'circle' | 'triangle' | 'pentagram' | 'hexagon'

export const IMAGE_SHAPE_OPTIONS: ReadonlyArray<{ label: string; value: ImageShape }> = [
  { label: '矩形', value: 'rectangle' },
  { label: '圆形', value: 'circle' },
  { label: '三角形', value: 'triangle' },
  { label: '五角星', value: 'pentagram' },
  { label: '六边形', value: 'hexagon' },
]

/** 非矩形形状对应的多边形路径；坐标使用百分比，可适配任意组件宽高。 */
const IMAGE_SHAPE_CLIP_PATH: Readonly<Partial<Record<ImageShape, string>>> = {
  circle: 'circle(50% at 50% 50%)',
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  pentagram:
    'polygon(50% 0%, 61.8% 34.5%, 97.6% 34.5%, 69.1% 55.5%, 79.4% 90.5%, ' +
    '50% 69%, 20.6% 90.5%, 30.9% 55.5%, 2.4% 34.5%, 38.2% 34.5%)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
}

/** 将历史数据中的未知值归一到矩形，保证新增配置不会破坏旧场景渲染。 */
export const normalizeImageShape = (shape: unknown): ImageShape => {
  if (typeof shape !== 'string') return 'rectangle'
  return IMAGE_SHAPE_OPTIONS.some((item) => item.value === shape)
    ? (shape as ImageShape)
    : 'rectangle'
}

/**
 * 生成图片组件的边缘样式。
 *
 * 非矩形形状关闭圆角，避免 `border-radius` 与 `clip-path` 叠加后出现不可预期的边界；
 * 矩形则保留旧配置中的圆角值，且将非法数值降级为 0。
 */
export const getImageShapeStyle = (shape: unknown, borderRadius: unknown): CSSProperties => {
  const normalizedShape = normalizeImageShape(shape)
  const radius = Number(borderRadius)
  return {
    borderRadius:
      normalizedShape === 'rectangle' && Number.isFinite(radius) ? `${Math.max(radius, 0)}px` : '0',
    clipPath: IMAGE_SHAPE_CLIP_PATH[normalizedShape] ?? 'none',
  }
}
