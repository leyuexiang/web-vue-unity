import type { AssetRef, EffectSpec } from '../../core/types'

/** 体素数据的坐标范围；本地三维使用场景单位，GIS 适配器使用经纬高。 */
export type VolumeHeatmapAnchor =
  | {
      kind: 'local-box'
      center: [number, number, number]
      size: [number, number, number]
      rotation?: [number, number, number]
    }
  | {
      kind: 'geo-box'
      west: number
      south: number
      east: number
      north: number
      minimumHeight: number
      maximumHeight: number
    }

/** 色带节点同时描述颜色和局部不透明度，运行时会转换为一维传输函数纹理。 */
export interface VolumeTransferStop {
  value: number
  color: string
  opacity: number
}

/** 体素清单中的字段元数据，不保存实际二进制负载。 */
export interface VolumeFieldAssetMetadata {
  dimensions: [number, number, number]
  scalarType: 'uint8' | 'uint16' | 'float32'
  axisOrder: 'xyz' | 'xzy' | 'yxz' | 'yzx' | 'zxy' | 'zyx'
  valueScale?: number
  valueOffset?: number
  noDataValue?: number
  minimum?: number
  maximum?: number
}

/** 静态点数据生成规则；点在体积盒内使用 0–1 归一化坐标表示。 */
export interface VolumeHeatmapGenerationParams {
  resolution: [number, number, number]
  pointCount: number
  gaussianSigma: number
  seed: number
}

/** 与 Unity Heatmap 材质保持一致的投影和采样显示设置。 */
export interface VolumeHeatmapRenderingParams {
  projectionMode: 'maximum-intensity' | 'volume-composite'
  cutoffPercentage: number
  renderOnTop: boolean
  textureFilter: 'linear' | 'nearest'
}

/** 体积热力场的可序列化显示参数。 */
/**
 * 体积热力场的可序列化显示参数。
 *
 * 继承普通对象索引约束，使其可安全作为统一 EffectSpec.params 的领域快照，同时仍保留具体字段的
 * 静态类型；这里不承载纹理、体素数组或任何 Three.js 运行时对象。
 */
export interface VolumeHeatmapParams extends Record<string, unknown> {
  /** 三维组件通用基础属性；与看板基础面板保持同一语义。 */
  name: string
  pickable: boolean
  enabled: boolean
  /** 数据来源选项：demo 使用内置静态测试体，asset 使用 assetRefs 指向的真实体素资产。 */
  dataSource: 'demo' | 'asset'
  /**
   * 点密度体素化参数。仅在静态演示数据源下生效；真实体素资产仍以 assetRefs 的清单为准。
   * 参数对应 Unity HeatmapTextureGenerator 的 resolution、点数量和高斯平滑设置。
   */
  generation?: {
    resolution: [number, number, number]
    pointCount: number
    gaussianSigma: number
    seed: number
  }
  valueRange: {
    mode: 'asset' | 'fixed'
    minimum?: number
    maximum?: number
  }
  transferStops: VolumeTransferStop[]
  globalOpacity: number
  density: number
  sampling: {
    quality: 'low' | 'medium' | 'high'
    stepCount: number
    jitter: boolean
  }
  /** 与 Unity 射线步进材质对应的投影、截断、深度和纹理采样设置。 */
  rendering?: {
    projectionMode: 'maximum-intensity' | 'volume-composite'
    cutoffPercentage: number
    renderOnTop: boolean
    textureFilter: 'linear' | 'nearest'
  }
  clipping: {
    minimum: [number, number, number]
    maximum: [number, number, number]
  }
  lighting: {
    enabled: boolean
    gradientStrength: number
  }
  query: {
    enabled: boolean
    interpolation: 'nearest' | 'linear'
  }
  legend: {
    visible: boolean
    unit: string
    decimals: number
  }
}

/** 体积热力场逻辑资产；真实数据只在 Runtime 内按 URL 异步加载。 */
export interface VolumeFieldAssetRef extends AssetRef {
  kind: 'volume-field'
  metadata?: VolumeFieldAssetMetadata & Record<string, unknown>
}

/** 便于 Runtime 和编辑器通过类型守卫识别体积热力场效果。 */
export type VolumeHeatmapEffectSpec = EffectSpec & {
  type: 'volume-heatmap'
  anchor: VolumeHeatmapAnchor
  params: VolumeHeatmapParams
  assetRefs: [VolumeFieldAssetRef]
}
