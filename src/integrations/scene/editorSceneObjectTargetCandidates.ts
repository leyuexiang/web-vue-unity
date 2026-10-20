import type { SceneObject, SceneStore } from '@/scene-platform'
import {
  isEditorThreeDimensionalComponentObject,
  resolveEditorSceneObjectStructureCategory,
} from './editorSceneObjectTree'
import type { SceneAllContentsItem } from '@/types/threeScene'
import {
  buildEditorLegacySceneObjectLookup,
  collectEditorLegacySceneObjectIdentifiers,
  findEditorLegacySceneContentForObject,
} from './editorLegacySceneObjectIdentifiers'

export interface EditorSceneObjectTargetCandidatesOptions {
  /** 当前统一场景仓库；存在时它是规则和动作目标的主数据源。 */
  store?: SceneStore | null
  /**
   * 存量 Three 场景快照。
   *
   * 仅用于补充还没有进入 SceneStore 的历史对象，以及带回历史 onlyUuid 等兼容标识；
   * 不能用它覆盖 Store 中名称、显隐等最新领域状态。
   */
  legacyContents?: readonly SceneAllContentsItem[] | null
}

/** 动作执行器当前能按对象标识定位的三维业务类型。 */
const INTERACTION_TARGET_OBJECT_TYPES = new Set<SceneObject['type']>([
  'model',
  'image',
  'primitive',
  'tileset',
  'annotation',
])

const toNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null

const getSceneObjectMetadataIdentifier = (object: SceneObject, key: string) =>
  toNonEmptyString(object.metadata?.[key])

const isWidgetMirrorSceneObject = (object: SceneObject) =>
  object.metadata?.editorModelType === 'widget'

const canUseAsInteractionTarget = (object: SceneObject) =>
  !isWidgetMirrorSceneObject(object) &&
  (INTERACTION_TARGET_OBJECT_TYPES.has(object.type) ||
    isEditorThreeDimensionalComponentObject(object))

/**
 * 将 SceneObject 映射为既有规则和动作表单可消费的候选项。
 *
 * `uuid` 统一写 SceneObject.id，确保新配置不会再保存易变化的 Three uuid；同时把
 * engineObjectUuid 和 onlyUuid 放入兼容别名，允许已有历史事件正常回显和执行。
 */
const mapSceneObjectToTargetCandidate = (
  object: SceneObject,
  legacyItem: SceneAllContentsItem | null,
): SceneAllContentsItem => {
  const engineObjectUuid = getSceneObjectMetadataIdentifier(object, 'engineObjectUuid')
  const legacyOnlyUuid =
    getSceneObjectMetadataIdentifier(object, 'legacyOnlyUuid') ?? legacyItem?.onlyUuid

  return {
    name: object.name || legacyItem?.name || '未命名对象',
    uuid: object.id,
    userData: {
      ...(legacyItem?.userData ?? {}),
      // 仅携带分类标记，避免把完整元数据放入候选列表的响应式结构。
      sceneObjectStructureCategory: resolveEditorSceneObjectStructureCategory(object),
      /** 新运行时查找目标时优先使用该业务标识。 */
      sceneObjectId: object.id,
      ...(engineObjectUuid ? { engineObjectUuid } : {}),
      ...(legacyOnlyUuid ? { onlyUuid: legacyOnlyUuid } : {}),
    },
    visible: object.visible,
    onlyUuid: legacyOnlyUuid ?? undefined,
  }
}

/**
 * 生成规则弹窗与交互动作共用的三维对象候选列表。
 *
 * 主读 SceneStore，保证对象重命名、显隐、删除和保存重开后始终使用统一领域状态；
 * 旧 renderScene 快照只追加尚未映射的历史对象，并仅作为标识兼容补充。调用方应在
 * 打开弹窗或抽屉时调用一次，避免输入过程中反复遍历对象列表。
 */
export const getEditorSceneObjectTargetCandidates = ({
  store,
  legacyContents,
}: EditorSceneObjectTargetCandidatesOptions): SceneAllContentsItem[] => {
  const legacyItems = legacyContents ? [...legacyContents] : []
  if (!store) return legacyItems

  const legacyItemLookup = buildEditorLegacySceneObjectLookup(legacyItems)
  const coveredLegacyIdentifiers = new Set<string>()
  const candidates = store
    .getObjects()
    .filter(canUseAsInteractionTarget)
    .map((object) => {
      const legacyItem = findEditorLegacySceneContentForObject(object, legacyItemLookup)

      ;[
        object.id,
        getSceneObjectMetadataIdentifier(object, 'engineObjectUuid'),
        getSceneObjectMetadataIdentifier(object, 'legacyOnlyUuid'),
        ...(legacyItem ? collectEditorLegacySceneObjectIdentifiers(legacyItem) : []),
      ].forEach((identifier) => {
        if (identifier) coveredLegacyIdentifiers.add(identifier)
      })

      return mapSceneObjectToTargetCandidate(object, legacyItem)
    })

  /**
   * 历史对象尚未被镜像进 Store 时不能凭空丢弃，否则用户编辑旧场景会失去动作目标。
   * 仅追加没有任何稳定标识被 Store 覆盖的项，避免同一对象在下拉框出现两次。
   */
  legacyItems.forEach((item) => {
    const isCovered = collectEditorLegacySceneObjectIdentifiers(item).some((identifier) =>
      coveredLegacyIdentifiers.has(identifier),
    )
    if (!isCovered) candidates.push(item)
  })

  return candidates
}
