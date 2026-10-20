import { DRAG_MODEL_ENUM } from '@/enums'
import type { SceneDefinition, SceneObject, SceneTransform, SceneType } from '@/scene-platform'
import { upgradeLegacyEditorDefaultVolumetricCloudEffect } from './editorSceneWeatherDefaults'

type JsonRecord = Record<string, unknown>
type GeometryDefaultMap = Record<string, Record<string, number | boolean>>

const GEOMETRY_DEFAULTS: GeometryDefaultMap = {
  // 与系统资源正方体保持一致：本地场景长度单位为米，恢复缺失参数时仍为 1m 立方体。
  BoxGeometry: {
    width: 1,
    height: 1,
    depth: 1,
    widthSegments: 1,
    heightSegments: 1,
    depthSegments: 1,
  },
  CapsuleGeometry: {
    radius: 0.5,
    length: 0.5,
    capSegments: 10,
    radialSegments: 10,
  },
  CircleGeometry: {
    radius: 0.5,
    segments: 32,
    thetaStart: 0,
    thetaLength: 6.44,
  },
  ConeGeometry: {
    radius: 5,
    height: 10,
    radialSegments: 8,
    heightSegments: 1,
    openEnded: false,
    thetaStart: 0,
    thetaLength: Math.PI * 2,
  },
  CylinderGeometry: {
    radiusTop: 4,
    radiusBottom: 4,
    height: 8,
    radialSegments: 8,
    heightSegments: 1,
    openEnded: false,
    thetaStart: 0,
    thetaLength: Math.PI * 2,
  },
  DodecahedronGeometry: {
    radius: 0.5,
    detail: 0,
  },
  IcosahedronGeometry: {
    radius: 0.5,
    detail: 0,
  },
  OctahedronGeometry: {
    radius: 0.5,
    detail: 0,
  },
  PlaneGeometry: {
    width: 1,
    height: 1,
    widthSegments: 1,
    heightSegments: 1,
  },
  SphereGeometry: {
    radius: 15,
    widthSegments: 32,
    heightSegments: 16,
    phiStart: 0,
    phiLength: Math.PI * 2,
    thetaStart: 0,
    thetaLength: Math.PI,
  },
  TetrahedronGeometry: {
    radius: 0.5,
    detail: 0,
  },
  TorusGeometry: {
    radius: 10,
    tube: 3,
    radialSegments: 16,
    tubularSegments: 100,
    arc: Math.PI * 2,
  },
}

const INTEGER_GEOMETRY_KEYS = new Set([
  'widthSegments',
  'heightSegments',
  'depthSegments',
  'capSegments',
  'radialSegments',
  'segments',
  'thetaSegments',
  'phiSegments',
  'tubularSegments',
  'detail',
])

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toFiniteNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const toGeometryNumber = (key: string, value: unknown, fallback: number) => {
  const numericValue = toFiniteNumber(value, fallback)
  if (!INTEGER_GEOMETRY_KEYS.has(key)) return numericValue

  /**
   * Three.js 的分段字段如果落到 null/NaN/0，部分内置几何会生成 NaN 顶点。
   * 这里按旧拖拽卡片默认值兜底，并保证整数分段至少为 1。
   */
  return Math.max(1, Math.round(numericValue))
}

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value
  return fallback
}

const toTuple = (value: unknown, fallback: [number, number, number]): [number, number, number] => {
  if (!Array.isArray(value)) return fallback

  return [
    toFiniteNumber(value[0], fallback[0]),
    toFiniteNumber(value[1], fallback[1]),
    toFiniteNumber(value[2], fallback[2]),
  ]
}

const sanitizeScale = (value: unknown): number | [number, number, number] => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (Array.isArray(value)) return toTuple(value, [1, 1, 1])
  return [1, 1, 1]
}

const createFallbackTransform = (sceneType: SceneType): SceneTransform =>
  sceneType === 'gis'
    ? {
        kind: 'geo',
        longitude: 0,
        latitude: 0,
        height: 0,
        heading: 0,
        pitch: 0,
        roll: 0,
        scale: 1,
        altitudeMode: 'absolute',
      }
    : {
        kind: 'local',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      }

