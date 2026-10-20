// 历史三维兼容结构仅用于类型边界，不加载渲染引擎。
import type * as THREE from '@/types/legacyObjectPort'
import type { SceneAllContentsItem } from '@/types/threeScene'

export type SceneObjectTargetValueAliasMap = Map<string, string>

const SCENE_OBJECT_TARGET_ALIAS_KEYS = ['onlyUuid', 'sceneObjectId', 'engineObjectUuid'] as const

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

/**
 * 获取交互面板下拉框真正写入表单的目标值。
 *
 * 动作目标保存时统一使用结构树和 SceneStore 都能识别的 `uuid`。
 *
 * 历史运行时动作执行主链路曾以 `onlyUuid` 为优先标识；刷新重开后旧 `onlyUuid`
 * 可能被重新生成，继续保存它会导致下拉框回显和事件执行断链。这里固定返回
 * `uuid`，旧 `onlyUuid` 只作为回显别名参与匹配。
 */
export const getSceneObjectTargetOptionValue = (item: SceneAllContentsItem): string => item.uuid

const objectMatchesTargetId = (object: THREE.Object3D, targetId: string): boolean => {
  if (object.uuid === targetId) {
    return true
  }

  return SCENE_OBJECT_TARGET_ALIAS_KEYS.some((key) => object.userData?.[key] === targetId)
}

const collectOptionTargetAliases = (item: SceneAllContentsItem): string[] => {
  const aliases = new Set<string>()
  aliases.add(item.uuid)

  const optionValue = getSceneObjectTargetOptionValue(item)
  if (isNonEmptyString(optionValue)) {
    aliases.add(optionValue)
  }

  SCENE_OBJECT_TARGET_ALIAS_KEYS.forEach((key) => {
    const value = key === 'onlyUuid' ? item.onlyUuid : item.userData?.[key]
    if (isNonEmptyString(value)) {
      aliases.add(value)
    }
  })

  return Array.from(aliases)
}

/**
 * 为动作目标下拉框建立“任意历史标识 -> 当前选项值（option value）”的映射。
 *
 * 抽屉回显时只构建一次映射，后续每个动作字段做 O(1) 查询，避免在复杂事件配置里
 * 对每条动作反复扫描完整场景列表。
 */
export const buildSceneObjectTargetValueAliasMap = (
  items: SceneAllContentsItem[],
): SceneObjectTargetValueAliasMap => {
  const aliasMap: SceneObjectTargetValueAliasMap = new Map()

  items.forEach((item) => {
    const optionValue = getSceneObjectTargetOptionValue(item)
    if (!isNonEmptyString(optionValue)) return

    collectOptionTargetAliases(item).forEach((alias) => {
      if (!aliasMap.has(alias)) {
        aliasMap.set(alias, optionValue)
      }
    })
  })

  return aliasMap
}

/**
 * 把已保存动作里的旧目标标识改写为当前下拉框可识别的值。
 *
 * 找不到映射时保留原值，让表单继续暴露异常配置；不能静默清空，否则用户会误以为
 * 原有事件被删除。
 */
export const normalizeSceneObjectTargetValue = (
  targetId: string | null | undefined,
  aliasMap: SceneObjectTargetValueAliasMap,
  fallbackValue?: string | null,
): string => {
  if (!isNonEmptyString(targetId)) return ''
  return aliasMap.get(targetId) ?? fallbackValue ?? targetId
}

/**
 * 在真实 Three 场景中按兼容目标标识查找对象。
 *
 * 交互事件持久化可能来自三个阶段：旧业务 `onlyUuid`、新平台对象 `SceneObject.id`
 * 对齐后的 `uuid`、以及中间适配层写入的镜像字段。执行期统一在这里解析，避免
 * 高亮、显隐、相机移动等动作各自实现一套不一致的查找规则。
 */
export const findSceneObjectByTargetId = (
  scene: THREE.Scene | null | undefined,
  targetId: string | null | undefined,
): THREE.Object3D | null => {
  if (!scene || !isNonEmptyString(targetId)) {
    return null
  }

  let foundObject: THREE.Object3D | null = null
  scene.traverse((object) => {
    if (foundObject) return
    if (objectMatchesTargetId(object, targetId)) {
      foundObject = object
    }
  })

  return foundObject
}
