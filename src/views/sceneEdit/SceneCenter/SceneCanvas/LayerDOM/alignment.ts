export interface AlignmentRect {
  id?: string
  l: number
  t: number
  w: number
  h: number
}

export interface WidgetCanvasBounds {
  width: number
  height: number
}

export interface AlignmentGuide {
  axis: 'vertical' | 'horizontal'
  position: number
  start: number
  end: number
}

export interface AlignedWidgetPosition {
  l: number
  t: number
  guides: AlignmentGuide[]
}

type AnchorKind = 'start' | 'center' | 'end'

interface AxisAnchor {
  kind: AnchorKind
  value: number
}

interface SnapCandidate {
  delta: number
  kind: AnchorKind
}

const ANCHOR_KINDS: AnchorKind[] = ['start', 'end', 'center']
const EPSILON = 0.001

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

const getHorizontalAnchors = (rect: AlignmentRect): Record<AnchorKind, number> => ({
  start: rect.l,
  center: rect.l + rect.w / 2,
  end: rect.l + rect.w,
})

const getVerticalAnchors = (rect: AlignmentRect): Record<AnchorKind, number> => ({
  start: rect.t,
  center: rect.t + rect.h / 2,
  end: rect.t + rect.h,
})

const resolveNearestSnap = (
  movingAnchors: Record<AnchorKind, number>,
  targetAnchors: Array<Record<AnchorKind, number>>,
  threshold: number,
  minimumPosition: number,
  maximumPosition: number,
  movingStart: number,
) => {
  const candidates: SnapCandidate[] = []

  targetAnchors.forEach((anchors) => {
    ANCHOR_KINDS.forEach((kind) => {
      const delta = anchors[kind] - movingAnchors[kind]
      const snappedStart = movingStart + delta
      if (
        Math.abs(delta) <= threshold &&
        snappedStart >= minimumPosition - EPSILON &&
        snappedStart <= maximumPosition + EPSILON
      ) {
        candidates.push({ delta, kind })
      }
    })
  })

  return candidates.sort((left, right) => Math.abs(left.delta) - Math.abs(right.delta))[0] || null
}

const mergeGuide = (guides: AlignmentGuide[], guide: AlignmentGuide) => {
  const existingGuide = guides.find(
    (item) => item.axis === guide.axis && Math.abs(item.position - guide.position) < EPSILON,
  )
  if (!existingGuide) {
    guides.push(guide)
    return
  }
  existingGuide.start = Math.min(existingGuide.start, guide.start)
  existingGuide.end = Math.max(existingGuide.end, guide.end)
}

const collectVerticalGuides = (
  movingRect: AlignmentRect,
  targets: AlignmentRect[],
  canvas: WidgetCanvasBounds,
) => {
  const guides: AlignmentGuide[] = []
  const movingAnchors = getHorizontalAnchors(movingRect)

  targets.forEach((target) => {
    const targetAnchors = getHorizontalAnchors(target)
    ANCHOR_KINDS.forEach((kind) => {
      if (Math.abs(movingAnchors[kind] - targetAnchors[kind]) >= EPSILON) return
      mergeGuide(guides, {
        axis: 'vertical',
        position: movingAnchors[kind],
        start: Math.min(movingRect.t, target.t),
        end: Math.max(movingRect.t + movingRect.h, target.t + target.h),
      })
    })
  })

  const canvasAnchors = { start: 0, center: canvas.width / 2, end: canvas.width }
  ANCHOR_KINDS.forEach((kind) => {
    if (Math.abs(movingAnchors[kind] - canvasAnchors[kind]) >= EPSILON) return
    mergeGuide(guides, {
      axis: 'vertical',
      position: movingAnchors[kind],
      start: 0,
      end: canvas.height,
    })
  })

  return guides
}

const collectHorizontalGuides = (
  movingRect: AlignmentRect,
  targets: AlignmentRect[],
  canvas: WidgetCanvasBounds,
) => {
  const guides: AlignmentGuide[] = []
  const movingAnchors = getVerticalAnchors(movingRect)

  targets.forEach((target) => {
    const targetAnchors = getVerticalAnchors(target)
    ANCHOR_KINDS.forEach((kind) => {
      if (Math.abs(movingAnchors[kind] - targetAnchors[kind]) >= EPSILON) return
      mergeGuide(guides, {
        axis: 'horizontal',
        position: movingAnchors[kind],
        start: Math.min(movingRect.l, target.l),
        end: Math.max(movingRect.l + movingRect.w, target.l + target.w),
      })
    })
  })

  const canvasAnchors = { start: 0, center: canvas.height / 2, end: canvas.height }
  ANCHOR_KINDS.forEach((kind) => {
    if (Math.abs(movingAnchors[kind] - canvasAnchors[kind]) >= EPSILON) return
    mergeGuide(guides, {
      axis: 'horizontal',
      position: movingAnchors[kind],
      start: 0,
      end: canvas.width,
    })
  })

  return guides
}

/**
 * 在逻辑画布坐标系中统一处理部件移动：
 * 1. 先把部件（或分组包围框）限制在画布内；
 * 2. 再吸附到画布和其他可见部件的左/中/右、上/中/下基准线；
 * 3. 返回本帧需要显示的辅助线，渲染层无需重复几何计算。
 */
export const resolveAlignedWidgetPosition = (
  movingRect: AlignmentRect,
  proposedPosition: Pick<AlignmentRect, 'l' | 't'>,
  targets: AlignmentRect[],
  canvas: WidgetCanvasBounds,
  threshold = 5,
): AlignedWidgetPosition => {
  const maxLeft = Math.max(0, canvas.width - movingRect.w)
  const maxTop = Math.max(0, canvas.height - movingRect.h)
  const boundedLeft = clamp(proposedPosition.l, 0, maxLeft)
  const boundedTop = clamp(proposedPosition.t, 0, maxTop)
  const boundedRect = { ...movingRect, l: boundedLeft, t: boundedTop }
  const horizontalTargetAnchors = [
    ...targets.map(getHorizontalAnchors),
    { start: 0, center: canvas.width / 2, end: canvas.width },
  ]
  const verticalTargetAnchors = [
    ...targets.map(getVerticalAnchors),
    { start: 0, center: canvas.height / 2, end: canvas.height },
  ]
  const horizontalSnap = resolveNearestSnap(
    getHorizontalAnchors(boundedRect),
    horizontalTargetAnchors,
    threshold,
    0,
    maxLeft,
    boundedLeft,
  )
  const verticalSnap = resolveNearestSnap(
    getVerticalAnchors(boundedRect),
    verticalTargetAnchors,
    threshold,
    0,
    maxTop,
    boundedTop,
  )
  const l = clamp(boundedLeft + (horizontalSnap?.delta || 0), 0, maxLeft)
  const t = clamp(boundedTop + (verticalSnap?.delta || 0), 0, maxTop)
  const alignedRect = { ...movingRect, l, t }

  return {
    l,
    t,
    guides: [
      ...(horizontalSnap ? collectVerticalGuides(alignedRect, targets, canvas) : []),
      ...(verticalSnap ? collectHorizontalGuides(alignedRect, targets, canvas) : []),
    ],
  }
}
