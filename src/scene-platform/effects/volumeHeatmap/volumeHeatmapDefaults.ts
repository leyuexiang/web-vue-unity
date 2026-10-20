import type {
  VolumeHeatmapParams,
  VolumeHeatmapEffectSpec,
  VolumeHeatmapGenerationParams,
  VolumeHeatmapRenderingParams,
} from './volumeHeatmapTypes'
import type { SceneObject, SceneTransform } from '../../core/types'
import type { VolumeHeatmapAnchor } from './volumeHeatmapTypes'

/** 首期色带使用冷到暖的连续映射，避免没有配置时出现全透明体。 */
export const DEFAULT_VOLUME_TRANSFER_STOPS = [
  { value: 0, color: '#1646c8', opacity: 0 },
  { value: 0.25, color: '#23b7ff', opacity: 0.18 },
  { value: 0.5, color: '#ffe75b', opacity: 0.42 },
  { value: 0.75, color: '#ff8a32', opacity: 0.68 },
  { value: 1, color: '#d7191c', opacity: 0.92 },
] as const

/**
 * 静态演示场的默认体素化参数。
 *
 * 64×64×32 与 Unity 示例相同属于轻量编辑档；高斯标准差使用“体素半径”表达，避免场域缩放后
 * 重新解释世界单位，用户调整立方体尺寸时热点仍保持相同的相对扩散形状。
 */
export const DEFAULT_VOLUME_HEATMAP_GENERATION: Readonly<VolumeHeatmapGenerationParams> = Object.freeze({
  resolution: [64, 64, 32] as [number, number, number],
  pointCount: 120,
  /** 与 Unity 示例按场域尺寸折算后的平滑半径，确保中心热区宽而连续。 */
  gaussianSigma: 8,
  seed: 20260903,
})

/** Unity 热力场材质的默认显示语义：沿视线取最大强度，不强制置顶。 */
export const DEFAULT_VOLUME_HEATMAP_RENDERING: Readonly<VolumeHeatmapRenderingParams> = Object.freeze({
  projectionMode: 'maximum-intensity' as const,
  cutoffPercentage: 1,
  renderOnTop: false,
  textureFilter: 'linear' as const,
})

/** 归一化历史场景缺失的演示体素参数，返回新数组避免面板修改默认对象。 */
export const resolveVolumeHeatmapGeneration = (
  generation?: Partial<VolumeHeatmapGenerationParams>,
): VolumeHeatmapGenerationParams => {
  const resolution = Array.isArray(generation?.resolution) && generation.resolution.length === 3
    ? generation.resolution.map((value, index) => {
        const fallback = DEFAULT_VOLUME_HEATMAP_GENERATION.resolution[index]
        const numeric = Number(value)
        return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : fallback
      }) as [number, number, number]
    : [...DEFAULT_VOLUME_HEATMAP_GENERATION.resolution] as [number, number, number]
  const pointCount = Number(generation?.pointCount)
  const gaussianSigma = Number(generation?.gaussianSigma)
  const seed = Number(generation?.seed)
  return {
    resolution,
    pointCount:
      Number.isSafeInteger(pointCount) && pointCount > 0
        ? pointCount
        : DEFAULT_VOLUME_HEATMAP_GENERATION.pointCount,
    gaussianSigma:
      Number.isFinite(gaussianSigma) && gaussianSigma > 0
        ? gaussianSigma
        : DEFAULT_VOLUME_HEATMAP_GENERATION.gaussianSigma,
    seed: Number.isSafeInteger(seed) ? seed : DEFAULT_VOLUME_HEATMAP_GENERATION.seed,
  }
}

