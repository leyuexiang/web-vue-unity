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
 * 二维阶段的保存保护：完整三维包原文直通，依赖按拥有者合并。
 * 同一资源可供二维、三维共用，先保留原三维拥有者，再增加当前二维拥有者，删除二维引用不会删三维资源。
 */
export function preserveUneditedThreeDDomain(sceneId: string, generated: SceneFourPackagePayload): SceneFourPackagePayload {
  const original = originals.get(sceneId)
  if (!original) return generated
  const before = parse(original.dependenciesJson)
  const after = parse(generated.dependenciesJson)
  const originalTwoD = parse(original.twoDJson)
  const generatedTwoD = parse(generated.twoDJson)
  // 保留仍存在实例上的扩展字段；已删除部件不能因原始快照保全而复活。
  const originalComponents = new Map((Array.isArray(originalTwoD.components) ? originalTwoD.components : [])
    .filter(isRecord).map(component => [String(component.instanceId), component]))
  const components = (Array.isArray(generatedTwoD.components) ? generatedTwoD.components : [])
    .map(component => isRecord(component) ? { ...originalComponents.get(String(component.instanceId)), ...component } : component)
  const merged: JsonRecord = { ...before, ...after }
  for (const key of ['resources', 'dataBindings', 'behaviors', 'deviceBindings']) {
    const retained = (Array.isArray(before[key]) ? before[key] : []).filter(value => !isOnlyTwoD(value))
    const current = (Array.isArray(after[key]) ? after[key] : []).filter(isGeneratedTwoD)
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
      const owners = Array.isArray(item.owners) ? item.owners.filter(isTwoDOwner) : []
      resources.set(key, { ...(existing ?? item), owners: [...(Array.isArray(existing?.owners) ? existing.owners : []), ...owners] })
    }
    merged[key] = [...resources.values()]
  }
  return {
    sceneJson: JSON.stringify({ ...parse(original.sceneJson), ...parse(generated.sceneJson) }),
    threeDJson: original.threeDJson,
    twoDJson: JSON.stringify({ ...originalTwoD, ...generatedTwoD, components }),
    dependenciesJson: JSON.stringify(merged),
  }
}
