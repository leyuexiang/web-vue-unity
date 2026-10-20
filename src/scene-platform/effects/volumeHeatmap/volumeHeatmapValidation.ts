import type { EffectSpec } from '../../core/types'
import type { VolumeHeatmapEffectSpec, VolumeHeatmapParams } from './volumeHeatmapTypes'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const isTuple3 = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber)

/** 本地盒和地理盒共享“所有字段有限”的底线，具体坐标语义在分支内分别校验。 */
const hasFiniteFields = (value: Record<string, unknown>, fields: readonly string[]): boolean =>
  fields.every((field) => isFiniteNumber(value[field]))

/** 校验颜色格式的最小边界，复杂颜色解析留给运行时 Color。 */
const isColor = (value: unknown): value is string =>
  typeof value === 'string' && (/^#[\da-f]{3,8}$/i.test(value) || /^rgba?\(/i.test(value))

/** 对体积热力场进行领域校验，防止非法数据进入 GPU 纹理和光线步进循环。 */
export const validateVolumeHeatmapEffectSpec = (effect: EffectSpec, prefix = 'Volume heatmap'): string[] => {
  if (effect.type !== 'volume-heatmap') return []
  const issues: string[] = []
  const candidate = effect as Partial<VolumeHeatmapEffectSpec>
  if (!candidate.anchor || !isRecord(candidate.anchor)) {
    issues.push(`${prefix} anchor must be an object.`)
  } else if (candidate.anchor.kind === 'local-box') {
    if (!isTuple3(candidate.anchor.center) || !isTuple3(candidate.anchor.size)) {
      issues.push(`${prefix} local-box center and size must be 3D tuples.`)
    } else if (candidate.anchor.size.some((value) => value <= 0)) {
      issues.push(`${prefix} local-box size must be greater than 0.`)
    }
    if (candidate.anchor.rotation !== undefined && !isTuple3(candidate.anchor.rotation)) {
      issues.push(`${prefix} local-box rotation must be a 3D tuple when provided.`)
    }
  } else if (candidate.anchor.kind === 'geo-box') {
    const anchor = candidate.anchor
    if (!hasFiniteFields(anchor, ['west', 'south', 'east', 'north', 'minimumHeight', 'maximumHeight'])) {
      issues.push(`${prefix} geo-box bounds must be finite numbers.`)
    } else if (
      anchor.west >= anchor.east ||
      anchor.south >= anchor.north ||
      anchor.minimumHeight >= anchor.maximumHeight
    ) {
      issues.push(`${prefix} geo-box bounds must be strictly ordered.`)
    }
  } else {
    issues.push(`${prefix} anchor kind must be local-box or geo-box.`)
  }
  if (!candidate.params || !isRecord(candidate.params)) {
    issues.push(`${prefix} params must be an object.`)
    return issues
  }
  const params = candidate.params as Partial<VolumeHeatmapParams>
  if (typeof params.name !== 'string' || params.name.length > 128) {
    issues.push(`${prefix} name is invalid.`)
  }
  if (params.pickable !== undefined && typeof params.pickable !== 'boolean') {
    issues.push(`${prefix} pickable must be boolean.`)
  }
  // 兼容首批未带数据来源字段的场景，缺省按真实资产处理。
  if (params.dataSource !== undefined && params.dataSource !== 'demo' && params.dataSource !== 'asset') {
    issues.push(`${prefix} dataSource must be demo or asset.`)
  }
  const generation = params.generation
  if (generation !== undefined) {
    if (!isRecord(generation)) {
      issues.push(`${prefix} generation must be an object.`)
    } else {
      if (
        !isTuple3(generation.resolution) ||
        generation.resolution.some(
          (value) => !Number.isInteger(value) || value <= 0 || value > 128,
        )
      ) {
        issues.push(`${prefix} generation.resolution must contain integers between 1 and 128.`)
      } else if (generation.resolution.reduce((total, value) => total * value, 1) > 128 * 128 * 128) {
        issues.push(`${prefix} generation.resolution voxel count is too large.`)
      }
      if (
        !isFiniteNumber(generation.pointCount) ||
        !Number.isInteger(generation.pointCount) ||
        generation.pointCount <= 0 ||
        generation.pointCount > 5000
      ) {
        issues.push(`${prefix} generation.pointCount must be an integer between 1 and 5000.`)
      }
      if (
        !isFiniteNumber(generation.gaussianSigma) ||
        generation.gaussianSigma <= 0 ||
        generation.gaussianSigma > 32
      ) {
        issues.push(`${prefix} generation.gaussianSigma must be between 0 and 32.`)
      }
      if (!isFiniteNumber(generation.seed) || !Number.isInteger(generation.seed)) {
        issues.push(`${prefix} generation.seed must be an integer.`)
      }
    }
  }
  if (!Array.isArray(candidate.assetRefs) || candidate.assetRefs.length !== 1) {
    issues.push(`${prefix} requires exactly one volume-field asset.`)
  } else if (candidate.assetRefs[0]?.kind !== 'volume-field') {
    issues.push(`${prefix} asset must use volume-field kind.`)
  }
  if (!isFiniteNumber(params.globalOpacity) || params.globalOpacity < 0 || params.globalOpacity > 1) {
    issues.push(`${prefix} globalOpacity must be between 0 and 1.`)
  }
  if (!isFiniteNumber(params.density) || params.density <= 0 || params.density > 8) {
    issues.push(`${prefix} density must be greater than 0 and no more than 8.`)
  }
  const valueRange = params.valueRange
  if (!valueRange || !isRecord(valueRange) || (valueRange.mode !== 'asset' && valueRange.mode !== 'fixed')) {
    issues.push(`${prefix} valueRange mode must be asset or fixed.`)
  } else if (valueRange.mode === 'fixed') {
    if (!isFiniteNumber(valueRange.minimum) || !isFiniteNumber(valueRange.maximum)) {
      issues.push(`${prefix} fixed valueRange requires finite minimum and maximum.`)
    } else if (valueRange.minimum >= valueRange.maximum) {
      issues.push(`${prefix} fixed valueRange minimum must be less than maximum.`)
    }
  }
  const sampling = params.sampling
  if (!sampling || !isRecord(sampling)) {
    issues.push(`${prefix} sampling must be an object.`)
  } else if (!isFiniteNumber(sampling.stepCount) || sampling.stepCount < 8 || sampling.stepCount > 256) {
    issues.push(`${prefix} sampling.stepCount must be between 8 and 256.`)
  }
  const rendering = params.rendering
  if (rendering !== undefined) {
    if (!isRecord(rendering)) {
      issues.push(`${prefix} rendering must be an object.`)
    } else {
      if (rendering.projectionMode !== 'maximum-intensity' && rendering.projectionMode !== 'volume-composite') {
        issues.push(`${prefix} rendering.projectionMode is invalid.`)
      }
      if (
        !isFiniteNumber(rendering.cutoffPercentage) ||
        rendering.cutoffPercentage <= 0 ||
        rendering.cutoffPercentage > 1
      ) {
        issues.push(`${prefix} rendering.cutoffPercentage must be between 0 and 1.`)
      }
      if (typeof rendering.renderOnTop !== 'boolean') issues.push(`${prefix} rendering.renderOnTop must be boolean.`)
      if (rendering.textureFilter !== 'linear' && rendering.textureFilter !== 'nearest') {
        issues.push(`${prefix} rendering.textureFilter is invalid.`)
      }
    }
  }
  const clipping = params.clipping
  if (!clipping || !isRecord(clipping) || !isTuple3(clipping.minimum) || !isTuple3(clipping.maximum)) {
    issues.push(`${prefix} clipping bounds must be 3D tuples.`)
  } else if (clipping.minimum.some((value, index) => (
    value < 0 || value >= clipping.maximum![index] || clipping.maximum![index] > 1
  ))) {
    issues.push(`${prefix} clipping bounds must be ordered within 0 and 1.`)
  }
  const stops = params.transferStops
  if (!Array.isArray(stops) || stops.length < 2 || stops.length > 16) {
    issues.push(`${prefix} transferStops must contain 2 to 16 nodes.`)
  } else {
    let previousValue = -Infinity
    stops.forEach((stop, index) => {
      if (!isRecord(stop) || !isFiniteNumber(stop.value) || stop.value < 0 || stop.value > 1) {
        issues.push(`${prefix} transferStops[${index}].value must be between 0 and 1.`)
      } else if (stop.value < previousValue) {
        issues.push(`${prefix} transferStops must be sorted by value.`)
      } else {
        previousValue = stop.value
      }
      if (!isRecord(stop) || !isColor(stop.color)) issues.push(`${prefix} transferStops[${index}].color is invalid.`)
      if (!isRecord(stop) || !isFiniteNumber(stop.opacity) || stop.opacity < 0 || stop.opacity > 1) {
        issues.push(`${prefix} transferStops[${index}].opacity must be between 0 and 1.`)
      }
    })
  }
  const legend = params.legend
  if (!legend || !isRecord(legend)) {
    issues.push(`${prefix} legend must be an object.`)
  } else {
    if (typeof legend.visible !== 'boolean') issues.push(`${prefix} legend.visible must be boolean.`)
    if (typeof legend.unit !== 'string' || legend.unit.length > 32) issues.push(`${prefix} legend.unit is invalid.`)
    if (
      !isFiniteNumber(legend.decimals) ||
      !Number.isInteger(legend.decimals) ||
      legend.decimals < 0 ||
      legend.decimals > 6
    ) {
      issues.push(`${prefix} legend.decimals must be an integer between 0 and 6.`)
    }
  }
  return issues
}
