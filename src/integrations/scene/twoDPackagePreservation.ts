import type { SceneFourPackagePayload } from './sceneFourPackage'

type JsonRecord = Record<string, unknown>
const isRecord = (value: unknown): value is JsonRecord => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const parse = (value: string): JsonRecord => {
  const parsed: unknown = JSON.parse(value)
  if (!isRecord(parsed)) throw new Error('场景数据包必须是对象')
  return parsed
}
/** 原始修订只在活动编辑会话保留一份，退出时释放，不进入二维历史或浏览器持久化。 */
const originals = new Map<string, SceneFourPackagePayload>()
export const retainOriginalScenePackages = (sceneId: string, payload: SceneFourPackagePayload) => {
  // 在允许编辑前验证四包整体可解析，不能把损坏数据当作空三维场景。
  for (const value of Object.values(payload)) parse(value)
  originals.set(sceneId, { ...payload })
}
export const releaseOriginalScenePackages = (sceneId: string) => { originals.delete(sceneId) }
export const hasOriginalScenePackages = (sceneId: string) => originals.has(sceneId)

/** 判断依赖是否明确且仅属于二维；未知归属必须保全，防止删掉尚未支持的扩展数据。 */
const isTwoDOwner = (value: unknown) => isRecord(value) && value.domain === 'twoD'
const isOnlyTwoD = (value: unknown) => {
  if (!isRecord(value)) return false
  if (Array.isArray(value.owners)) return value.owners.length > 0 && value.owners.every(isTwoDOwner)
  return isTwoDOwner(value.owner) || value.domain === 'twoD'
}
const isGeneratedTwoD = (value: unknown) => isOnlyTwoD(value) ||
  (isRecord(value) && Array.isArray(value.owners) && value.owners.some(isTwoDOwner))

/**
 * 保全尚未接入编辑的原三维域，同时保存本会话新增对象及其当前依赖。
 * 原实例仍原样保留；新增实例按稳定编号识别，撤销或删除后自然不再出现在生成包中。
 * 同一资源先保留原三维拥有者，再合并当前二维和新增三维拥有者，避免共享资源丢失或重复登记。
 */
export function preserveUneditedThreeDDomain(sceneId: string, generated: SceneFourPackagePayload): SceneFourPackagePayload {
  const original = originals.get(sceneId)
  if (!original) return generated
  const before = parse(original.dependenciesJson)
  const after = parse(generated.dependenciesJson)
  const originalTwoD = parse(original.twoDJson)
  const generatedTwoD = parse(generated.twoDJson)
  const originalThreeD = parse(original.threeDJson)
  const generatedThreeD = parse(generated.threeDJson)
  const records = (value: unknown): JsonRecord[] => Array.isArray(value) ? value.filter(isRecord) : []
  // 两类目标共用编号集合，防止类型分类变化被误判为新增实例；保存时只做线性扫描。
  const originalIds = new Set([...records(originalThreeD.objects), ...records(originalThreeD.components)]
    .map(target => String(target.instanceId)))
  const additions = new Map(['objects', 'components'].map(key => [key, records(generatedThreeD[key])
    .filter(target => typeof target.instanceId === 'string' && target.instanceId && !originalIds.has(target.instanceId))]))
  const newTargets = [...additions.values()].flat()
  const newIds = new Set(newTargets.map(target => String(target.instanceId)))
  const isCurrentOwner = (value: unknown) => isTwoDOwner(value) ||
    (isRecord(value) && value.domain === 'threeD' && newIds.has(String(value.instanceId)))
  const isGeneratedCurrent = (value: unknown) => isGeneratedTwoD(value) ||
    (isRecord(value) && (isCurrentOwner(value.owner) ||
      (Array.isArray(value.owners) && value.owners.some(isCurrentOwner))))
  const threeD: JsonRecord = { ...originalThreeD }
  for (const [key, targets] of additions) {
    if (targets.length) threeD[key] = [...(Array.isArray(originalThreeD[key]) ? originalThreeD[key] : []), ...targets]
  }
  // 新对象可能放进本会话新建的视觉图层，只补齐其实际引用的图层，原有图层配置仍保持不变。
  const newLayerKeys = new Set(newTargets.map(target => target.layerKey).filter(Boolean))
  const originalLayerKeys = new Set(records(originalThreeD.layers).map(layer => layer.layerKey))
  const newLayers = records(generatedThreeD.layers).filter(layer => newLayerKeys.has(layer.layerKey) && !originalLayerKeys.has(layer.layerKey))
  if (newLayers.length) threeD.layers = [...(Array.isArray(originalThreeD.layers) ? originalThreeD.layers : []), ...newLayers]
  // 保留仍存在实例上的扩展字段；已删除部件不能因原始快照保全而复活。
  const originalComponents = new Map((Array.isArray(originalTwoD.components) ? originalTwoD.components : [])
    .filter(isRecord).map(component => [String(component.instanceId), component]))
  const components = (Array.isArray(generatedTwoD.components) ? generatedTwoD.components : [])
    .map(component => isRecord(component) ? { ...originalComponents.get(String(component.instanceId)), ...component } : component)
  const merged: JsonRecord = { ...before, ...after }
  for (const key of ['resources', 'dataBindings', 'behaviors', 'deviceBindings']) {
    const retained = (Array.isArray(before[key]) ? before[key] : []).filter(value => !isOnlyTwoD(value))
    const current = (Array.isArray(after[key]) ? after[key] : []).filter(isGeneratedCurrent)
    if (key !== 'resources') { merged[key] = [...retained, ...current]; continue }
    const resources = new Map<string, JsonRecord>()
    for (const item of retained) {
      if (!isRecord(item)) throw new Error('无法无损保存资源依赖')
      resources.set(String(item.resourceKey), { ...item,
        ...(Array.isArray(item.owners) ? { owners: item.owners.filter(owner => !isTwoDOwner(owner)) } : {}),
      })
    }
    for (const item of current) {
      if (!isRecord(item)) continue
      const key = String(item.resourceKey)
      const existing = resources.get(key)
      const owners = Array.isArray(item.owners) ? item.owners.filter(isCurrentOwner) : []
      resources.set(key, { ...(existing ?? item), owners: [...(Array.isArray(existing?.owners) ? existing.owners : []), ...owners] })
    }
    merged[key] = [...resources.values()]
  }
  return {
    sceneJson: JSON.stringify({ ...parse(original.sceneJson), ...parse(generated.sceneJson) }),
    // 没有新增对象时继续保留原文，包括原缩进和未知字段，不扩大本次接入的三维编辑范围。
    threeDJson: newIds.size ? JSON.stringify(threeD) : original.threeDJson,
    twoDJson: JSON.stringify({ ...originalTwoD, ...generatedTwoD, components }),
    dependenciesJson: JSON.stringify(merged),
  }
}
