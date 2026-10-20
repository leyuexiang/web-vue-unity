/**
 * 服务端保存会只保留 dependencies.dataBindings 的前 150 条，并可能把截断结果写成非法 JSON。
 * 多出来的绑定改放在 sceneJson.metadata，这个字段会按原文保留；加载时再按拥有者合并回来。
 */
export const DATA_BINDING_OVERFLOW_METADATA_KEY = 'dataBindingOverflow'
export const SERVER_PERSISTED_DATA_BINDING_LIMIT = 150
const LEGACY_PROBE_METADATA_KEY = '__bindingProbe'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const dataBindingIdentity = (binding: unknown): string | undefined => {
  if (!isRecord(binding)) return undefined
  const owner = isRecord(binding.owner) ? binding.owner : undefined
  const domain = typeof owner?.domain === 'string' ? owner.domain : ''
  const ownerType = typeof owner?.ownerType === 'string' ? owner.ownerType : ''
  const instanceId =
    typeof owner?.instanceId === 'string'
      ? owner.instanceId
      : typeof owner?.ownerKey === 'string'
        ? owner.ownerKey
        : ''
  const bindingKey =
    typeof binding.bindingKey === 'string'
      ? binding.bindingKey
      : typeof binding.id === 'string'
        ? binding.id
        : ''
  if (!domain || !ownerType || !instanceId || !bindingKey) return undefined
  return `${domain}:${ownerType}:${instanceId}:${bindingKey}`
}

interface OverflowSceneDocuments {
  scene: { metadata: Record<string, unknown> }
  dependencies: { dataBindings: unknown[] }
}

/** 把服务端会丢掉的绑定尾部写入场景元数据，并清掉一次性探测字段。 */
export const attachDataBindingOverflow = <T extends OverflowSceneDocuments>(documents: T): T => {
  const metadata = { ...documents.scene.metadata }
  delete metadata[LEGACY_PROBE_METADATA_KEY]
  const bindings = documents.dependencies.dataBindings
  if (bindings.length > SERVER_PERSISTED_DATA_BINDING_LIMIT) {
    metadata[DATA_BINDING_OVERFLOW_METADATA_KEY] = bindings.slice(
      SERVER_PERSISTED_DATA_BINDING_LIMIT,
    )
  } else {
    delete metadata[DATA_BINDING_OVERFLOW_METADATA_KEY]
  }
  return {
    ...documents,
    scene: {
      ...documents.scene,
      metadata,
    },
  }
}

/**
 * 用场景元数据里的绑定尾部补回依赖包。
 * 依赖包里已经存在的拥有者保持原记录，只追加服务端没存下来的绑定。
 */
export const mergeDataBindingOverflow = (
  sceneJson: string,
  dependenciesJson: string,
): { dependenciesJson: string; merged: boolean } => {
  let scene: unknown
  let dependencies: unknown
  try {
    scene = JSON.parse(sceneJson)
    dependencies = JSON.parse(dependenciesJson)
  } catch {
    return { dependenciesJson, merged: false }
  }
  if (!isRecord(scene) || !isRecord(dependencies) || !Array.isArray(dependencies.dataBindings)) {
    return { dependenciesJson, merged: false }
  }
  const metadata = isRecord(scene.metadata) ? scene.metadata : undefined
  const overflow = metadata?.[DATA_BINDING_OVERFLOW_METADATA_KEY]
  if (!Array.isArray(overflow) || overflow.length === 0) {
    return { dependenciesJson, merged: false }
  }

  const present = new Set(
    dependencies.dataBindings.map((binding) => dataBindingIdentity(binding)).filter(Boolean),
  )
  const restored = overflow.filter((binding) => {
    const identity = dataBindingIdentity(binding)
    return identity !== undefined && !present.has(identity)
  })
  if (restored.length === 0) return { dependenciesJson, merged: false }
  return {
    dependenciesJson: JSON.stringify({
      ...dependencies,
      dataBindings: [...dependencies.dataBindings, ...restored],
    }),
    merged: true,
  }
}
