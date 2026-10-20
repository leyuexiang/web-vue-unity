import type { ComponentDataConfig } from '@/types/data-config'
import type { EffectSpec, SceneObject } from '../../core/types'

export type ThreeMapQuality = 'low' | 'medium' | 'high'
export type ThreeMapLanguage = 'zh' | 'en' | 'both'

export interface ThreeMapVector3 {
  x: number
  y: number
  z: number
}

export type ThreeMapLocation =
  | { mode: 'province'; provinceName: string }
  | { mode: 'coordinate'; longitude: number; latitude: number; altitude?: number }

export interface ThreeMapProvinceOverride {
  id: string
  provinceName: string
  label?: string
  labelEn?: string
  value?: number
  color?: string
  visible?: boolean
  /** 是否允许点击该省份后显示省级信息框；缺省为允许。 */
  popup?: boolean
  infoTitle?: string
  infoContent?: string
  infoLevel?: string
}

/** 省级区域点击事件；回调只携带可序列化的领域快照，不暴露 Three 引擎对象。 */
export interface ThreeMapProvinceClickEvent {
  objectId: string
  provinceName: string
  position: ThreeMapVector3
  data: ThreeMapProvinceOverride
}

export interface ThreeMapFlightRoute {
  id: string
  name: string
  source: ThreeMapLocation
  target: ThreeMapLocation
  value?: number
  arcHeight: number
  width: number
  color: string
  opacity: number
  speed: number
  visible: boolean
}

export interface ThreeMapPointItem {
  id: string
  name: string
  location: ThreeMapLocation
  value?: number
  level?: string
  color: string
  size: number
  icon?: string
  visible: boolean
  popup?: boolean
}

export interface ThreeMapBarItem {
  id: string
  provinceName: string
  value: number
  color?: string
  visible: boolean
}

export interface ThreeMapViewParams {
  backgroundColor: string
  fogColor: string
  fogNear: number
  fogFar: number
  cameraPosition: ThreeMapVector3
  cameraTarget: ThreeMapVector3
  fov: number
  enableRotate: boolean
  enableZoom: boolean
  enablePan: boolean
  minDistance: number
  maxDistance: number
  autoRotate: boolean
  autoRotateSpeed: number
  quality: ThreeMapQuality
}

export interface ThreeMapGeometryParams {
  projectionCenter: [number, number]
  projectionScale: number
  depth: number
  bevelEnabled: boolean
  bevelSize: number
  bevelThickness: number
  position: ThreeMapVector3
  rotation: ThreeMapVector3
  scale: ThreeMapVector3
  tint: string
}

export interface ThreeMapSurfaceParams {
  topStartColor: string
  topEndColor: string
  sideStartColor: string
  sideEndColor: string
  opacity: number
  hoverColor: string
  selectedColor: string
}

export interface ThreeMapFloorParams {
  visible: boolean
  color: string
  opacity: number
  size: number
  height: number
  texture: 'grid' | 'ocean' | 'none'
  textureScale: number
  diffusionEnabled: boolean
  diffusionColor: string
  diffusionSpeed: number
}

export interface ThreeMapBoundaryParams {
  countryVisible: boolean
  provinceVisible: boolean
  color: string
  flowColor: string
  lineWidth: number
  opacity: number
  speed: number
  heightOffset: number
  glowVisible: boolean
}

export interface ThreeMapLabelParams {
  visible: boolean
  language: ThreeMapLanguage
  fontFamily: string
  fontSize: number
  color: string
  backgroundColor: string
  scale: number
  height: number
  alwaysFaceCamera: boolean
  overrides: ThreeMapProvinceOverride[]
}

export interface ThreeMapBarParams {
  visible: boolean
  items: ThreeMapBarItem[]
  color: string
  radius: number
  heightScale: number
  maxHeight: number
  haloVisible: boolean
}

export interface ThreeMapFlightParams {
  visible: boolean
  routes: ThreeMapFlightRoute[]
  markerVisible: boolean
}

export interface ThreeMapPointParams {
  visible: boolean
  items: ThreeMapPointItem[]
  popupVisible: boolean
}

export interface ThreeMapParticleParams {
  visible: boolean
  count: number
  color: string
  size: number
  speed: number
}

export interface ThreeMapRingParams {
  visible: boolean
  /** 运行时跟随数据飞线起点；未设置时沿用地图中心。 */
  focusLocation?: ThreeMapLocation
  color: string
  count: number
  size: number
  speed: number
  rotatingBorderVisible: boolean
  rotatingBorderSpeed: number
}

export interface ThreeMapAnimationParams {
  entranceEnabled: boolean
  entranceDuration: number
  boundaryFlowEnabled: boolean
  flightEnabled: boolean
  particleEnabled: boolean
  ringEnabled: boolean
}

export interface ThreeMapInteractionParams {
  hoverHighlight: boolean
  clickSelect: boolean
  popupEnabled: boolean
  cameraControls: boolean
  pickable: boolean
}

export interface ThreeMapDataPolicy {
  retainLastValidSnapshot: boolean
  emptyResponse: 'replace' | 'retain'
}

export interface ThreeMapParams extends Record<string, unknown> {
  view: ThreeMapViewParams
  geometry: ThreeMapGeometryParams
  surface: ThreeMapSurfaceParams
  floor: ThreeMapFloorParams
  boundary: ThreeMapBoundaryParams
  labels: ThreeMapLabelParams
  bars: ThreeMapBarParams
  flights: ThreeMapFlightParams
  points: ThreeMapPointParams
  particles: ThreeMapParticleParams
  rings: ThreeMapRingParams
  animation: ThreeMapAnimationParams
  interaction: ThreeMapInteractionParams
  dataPolicy: ThreeMapDataPolicy
  dataConfig?: ComponentDataConfig
}

export type ThreeMapEffectSpec = EffectSpec & {
  type: 'three-map'
  schemaVersion: 1
  presetId: 'china-province-v1'
  params: ThreeMapParams
}

export type ThreeMapSceneObject = SceneObject & {
  type: 'effect'
  effect: ThreeMapEffectSpec
}

export interface ThreeMapDiagnostic {
  code: 'unknown-province' | 'invalid-flight' | 'duplicate-instance' | 'invalid-data-row'
  message: string
  itemId?: string
}

export interface ThreeMapDynamicSnapshot {
  provinces: ThreeMapProvinceOverride[]
  flights: ThreeMapFlightRoute[]
  /** 数据请求中第一条可见飞线的起点，供中心光环定位。 */
  flightOrigin?: ThreeMapLocation
  points: ThreeMapPointItem[]
  diagnostics: ThreeMapDiagnostic[]
}
