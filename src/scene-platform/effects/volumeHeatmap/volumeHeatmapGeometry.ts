import type { SceneTransform } from '../../core/types'
import type { VolumeHeatmapAnchor } from './volumeHeatmapTypes'

/** 三维向量输入控件使用的轴名称；集中定义可避免面板各处重复维护字符串联合类型。 */
export type VolumeHeatmapVectorAxis = 'x' | 'y' | 'z'

const VOLUME_HEATMAP_VECTOR_AXIS_INDEX: Record<VolumeHeatmapVectorAxis, 0 | 1 | 2> = {
  x: 0,
  y: 1,
  z: 2,
}

/**
 * 应用三维向量的单轴输入，并返回新的元组。
 *
 * Element Plus 数字输入框（`el-input-number`）会先发出 `input`，再发出 `update:modelValue`；
 * 面板若在前一个事件里立即提交，双向绑定值仍可能是旧值。该函数直接消费事件参数并返回
 * 新快照，让调用方可以在双向绑定完成前安全提交，同时拒绝清空或非有限数值，避免污染场景数据。
 */
export const updateVolumeHeatmapVectorAxis = (
  vector: readonly [number, number, number],
  axis: VolumeHeatmapVectorAxis,
  value: number | null | undefined,
): [number, number, number] | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const next = [...vector] as [number, number, number]
  next[VOLUME_HEATMAP_VECTOR_AXIS_INDEX[axis]] = value
  return next
}

/** GIS 体积热力场 geo-box 锚点的米制尺寸换算常量。 */
const GEO_LATITUDE_METERS_PER_DEGREE = 110540
const GEO_LONGITUDE_METERS_PER_DEGREE = 111320

/**
 * 计算 GIS 体积热力场区域的米制尺寸。
 *
 * 经度方向长度会随纬度缩短；调用方应传入当前区域或目标区域的中心纬度，避免直接把经度差当成米。
 * 该纯函数只处理可序列化领域值，不依赖 Cesium、Three 或页面状态，因此面板和 Gizmo 提交可以共用。
 */
export const resolveVolumeHeatmapGeoAnchorSize = (
  anchor: Extract<VolumeHeatmapAnchor, { kind: 'geo-box' }>,
  latitude: number,
): [number, number, number] => {
  const safeLatitude = Number.isFinite(latitude) ? latitude : (anchor.south + anchor.north) / 2
  const longitudeScale =
    GEO_LONGITUDE_METERS_PER_DEGREE * Math.max(0.05, Math.cos((safeLatitude * Math.PI) / 180))
  return [
    Math.max(0.1, (anchor.east - anchor.west) * longitudeScale),
    Math.max(0.1, (anchor.north - anchor.south) * GEO_LATITUDE_METERS_PER_DEGREE),
    Math.max(0.1, anchor.maximumHeight - anchor.minimumHeight),
  ]
}

/**
 * 根据新的 GIS Transform 重建 geo-box 中心，同时保留用户已经设置的物理尺寸。
 *
 * 体积热力场同时拥有“对象 Transform”和“区域锚点”两份可序列化数据。移动 Gizmo 时必须让两者
 * 继续指向同一个中心，否则 Runtime 重新同步对象后占位盒会跳回旧区域。经纬度宽度按目标纬度重新
 * 换算，保证跨纬度移动时区域仍保持相同米制宽度；高度范围始终围绕新中心保持原有高度。
 */
export const updateVolumeHeatmapGeoAnchor = (
  anchor: Extract<VolumeHeatmapAnchor, { kind: 'geo-box' }>,
  transform: Extract<SceneTransform, { kind: 'geo' }>,
  nextSize: readonly [number, number, number],
): Extract<VolumeHeatmapAnchor, { kind: 'geo-box' }> => {
  const longitudeScale =
    GEO_LONGITUDE_METERS_PER_DEGREE * Math.max(0.05, Math.cos((transform.latitude * Math.PI) / 180))
  const latitudeScale = GEO_LATITUDE_METERS_PER_DEGREE
  const width = Number.isFinite(nextSize[0]) ? Math.max(0.1, Math.abs(nextSize[0])) : 0.1
  const depth = Number.isFinite(nextSize[1]) ? Math.max(0.1, Math.abs(nextSize[1])) : 0.1
  const height = Number.isFinite(nextSize[2]) ? Math.max(0.1, Math.abs(nextSize[2])) : 0.1
  const halfLongitude = Math.max(0.000001, width / longitudeScale / 2)
  const halfLatitude = Math.max(0.000001, depth / latitudeScale / 2)
  const halfHeight = Math.max(0.05, height / 2)
  return {
    ...anchor,
    west: transform.longitude - halfLongitude,
    east: transform.longitude + halfLongitude,
    south: transform.latitude - halfLatitude,
    north: transform.latitude + halfLatitude,
    minimumHeight: transform.height - halfHeight,
    maximumHeight: transform.height + halfHeight,
  }
}