/** 归一化历史场景缺失的显示参数，保证 Runtime 和属性面板共享同一套回退值。 */
export const resolveVolumeHeatmapRendering = (
  rendering?: Partial<VolumeHeatmapRenderingParams>,
): VolumeHeatmapRenderingParams => ({
  projectionMode:
    rendering?.projectionMode === 'volume-composite' ? 'volume-composite' : 'maximum-intensity',
  cutoffPercentage:
    typeof rendering?.cutoffPercentage === 'number' && Number.isFinite(rendering.cutoffPercentage)
      ? Math.min(1, Math.max(0.0001, rendering.cutoffPercentage))
      : DEFAULT_VOLUME_HEATMAP_RENDERING.cutoffPercentage,
  renderOnTop: rendering?.renderOnTop === true,
  textureFilter: rendering?.textureFilter === 'nearest' ? 'nearest' : 'linear',
})

/** 创建独立默认对象，避免属性面板修改时污染其他体积场。 */
export const createDefaultVolumeHeatmapParams = (): VolumeHeatmapParams => ({
  name: '三维热力场',
  pickable: true,
  enabled: true,
  dataSource: 'asset',
  generation: { ...DEFAULT_VOLUME_HEATMAP_GENERATION, resolution: [...DEFAULT_VOLUME_HEATMAP_GENERATION.resolution] },
  valueRange: { mode: 'asset' },
  transferStops: DEFAULT_VOLUME_TRANSFER_STOPS.map((stop) => ({ ...stop })),
  globalOpacity: 1,
  density: 1,
  sampling: { quality: 'medium', stepCount: 96, jitter: true },
  rendering: { ...DEFAULT_VOLUME_HEATMAP_RENDERING },
  clipping: { minimum: [0, 0, 0], maximum: [1, 1, 1] },
  lighting: { enabled: false, gradientStrength: 0.25 },
  query: { enabled: true, interpolation: 'nearest' },
  legend: { visible: true, unit: '', decimals: 2 },
})

/** 创建首期本地体积热力场效果，资产地址由资源面板补齐。 */
export const createDefaultVolumeHeatmapEffect = (
  id: string,
  asset: VolumeHeatmapEffectSpec['assetRefs'][number],
  anchor: VolumeHeatmapAnchor = {
    kind: 'local-box',
    center: [0, 0, 0],
    size: [10, 10, 10],
    rotation: [0, 0, 0],
  },
): VolumeHeatmapEffectSpec => {
  const params = createDefaultVolumeHeatmapParams()
  // 拖入演示资产时自动把数据来源写入参数，便于后续在面板中切换到真实资产。
  if (asset.metadata?.demo === true || asset.id === 'volume-field-pending') params.dataSource = 'demo'
  return {
    id,
    type: 'volume-heatmap',
    assetRefs: [asset],
    anchor,
    params,
  }
}

export interface CreateDefaultVolumeHeatmapObjectOptions {
  /** GIS 场景传入地理变换，本地三维继续使用局部变换；对象与效果锚点必须使用同一空间语义。 */
  transform?: SceneTransform
  /** GIS 的灰色透明占位盒使用地理范围；本地场景仍使用可直接体绘制的局部盒。 */
  anchor?: VolumeHeatmapAnchor
}

/** 创建三维功能组件对象；热力场配置嵌入对象快照，成为 SceneStore.objects 的唯一真源。 */
export const createDefaultVolumeHeatmapObject = (
  id: string,
  asset: VolumeHeatmapEffectSpec['assetRefs'][number],
  options: CreateDefaultVolumeHeatmapObjectOptions = {},
): SceneObject => {
  const transform = options.transform ?? {
    kind: 'local' as const,
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number],
  }
  const anchor = options.anchor ?? {
    kind: 'local-box' as const,
    center: [0, 0, 0] as [number, number, number],
    size: [10, 10, 10] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
  }
  const effect = createDefaultVolumeHeatmapEffect(id, asset, anchor)
  return {
    id,
    name: effect.params.name,
    type: 'effect',
    visible: true,
    locked: false,
    order: 0,
    transform,
    asset,
    effect,
    metadata: { componentKind: 'volume-heatmap', pickable: true },
  }
}
