import type { SceneDefinition } from '@/scene-core/model/types'

export interface SceneFourPackagePayload {
  schemaVersion: 1
  sceneJson: string
  threeDJson: string
  twoDJson: string
  dependenciesJson: string
}

const parseObject = (value: string, label: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} 必须是 JSON 对象`)
  }
  return parsed as Record<string, unknown>
}

const assertPureJson = (value: unknown, path = 'scene', ancestors = new Set<object>()): void => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path} 包含非有限数值`)
    return
  }
  if (typeof value !== 'object') throw new Error(`${path} 包含不可序列化值`)
  if (ancestors.has(value)) throw new Error(`${path} 包含循环引用`)

  const prototype = Object.getPrototypeOf(value)
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${path} 包含非普通 JSON 对象`)
  }

  ancestors.add(value)
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPureJson(item, `${path}[${index}]`, ancestors))
  } else {
    Object.entries(value).forEach(([key, item]) => assertPureJson(item, `${path}.${key}`, ancestors))
  }
  ancestors.delete(value)
}

const transientResourceKey = /(url|token|ticket|authorization|credential|handle)/i

const assertNoTransientResourceData = (value: unknown, path: string): void => {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoTransientResourceData(item, `${path}[${index}]`))
    return
  }
  Object.entries(value).forEach(([key, item]) => {
    if (transientResourceKey.test(key.replace(/[-_]/g, ''))) {
      throw new Error(`${path}.${key} 不得写入资源 URL、令牌、票据或运行时句柄`)
    }
    assertNoTransientResourceData(item, `${path}.${key}`)
  })
}

export function serializeSceneToFourPackages(scene: SceneDefinition): SceneFourPackagePayload {
  assertPureJson(scene)
  assertNoTransientResourceData(scene.resources, 'scene.resources')
  return {
    schemaVersion: 1,
    sceneJson: JSON.stringify({
      schemaVersion: scene.schemaVersion,
      name: scene.name,
      sceneType: scene.type,
      revisionNo: scene.revisionNo,
      domainSlots: { twoD: 'present', threeD: 'present' },
      settings: scene.settings,
    }),
    threeDJson: JSON.stringify({ objects: scene.objects }),
    twoDJson: JSON.stringify(scene.twoD),
    dependenciesJson: JSON.stringify({
      resources: scene.resources,
      ...scene.dependencies,
    }),
  }
}

export function deserializeSceneFromFourPackages(
  sceneId: string,
  payload: Omit<SceneFourPackagePayload, 'schemaVersion'> & { schemaVersion?: number },
): SceneDefinition {
  if (payload.schemaVersion !== undefined && payload.schemaVersion !== 1) {
    throw new Error(`不支持的四包版本：${String(payload.schemaVersion)}`)
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key !== 'schemaVersion' && typeof value !== 'string') {
      throw new Error(`${key} 必须是 JSON 字符串`)
    }
  }

  const scene = parseObject(payload.sceneJson, 'sceneJson')
  const threeD = parseObject(payload.threeDJson, 'threeDJson')
  const twoD = parseObject(payload.twoDJson, 'twoDJson')
  const dependencies = parseObject(payload.dependenciesJson, 'dependenciesJson')
  if (scene.schemaVersion !== 1) throw new Error(`不支持的场景版本：${String(scene.schemaVersion)}`)
  if (scene.sceneType !== 'local3d' && scene.sceneType !== 'gis') throw new Error('sceneType 无效')
  if (!Array.isArray(threeD.objects)) throw new Error('threeDJson.objects 必须是数组')
  if (!Array.isArray(dependencies.resources)) throw new Error('dependenciesJson.resources 必须是数组')

  return {
    schemaVersion: 1,
    id: sceneId,
    name: typeof scene.name === 'string' ? scene.name : '未命名场景',
    type: scene.sceneType,
    revisionNo: typeof scene.revisionNo === 'number' ? scene.revisionNo : 0,
    objects: threeD.objects as SceneDefinition['objects'],
    resources: dependencies.resources as SceneDefinition['resources'],
    settings: (scene.settings && typeof scene.settings === 'object' && !Array.isArray(scene.settings)
      ? scene.settings
      : {}) as Record<string, unknown>,
    twoD: {
      canvas: (twoD.canvas ?? {}) as Record<string, unknown>,
      components: Array.isArray(twoD.components) ? twoD.components : [],
      layerTree: Array.isArray(twoD.layerTree) ? twoD.layerTree : [],
    },
    dependencies: {
      dataBindings: Array.isArray(dependencies.dataBindings) ? dependencies.dataBindings : [],
      behaviors: Array.isArray(dependencies.behaviors) ? dependencies.behaviors : [],
      deviceBindings: Array.isArray(dependencies.deviceBindings) ? dependencies.deviceBindings : [],
    },
  }
}
