import type { WidgetCanvasConfig } from '@/types/threeScene'

/**
 * 场景统一设计舞台的默认发布尺寸。
 * 新场景默认采用 1920x1080，用户可在场景面板中改成自己的最终发布尺寸。
 */
export const DEFAULT_SCENE_STAGE_SIZE: WidgetCanvasConfig = {
  width: 1920,
  height: 1080,
}

/**
 * 舞台尺寸输入保护范围。
 * 尺寸会直接影响 WebGL 渲染器和 DOM 舞台的逻辑尺寸，因此需要限制极端值，避免 0 尺寸或超大尺寸拖垮渲染性能。
 */
export const SCENE_STAGE_SIZE_LIMIT = {
  min: 100,
  max: 10000,
} as const

export interface SceneStageLayout extends WidgetCanvasConfig {
  scale: number
  left: number
  top: number
}

/**
 * 复制默认舞台尺寸。
 * 返回新对象，避免调用方误改常量后影响全局布局。
 */
export const createDefaultSceneStageSize = (): WidgetCanvasConfig => ({
  ...DEFAULT_SCENE_STAGE_SIZE,
})

/**
 * 归一化单个舞台尺寸值。
 *
 * @param value - 用户输入或场景配置中的原始尺寸。
 * @param fallback - 原始尺寸不可用时使用的兜底值。
 * @returns 经过取整和上下限保护后的尺寸。
 */
export const normalizeSceneStageDimension = (value: unknown, fallback: number): number => {
  const numericValue = Number(value)
  const safeValue = Number.isFinite(numericValue) ? numericValue : fallback
  return Math.min(
    SCENE_STAGE_SIZE_LIMIT.max,
    Math.max(SCENE_STAGE_SIZE_LIMIT.min, Math.round(safeValue)),
  )
}

/**
 * 归一化完整舞台尺寸。
 *
 * @param size - 用户输入或场景配置中的舞台尺寸。
 * @param fallback - 缺失字段使用的兜底尺寸。
 * @returns 可直接用于编辑、预览和发布舞台的安全尺寸。
 */
export const normalizeSceneStageSize = (
  size?: Partial<WidgetCanvasConfig> | null,
  fallback: WidgetCanvasConfig = DEFAULT_SCENE_STAGE_SIZE,
): WidgetCanvasConfig => ({
  width: normalizeSceneStageDimension(size?.width, fallback.width),
  height: normalizeSceneStageDimension(size?.height, fallback.height),
})

/**
 * 判断两份舞台尺寸是否一致。
 * 面板提交时用它跳过无效历史记录，避免用户重复失焦造成命令栈膨胀。
 */
export const isSameSceneStageSize = (
  source: WidgetCanvasConfig,
  target: WidgetCanvasConfig,
) => source.width === target.width && source.height === target.height

/**
 * 按 go-view 的适配思路计算“完整显示”的等比缩放布局。
 * 容器比例和设计舞台比例不一致时只居中留空边，不裁剪也不拉伸画面。
 */
export const calculateSceneStageLayout = (
  viewportWidth: number,
  viewportHeight: number,
  stageSize: WidgetCanvasConfig = DEFAULT_SCENE_STAGE_SIZE,
): SceneStageLayout => {
  const { width, height } = normalizeSceneStageSize(stageSize)
  const safeViewportWidth = Math.max(0, viewportWidth || 0)
  const safeViewportHeight = Math.max(0, viewportHeight || 0)
  const rawScale = Math.min(safeViewportWidth / width, safeViewportHeight / height)
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1

  return {
    width,
    height,
    scale,
    left: (safeViewportWidth - width * scale) / 2,
    top: (safeViewportHeight - height * scale) / 2,
  }
}

/**
 * 计算允许裁切边缘的等比铺满布局。
 *
 * 仅供明确需要画面铺满视口的特殊场景使用。发布和预览需要完整显示设计画布时，
 * 应使用 calculateSceneStageLayout，让多余空间留在画布两侧或上下，避免裁掉二维组件。
 */
export const calculateSceneStageCoverLayout = (
  viewportWidth: number,
  viewportHeight: number,
  stageSize: WidgetCanvasConfig = DEFAULT_SCENE_STAGE_SIZE,
): SceneStageLayout => {
  const { width, height } = normalizeSceneStageSize(stageSize)
  const safeViewportWidth = Math.max(0, viewportWidth || 0)
  const safeViewportHeight = Math.max(0, viewportHeight || 0)
  const rawScale = Math.max(safeViewportWidth / width, safeViewportHeight / height)
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1

  return {
    width,
    height,
    scale,
    left: (safeViewportWidth - width * scale) / 2,
    top: (safeViewportHeight - height * scale) / 2,
  }
}

/**
 * 计算专业 3D 视口的铺满布局。
 *
 * 与发布舞台不同，纯 3D 编辑视口不需要保留固定设计分辨率留白；它应该直接占满
 * 当前可见容器，让网格、相机控制和模型编辑成为视觉中心。
 */
export const calculateSceneViewportFillLayout = (
  viewportWidth: number,
  viewportHeight: number,
): SceneStageLayout => {
  const width = Math.max(0, Math.round(viewportWidth || 0))
  const height = Math.max(0, Math.round(viewportHeight || 0))

  return {
    width,
    height,
    scale: 1,
    left: 0,
    top: 0,
  }
}
