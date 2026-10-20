import type { EffectSpec } from '../../core/types'
import { createDefaultThreeMapParams } from './threeMapDefaults'
import type { ThreeMapEffectSpec, ThreeMapParams, ThreeMapVector3 } from './threeMapTypes'

const HEX_OR_RGBA = /^(#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\([^)]*\))$/i
const clamp = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback
}
const color = (value: unknown, fallback: string) =>
  typeof value === 'string' && HEX_OR_RGBA.test(value.trim()) ? value.trim() : fallback
/** 早期版本的默认地板高度；仅作为旧地图快照迁移，不影响其它高度配置。 */
const LEGACY_DEFAULT_FLOOR_HEIGHT = -2.2
const vector = (value: unknown, fallback: ThreeMapVector3, minimum = -1000, maximum = 1000) => {
  const candidate = (value && typeof value === 'object' ? value : {}) as Partial<ThreeMapVector3>
  return {
    x: clamp(candidate.x, fallback.x, minimum, maximum),
    y: clamp(candidate.y, fallback.y, minimum, maximum),
    z: clamp(candidate.z, fallback.z, minimum, maximum),
  }
}

/** 将旧场景和外部输入归一化为 schemaVersion=1 的完整参数快照。 */
export function normalizeThreeMapParams(input?: Partial<ThreeMapParams>): ThreeMapParams {
  const defaults = createDefaultThreeMapParams()
  const source = input ?? {}
  const view = source.view ?? defaults.view
  const geometry = source.geometry ?? defaults.geometry
  const surface = source.surface ?? defaults.surface
  const floor = source.floor ?? defaults.floor
  const boundary = source.boundary ?? defaults.boundary
  const labels = source.labels ?? defaults.labels
  const bars = source.bars ?? defaults.bars
  const flights = source.flights ?? defaults.flights
  const points = source.points ?? defaults.points
  const particles = source.particles ?? defaults.particles
  const rings = source.rings ?? defaults.rings
  const animation = source.animation ?? defaults.animation
  const interaction = source.interaction ?? defaults.interaction
  const dataPolicy = source.dataPolicy ?? defaults.dataPolicy
  const floorHeight =
    Number(floor.height) === LEGACY_DEFAULT_FLOOR_HEIGHT
      ? defaults.floor.height
      : clamp(floor.height, defaults.floor.height, -100, 100)

  return {
    view: {
      ...defaults.view,
      ...view,
      backgroundColor: color(view.backgroundColor, defaults.view.backgroundColor),
      fogColor: color(view.fogColor, defaults.view.fogColor),
      fogNear: clamp(view.fogNear, defaults.view.fogNear, 0, 1000),
      fogFar: clamp(view.fogFar, defaults.view.fogFar, 1, 5000),
      cameraPosition: vector(view.cameraPosition, defaults.view.cameraPosition),
      cameraTarget: vector(view.cameraTarget, defaults.view.cameraTarget),
      fov: clamp(view.fov, defaults.view.fov, 10, 100),
      minDistance: clamp(view.minDistance, defaults.view.minDistance, 1, 1000),
      maxDistance: clamp(view.maxDistance, defaults.view.maxDistance, 2, 5000),
      autoRotateSpeed: clamp(view.autoRotateSpeed, defaults.view.autoRotateSpeed, -10, 10),
      quality: ['low', 'medium', 'high'].includes(view.quality)
        ? view.quality
        : defaults.view.quality,
    },
    geometry: {
      ...defaults.geometry,
      ...geometry,
      projectionCenter:
        Array.isArray(geometry.projectionCenter) && geometry.projectionCenter.length === 2
          ? [
              clamp(geometry.projectionCenter[0], defaults.geometry.projectionCenter[0], -180, 180),
              clamp(geometry.projectionCenter[1], defaults.geometry.projectionCenter[1], -90, 90),
            ]
          : [...defaults.geometry.projectionCenter],
      projectionScale: clamp(geometry.projectionScale, defaults.geometry.projectionScale, 1, 500),
      depth: clamp(geometry.depth, defaults.geometry.depth, 0.05, 20),
      bevelSize: clamp(geometry.bevelSize, defaults.geometry.bevelSize, 0, 2),
      bevelThickness: clamp(geometry.bevelThickness, defaults.geometry.bevelThickness, 0, 2),
      position: vector(geometry.position, defaults.geometry.position),
      rotation: vector(geometry.rotation, defaults.geometry.rotation, -Math.PI * 2, Math.PI * 2),
      scale: vector(geometry.scale, defaults.geometry.scale, 0.01, 100),
      tint: color(geometry.tint, defaults.geometry.tint),
    },
    surface: {
      ...defaults.surface,
      ...surface,
      topStartColor: color(surface.topStartColor, defaults.surface.topStartColor),
      topEndColor: color(surface.topEndColor, defaults.surface.topEndColor),
      sideStartColor: color(surface.sideStartColor, defaults.surface.sideStartColor),
      sideEndColor: color(surface.sideEndColor, defaults.surface.sideEndColor),
      hoverColor: color(surface.hoverColor, defaults.surface.hoverColor),
      selectedColor: color(surface.selectedColor, defaults.surface.selectedColor),
      opacity: clamp(surface.opacity, defaults.surface.opacity, 0, 1),
    },
    floor: {
      ...defaults.floor,
      ...floor,
      color: color(floor.color, defaults.floor.color),
      opacity: clamp(floor.opacity, defaults.floor.opacity, 0, 1),
      size: clamp(floor.size, defaults.floor.size, 10, 1000),
      height: floorHeight,
      textureScale: clamp(floor.textureScale, defaults.floor.textureScale, 0.1, 100),
      diffusionColor: color(floor.diffusionColor, defaults.floor.diffusionColor),
      diffusionSpeed: clamp(floor.diffusionSpeed, defaults.floor.diffusionSpeed, 0, 10),
      texture: ['grid', 'ocean', 'none'].includes(floor.texture)
        ? floor.texture
        : defaults.floor.texture,
    },
    boundary: {
      ...defaults.boundary,
      ...boundary,
      color: color(boundary.color, defaults.boundary.color),
      flowColor: color(boundary.flowColor, defaults.boundary.flowColor),
      lineWidth: clamp(boundary.lineWidth, defaults.boundary.lineWidth, 0.25, 10),
      opacity: clamp(boundary.opacity, defaults.boundary.opacity, 0, 1),
      speed: clamp(boundary.speed, defaults.boundary.speed, 0, 10),
      heightOffset: clamp(boundary.heightOffset, defaults.boundary.heightOffset, -2, 5),
    },
    labels: {
      ...defaults.labels,
      ...labels,
      language: ['zh', 'en', 'both'].includes(labels.language)
        ? labels.language
        : defaults.labels.language,
      fontSize: clamp(labels.fontSize, defaults.labels.fontSize, 10, 128),
      color: color(labels.color, defaults.labels.color),
      backgroundColor: color(labels.backgroundColor, defaults.labels.backgroundColor),
      scale: clamp(labels.scale, defaults.labels.scale, 0.1, 50),
      height: clamp(labels.height, defaults.labels.height, -10, 50),
      overrides: Array.isArray(labels.overrides) ? structuredClone(labels.overrides) : [],
    },
    bars: {
      ...defaults.bars,
      ...bars,
      items: Array.isArray(bars.items)
        ? structuredClone(bars.items)
        : structuredClone(defaults.bars.items),
      color: color(bars.color, defaults.bars.color),
      radius: clamp(bars.radius, defaults.bars.radius, 0.02, 5),
      heightScale: clamp(bars.heightScale, defaults.bars.heightScale, 0, 10),
      maxHeight: clamp(bars.maxHeight, defaults.bars.maxHeight, 0.1, 100),
    },
    flights: {
      ...defaults.flights,
      ...flights,
      routes: Array.isArray(flights.routes)
        ? structuredClone(flights.routes)
        : structuredClone(defaults.flights.routes),
    },
    points: {
      ...defaults.points,
      ...points,
      items: Array.isArray(points.items)
        ? structuredClone(points.items)
        : structuredClone(defaults.points.items),
    },
    particles: {
      ...defaults.particles,
      ...particles,
      count: Math.round(clamp(particles.count, defaults.particles.count, 0, 2000)),
      color: color(particles.color, defaults.particles.color),
      size: clamp(particles.size, defaults.particles.size, 0.01, 10),
      speed: clamp(particles.speed, defaults.particles.speed, 0, 10),
    },
    rings: {
      ...defaults.rings,
      ...rings,
      color: color(rings.color, defaults.rings.color),
      count: Math.round(clamp(rings.count, defaults.rings.count, 0, 12)),
      size: clamp(rings.size, defaults.rings.size, 1, 500),
      speed: clamp(rings.speed, defaults.rings.speed, 0, 10),
      rotatingBorderSpeed: clamp(
        rings.rotatingBorderSpeed,
        defaults.rings.rotatingBorderSpeed,
        -10,
        10,
      ),
    },
    animation: {
      ...defaults.animation,
      ...animation,
      entranceDuration: clamp(
        animation.entranceDuration,
        defaults.animation.entranceDuration,
        0,
        10000,
      ),
    },
    interaction: { ...defaults.interaction, ...interaction },
    dataPolicy: {
      ...defaults.dataPolicy,
      ...dataPolicy,
      emptyResponse: dataPolicy.emptyResponse === 'replace' ? 'replace' : 'retain',
    },
    ...(source.dataConfig ? { dataConfig: structuredClone(source.dataConfig) } : {}),
  }
}

export const isThreeMapEffectSpec = (
  effect: EffectSpec | undefined,
): effect is ThreeMapEffectSpec => effect?.type === 'three-map'

export function validateThreeMapEffectSpec(effect: EffectSpec, prefix = '中国3D地图'): string[] {
  if (effect.type !== 'three-map') return []
  const candidate = effect as Partial<ThreeMapEffectSpec>
  const issues: string[] = []
  if (candidate.schemaVersion !== 1) issues.push(`${prefix}.schemaVersion 必须为 1`)
  if (candidate.presetId !== 'china-province-v1') issues.push(`${prefix}.presetId 不受支持`)
  if (!candidate.params || typeof candidate.params !== 'object')
    issues.push(`${prefix}.params 必填`)
  return issues
}
