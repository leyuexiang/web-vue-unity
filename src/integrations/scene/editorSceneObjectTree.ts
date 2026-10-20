import { DRAG_MODEL_ENUM } from '@/enums'
import type { SceneObject } from '@/scene-platform'
import type { SceneAllContentsItem } from '@/types/threeScene'
import {
  buildEditorLegacySceneObjectLookup,
  collectEditorLegacySceneObjectIdentifiers,
  collectEditorSceneObjectLegacyIdentifiers,
  findEditorLegacySceneContentForObject,
} from './editorLegacySceneObjectIdentifiers'

/**
 * 以旧渲染对象的全部稳定标识建立快速索引。
 *
 * 对象树的列表来源已经迁到 SceneStore，但显隐、锁定、删除、重命名这些动作仍依赖旧
 * sceneApi 的对象快照。这里把旧对象只作为动作兼容参数缓存，避免模板渲染时反复线性查找。
 */
export const buildLegacySceneContentMap = (contents: readonly SceneAllContentsItem[]) =>
  buildEditorLegacySceneObjectLookup(contents)

const isWidgetMirrorSceneObject = (object: SceneObject) =>
  object.metadata?.editorModelType === DRAG_MODEL_ENUM.Widget

const getManagedSceneObjects = (sceneObjects: readonly SceneObject[]) =>
  sceneObjects.filter((object) => !isWidgetMirrorSceneObject(object))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasComponentKind = (value: unknown) => {
  if (!isRecord(value)) return false
  return value.componentKind === 'billboard'
}

/**
 * 判断统一场景对象是否为三维组件实例。
 *
 * 正式三维组件优先读取领域真源（看板、热力场和中国 3D 地图）；旧过渡数据可能尚未经过
 * SceneDefinition 兼容归一化，此时再读取创建快照中的 `componentKind`。分类只影响结构树归属，
 * 不改变对象的 SceneObject 类型、运行时实例或保存格式。
 */
export const isEditorThreeDimensionalComponentObject = (object: SceneObject): boolean =>
  object.billboard !== undefined ||
  hasComponentKind(object.metadata?.editorModelSnapshot) ||
  (object.type === 'effect' &&
    (object.effect?.type === 'volume-heatmap' || object.effect?.type === 'three-map'))

export type EditorSceneObjectStructureCategory = 'model' | 'three-dimensional-component'

/**
 * 解析统一场景对象在结构面板中的产品分类。
 *
 * 分类只读取运行时无关的领域字段，不判断 local/geo 变换类型。因此同一个三维看板无论由
 * Three Runtime 还是 Cesium Runtime 渲染，都必须稳定进入“三维组件”列表。
 */
export const resolveEditorSceneObjectStructureCategory = (
  object: SceneObject,
): EditorSceneObjectStructureCategory =>
  isEditorThreeDimensionalComponentObject(object) ? 'three-dimensional-component' : 'model'

/**
 * 判断结构树兼容条目是否为三维组件实例。
 *
 * 新平台映射条目使用显式分类标记；未映射的旧 Three 对象则可能把创建参数保存在
 * `editorModelSnapshot` 或 `options` 中。集中兼容这些历史位置，避免 StructurePanel 在每次渲染时
 * 重复解析对象形态，也确保普通历史图片仍留在模型分类中。
 */
export const isEditorThreeDimensionalComponentContent = (item: SceneAllContentsItem): boolean => {
  const userData = isRecord(item.userData) ? item.userData : {}
  if (userData.sceneObjectStructureCategory === 'three-dimensional-component') return true

  const sceneObjectMetadata = isRecord(userData.sceneObjectMetadata)
    ? userData.sceneObjectMetadata
    : null

  return (
    hasComponentKind(userData.editorModelSnapshot) ||
    hasComponentKind(userData.options) ||
    hasComponentKind(sceneObjectMetadata?.editorModelSnapshot)
  )
}

/**
 * 获取尚未镜像进 SceneStore 的历史对象。
 *
 * 结构树必须以 SceneStore 为主读，但重构进行中不能因为对象尚未映射就让它从界面消失。
 * 本函数只追加没有任何稳定标识被 Store 覆盖的旧快照：已经迁移的对象仍由 Store 提供
 * 名称、显隐、锁定等最新状态；仅未迁移项保留旧 uuid，以继续走既有选择和编辑兜底链路。
 */
