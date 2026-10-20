import type { SceneObject } from '@/scene-platform'
import type { SceneAllContentsItem } from '@/types/threeScene'

/**
 * 判断旧对象 userData 是否仍是可安全读取的普通记录。
 *
 * 历史场景允许 userData 来自不同版本的序列化结果。这里在统一标识解析入口完成类型
 * 收口，调用方只处理已经过滤过的字符串，避免对象树、交互规则等多个入口重复读取未知值。
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * 过滤空白、非字符串的历史标识，避免它们进入 Map / Set 后把多个无效对象误判为同一对象。
 */
const toNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null

/**
 * 收集一个旧渲染快照可用于关联的全部稳定标识。
 *
 * 历史数据可能以 Three 原生 uuid、业务 onlyUuid、阶段性 sceneObjectId，或 Runtime
 * 写回的 engineObjectUuid 之一保存。一次收集、Set 去重后供对象树和动作候选共用，
 * 保持合并过程线性复杂度，并避免各界面把同一对象判断成不同条目。
 */
export const collectEditorLegacySceneObjectIdentifiers = (item: SceneAllContentsItem): string[] => {
  const identifiers = new Set<string>()
  const userData = isRecord(item.userData) ? item.userData : {}

  ;[
    item.uuid,
    item.onlyUuid,
    userData.onlyUuid,
    userData.sceneObjectId,
    userData.engineObjectUuid,
  ].forEach((value) => {
    const identifier = toNonEmptyString(value)
    if (identifier) identifiers.add(identifier)
  })

  return Array.from(identifiers)
}

/**
 * 收集 SceneStore 对象与旧渲染快照可能关联的标识。
 *
 * SceneObject.id 是新平台的唯一主键；engineObjectUuid 和 legacyOnlyUuid 只负责将
 * 已运行的 Three 对象、旧保存数据正确折叠回该主键，不能反过来作为新配置的主写标识。
 */
export const collectEditorSceneObjectLegacyIdentifiers = (object: SceneObject): string[] => {
  const identifiers = new Set<string>()

  ;[object.id, object.metadata?.engineObjectUuid, object.metadata?.legacyOnlyUuid].forEach(
    (value) => {
      const identifier = toNonEmptyString(value)
      if (identifier) identifiers.add(identifier)
    },
  )

  return Array.from(identifiers)
}

/**
 * 用旧对象的全部稳定标识建立查找表。
 *
 * 首个出现的快照拥有优先级，以保留场景遍历顺序；异常数据中即使出现重复标识，也不会
 * 因后续遍历随机覆盖前项，保障对象树和规则下拉的显示顺序稳定。
 */
export const buildEditorLegacySceneObjectLookup = (
  legacyContents: readonly SceneAllContentsItem[],
): Map<string, SceneAllContentsItem> => {
  const lookup = new Map<string, SceneAllContentsItem>()

  legacyContents.forEach((item) => {
    collectEditorLegacySceneObjectIdentifiers(item).forEach((identifier) => {
      if (!lookup.has(identifier)) lookup.set(identifier, item)
    })
  })

  return lookup
}

/**
 * 查找一个平台对象对应的旧渲染快照。
 *
 * 读取按「业务主键 -> 引擎 uuid -> 历史 onlyUuid」的稳定优先级进行；整个过程仅查询
 * 已构建的 Map，不遍历 Three 场景，避免每次结构树刷新造成额外的运行时扫描。
 */
export const findEditorLegacySceneContentForObject = (
  object: SceneObject,
  legacyContentLookup: ReadonlyMap<string, SceneAllContentsItem>,
): SceneAllContentsItem | null => {
  for (const identifier of collectEditorSceneObjectLegacyIdentifiers(object)) {
    const legacyItem = legacyContentLookup.get(identifier)
    if (legacyItem) return legacyItem
  }

  return null
}