const sanitizeTransform = (transform: SceneTransform, sceneType: SceneType): SceneTransform => {
  if (!isRecord(transform)) return createFallbackTransform(sceneType)

  if (transform.kind === 'geo') {
    return {
      kind: 'geo',
      longitude: toFiniteNumber(transform.longitude, 0),
      latitude: toFiniteNumber(transform.latitude, 0),
      height: toFiniteNumber(transform.height, 0),
      heading: toFiniteNumber(transform.heading, 0),
      pitch: toFiniteNumber(transform.pitch, 0),
      roll: toFiniteNumber(transform.roll, 0),
      scale: sanitizeScale(transform.scale),
      altitudeMode:
        transform.altitudeMode === 'relativeToGround' || transform.altitudeMode === 'clampToGround'
          ? transform.altitudeMode
          : 'absolute',
    }
  }

  if (transform.kind === 'local') {
    return {
      kind: 'local',
      position: toTuple(transform.position, [0, 0, 0]),
      rotation: toTuple(transform.rotation, [0, 0, 0]),
      scale: sanitizeScale(transform.scale),
    }
  }

  return createFallbackTransform(sceneType)
}

const sanitizeDropPoint = (value: unknown) => {
  if (!isRecord(value)) return undefined

  return {
    clientX: toFiniteNumber(value.clientX, 0),
    clientY: toFiniteNumber(value.clientY, 0),
  }
}

const sanitizeGeometrySnapshot = (snapshot: JsonRecord) => {
  const geometryType = typeof snapshot.type === 'string' ? snapshot.type : ''
  const defaults = GEOMETRY_DEFAULTS[geometryType]
  if (!defaults) return snapshot

  const sanitized: JsonRecord = {
    name: typeof snapshot.name === 'string' && snapshot.name.trim() ? snapshot.name : '几何体',
    type: geometryType,
  }

  for (const [key, fallback] of Object.entries(defaults)) {
    sanitized[key] =
      typeof fallback === 'boolean'
        ? toBoolean(snapshot[key], fallback)
        : toGeometryNumber(key, snapshot[key], fallback)
  }

  sanitized.modelType = DRAG_MODEL_ENUM.Geometry

  if (typeof snapshot.icon === 'string') {
    sanitized.icon = snapshot.icon
  }

  return sanitized
}

const sanitizeObjectMetadata = (metadata: SceneObject['metadata']) => {
  if (!metadata) return metadata

  const sanitized: JsonRecord = { ...metadata }
  const editorModelSnapshot = sanitized.editorModelSnapshot
  const editorModelType = sanitized.editorModelType

  if (editorModelType === DRAG_MODEL_ENUM.Geometry && isRecord(editorModelSnapshot)) {
    sanitized.editorModelSnapshot = sanitizeGeometrySnapshot(editorModelSnapshot)
  }

  const dropPoint = sanitizeDropPoint(sanitized.dropPoint)
  if (dropPoint) {
    sanitized.dropPoint = dropPoint
  } else {
    delete sanitized.dropPoint
  }

  return sanitized
}

const sanitizeSceneObject = (object: SceneObject, sceneType: SceneType): SceneObject => ({
  ...object,
  transform: sanitizeTransform(object.transform, sceneType),
  metadata: sanitizeObjectMetadata(object.metadata),
})

/**
 * 净化编辑器保存/恢复使用的 SceneDefinition。
 *
 * 该适配器只处理旧编辑器接入层的兼容数据：
 * - 变换字段只保留有限数字，避免刷新后把 null/NaN 传入 Three；
 * - 几何体旧拖拽快照按构造参数白名单重建，避免多余字段或空分段生成 NaN 顶点；
 * - 非法 dropPoint 删除，旧 Runtime 会使用安全默认落点并随后同步已保存 transform。
 */
export const sanitizeEditorSceneDefinition = (scene: SceneDefinition): SceneDefinition => ({
  ...scene,
  effects: scene.effects.map(upgradeLegacyEditorDefaultVolumetricCloudEffect),
  objects: scene.objects.map((object) => sanitizeSceneObject(object, scene.type)),
})