export const getUnmappedLegacySceneContents = (
  sceneObjects: readonly SceneObject[],
  legacyContentMap: ReadonlyMap<string, SceneAllContentsItem>,
  legacyContents: readonly SceneAllContentsItem[],
): SceneAllContentsItem[] => {
  const coveredLegacyIdentifiers = new Set<string>()

  getManagedSceneObjects(sceneObjects).forEach((object) => {
    const legacyItem = findEditorLegacySceneContentForObject(object, legacyContentMap)

    collectEditorSceneObjectLegacyIdentifiers(object).forEach((identifier) => {
      coveredLegacyIdentifiers.add(identifier)
    })
    if (!legacyItem) return

    collectEditorLegacySceneObjectIdentifiers(legacyItem).forEach((identifier) => {
      coveredLegacyIdentifiers.add(identifier)
    })
  })

  return legacyContents.filter(
    (item) =>
      !collectEditorLegacySceneObjectIdentifiers(item).some((identifier) =>
        coveredLegacyIdentifiers.has(identifier),
      ),
  )
}

/**
 * 把 SceneStore 对象映射成现有 StructurePanel 可消费的只读条目。
 *
 * 重要边界：
 * - 数量、顺序、名称和基础可见性来自 SceneStore，保证 F005 的对象树只读数据源已切换；
 * - 显隐状态同样以 SceneStore 为准，避免 RuntimeBridge 已同步而列表仍显示旧快照；
 * - userData、onlyUuid 等旧字段只从旧渲染对象补齐，用于保留当前未迁移动作；
 * - 尚未映射的旧对象会以原 uuid 追加在末尾，保证选择、显隐、锁定、重命名和删除入口可达；
 * - 当前 SceneStore 暂无 parentId / children 字段，因此这里保持扁平列表，不在编辑器线发明层级协议。
 */
export const mapSceneObjectsToStructureContents = (
  sceneObjects: readonly SceneObject[],
  legacyContentMap: ReadonlyMap<string, SceneAllContentsItem>,
  legacyContents: readonly SceneAllContentsItem[] = [],
): SceneAllContentsItem[] => {
  const managedContents = getManagedSceneObjects(sceneObjects)
    /**
     * 二维部件会在过渡期写一份 SceneStore 镜像，用于 id 对齐、删除同步和保存保护。
     * 真实结构仍由 widgetLayerTree 驱动，因此这里必须过滤镜像，避免部件跑到“3D模型”区域。
     */
    .map((object) => {
      const legacyItem = findEditorLegacySceneContentForObject(object, legacyContentMap)
      const metadataPickable = object.metadata?.pickable
      const structureCategory = resolveEditorSceneObjectStructureCategory(object)
      /**
       * 结构树图标必须显示 Store 中的当前锁定状态，不能继续依赖旧对象的陈旧 isDrag。
       * 这里仅构造模板读取快照；真实旧 Three 对象由 Runtime 同步，不会被对象树直接改写。
       */
      const pickable = typeof metadataPickable === 'boolean' ? metadataPickable : !object.locked

      return {
        name: object.name || legacyItem?.name || '未命名对象',
        uuid: object.id,
        userData: {
          ...legacyItem?.userData,
          sceneObjectType: object.type,
          sceneObjectMetadata: object.metadata,
          isDrag: pickable,
          /**
           * 三维组件仍是 SceneObject，不能混入二维 widgetLayerTree；这里只写轻量分类标记，
           * 让结构面板把实例展示到“三维组件”分类，同时继续复用三维对象的选择与编辑链路。
           */
          ...(structureCategory === 'three-dimensional-component'
            ? { sceneObjectStructureCategory: 'three-dimensional-component' }
            : {}),
        },
        visible: object.visible,
        onlyUuid: legacyItem?.onlyUuid,
        children: legacyItem?.children,
      }
    })

  return [
    ...managedContents,
    ...getUnmappedLegacySceneContents(sceneObjects, legacyContentMap, legacyContents),
  ]
}
