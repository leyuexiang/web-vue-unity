import type { SceneDefinition, SceneRuntime } from '@/scene-platform'
import {
  mergeEditorSceneSettingsSnapshot,
  type LegacyScenePanelStateProvider,
} from './editorSceneSettingsAdapter'
import { sanitizeEditorSceneDefinition } from './editorSceneDefinitionSanitizer'
import { mergeEditorWidgetSceneFragmentSnapshot } from './editorSceneWidgetSnapshotAdapter'
import type { WidgetSceneFragment } from './widgetRuntime/widgetSceneFragment'
import { assertEditorSceneAssetsReady } from './editorSceneAssetValidation'
import { hasOriginalScenePackages } from './twoDPackagePreservation'
import { mergeEditorScenePublishSettings } from './editorScenePublishSettingsAdapter'
import {
  serializeScenePublicRequests,
  type EditorSceneGlobalStateSnapshot,
} from './editorSceneGlobalStateAdapter'

export interface EditorSceneDefinitionSaveSourceOptions {
  scene: SceneDefinition
  sceneApi?: LegacyScenePanelStateProvider | null
  /** 保存瞬间的活动 Runtime；GIS 场景用它读取 Cesium 当前经纬高和姿态。 */
  runtime?: Pick<SceneRuntime, 'getCamera'> | null
  widgetSceneFragment: WidgetSceneFragment | null
  sceneGlobalState?: EditorSceneGlobalStateSnapshot | null
}

/**
 * 构建保存前的 SceneDefinition 基础快照。
 *
 * F013 要求新格式保存数据源从 SceneStore 中的 SceneDefinition 出发。
 * 这里只合并场景级纯数据快照并净化编辑器过渡字段，不读取 Three Scene、
 * Mesh、Object3D 或旧运行时对象，旧格式保护分支也复用该安全快照同步场景名。
 */
export const buildEditorSceneDefinitionBaseSaveSource = (
  scene: SceneDefinition,
  sceneApi?: LegacyScenePanelStateProvider | null,
  runtime?: Pick<SceneRuntime, 'getCamera'> | null,
): SceneDefinition =>
  sanitizeEditorSceneDefinition(mergeEditorSceneSettingsSnapshot(scene, sceneApi, runtime))

/**
 * 在已构建好的基础快照上补齐新格式落库字段。
 *
 * 保存适配器会先构建一次基础快照，用于旧格式保护和新格式保存共用。
 * 这里避免再次净化 objects，减少保存路径中的重复对象遍历。
 */
export const buildEditorSceneDefinitionSaveSourceFromBase = (
  baseScene: SceneDefinition,
  widgetSceneFragment: WidgetSceneFragment | null,
  sceneGlobalState?: EditorSceneGlobalStateSnapshot | null,
): SceneDefinition => {
  const sceneWithWidgetFragment = mergeEditorWidgetSceneFragmentSnapshot(
    baseScene,
    widgetSceneFragment,
  )
  const sceneWithPublishSettings = mergeEditorScenePublishSettings(sceneWithWidgetFragment)
  const settings = sceneWithPublishSettings.settings ?? {}
  const dependencies =
    typeof settings.dependencies === 'object' &&
    settings.dependencies !== null &&
    !Array.isArray(settings.dependencies)
      ? (settings.dependencies as Record<string, unknown>)
      : null
  const {
    requestGlobalConfig: _legacyGlobalConfig,
    publicRequests: _legacyPublicRequests,
    sceneActions: _legacySceneActions,
    ...targetDependencies
  } = dependencies ?? {}
  /**
   * 请求仓库是编辑态权威来源。保存时一次性写入 SceneDefinition 的场景级规范位置，
   * 并同步剔除旧 dependencies 中的同名镜像，实现历史数据再次保存自动净化。
   */
  const sceneToSave: SceneDefinition = {
    ...sceneWithPublishSettings,
    settings: {
      ...settings,
      /**
       * 只有成功采集到当前请求仓库时才清理内部旧镜像。纯数据工具没有活动 Pinia 时保留兼容输入，
       * 后续四包投影仍会把它迁入 sceneJson，并保证 dependenciesJson 不输出这三个字段。
       */
      ...(dependencies && sceneGlobalState ? { dependencies: targetDependencies } : {}),
      ...(sceneGlobalState
        ? {
            requestGlobalConfig: structuredClone(sceneGlobalState.requestGlobalConfig),
            publicRequests: serializeScenePublicRequests(sceneGlobalState.publicRequests),
            sceneActions: structuredClone(sceneGlobalState.sceneActions),
          }
        : {}),
    },
  }

  /**
   * 新格式落库前只做字段级资源检查。
   * 资源网络可达性、鉴权和跨域仍属于真实接口验收，不放进保存源构建路径。
   */
  // 已有完整原始三维包时只校验本阶段编辑的二维资源；三维缺失资源不应阻塞无损直通保存。
  assertEditorSceneAssetsReady(hasOriginalScenePackages(baseScene.id) ? { ...sceneToSave, objects: [] } : sceneToSave)

  return sceneToSave
}

/**
 * 构建新格式真正落库的 SceneDefinition 快照。
 *
 * 输入边界必须保持为可序列化数据：SceneDefinition、旧场景面板纯配置和二维画布片段。
 * 该函数负责补齐二维片段、发布占位和资产字段校验，明确不触碰旧
 * useGetSceneAsyncConfig 的 Three 场景遍历逻辑。
 */
export const buildEditorSceneDefinitionSaveSource = ({
  scene,
  sceneApi,
  runtime,
  widgetSceneFragment,
  sceneGlobalState,
}: EditorSceneDefinitionSaveSourceOptions): SceneDefinition => {
  const baseScene = buildEditorSceneDefinitionBaseSaveSource(scene, sceneApi, runtime)
  return buildEditorSceneDefinitionSaveSourceFromBase(
    baseScene,
    widgetSceneFragment,
    sceneGlobalState,
  )
}
