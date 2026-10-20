import { cloneDeep } from 'lodash-es'
import type { SceneDefinition } from '@/scene-platform'
import type { WidgetConfig } from '@/stores/sceneEditStore'
import type { WidgetCanvasConfig, WidgetLayerNode } from '@/types/threeScene'
import type { WidgetSceneFragment } from './widgetRuntime/widgetSceneFragment'

export const EDITOR_WIDGET_SCENE_FRAGMENT_KEY = 'widgetSceneFragment'

export type EditorWidgetSceneFragmentApplier = (
  fragment: WidgetSceneFragment,
) => void | Promise<void>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const createEmptyWidgetSceneFragment = (): WidgetSceneFragment => ({
  widgets: [],
  widgetLayerTree: [],
})

const normalizeWidgetCanvasConfig = (value: unknown): WidgetCanvasConfig | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  const width = Number(value.width)
  const height = Number(value.height)
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return undefined
  }

  return { width, height }
}

const normalizeWidgetSceneFragment = (fragment: unknown): WidgetSceneFragment => {
  if (!isRecord(fragment)) {
    return createEmptyWidgetSceneFragment()
  }

  return {
    /**
     * 二维部件配置仍由现有 widget 仓库解释。
     * 这里仅做容器级校验和深拷贝，避免保存/加载适配层在不了解具体组件类的情况下
     * 误删组件私有字段。
     */
    widgets: Array.isArray(fragment.widgets) ? (cloneDeep(fragment.widgets) as WidgetConfig[]) : [],
    widgetLayerTree: Array.isArray(fragment.widgetLayerTree)
      ? (cloneDeep(fragment.widgetLayerTree) as WidgetLayerNode[])
      : [],
    widgetCanvas: normalizeWidgetCanvasConfig(fragment.widgetCanvas),
  }
}

/**
 * 读取 SceneDefinition 中的二维画布片段。
 *
 * 新格式过渡期不改平台核心类型，二维部件快照挂在 settings.editor 下。
 * 缺少片段时返回空片段，用于加载新场景时清空上一场景残留的二维仓库。
 */
export const resolveEditorWidgetSceneFragment = (scene: SceneDefinition): WidgetSceneFragment => {
  const editorSettings = scene.settings.editor
  if (!isRecord(editorSettings)) {
    return createEmptyWidgetSceneFragment()
  }

  return normalizeWidgetSceneFragment(editorSettings[EDITOR_WIDGET_SCENE_FRAGMENT_KEY])
}

const collectWidgetIds = (fragment: WidgetSceneFragment) =>
  new Set(fragment.widgets.map((widget) => widget.id).filter(Boolean))

/**
 * 从 SceneDefinition.objects 中剔除二维部件镜像。
 *
 * 过渡期二维部件会为了 id 对齐短暂写入 SceneStore；一旦保存数据里已经有
 * widgetSceneFragment，真实二维结构就以该片段为准，objects 中的同 id 记录只会导致
 * 刷新后“3D模型”和“部件”重复展示。
 */
export const removeEditorWidgetMirrorObjects = (
  scene: SceneDefinition,
  fragment: WidgetSceneFragment = resolveEditorWidgetSceneFragment(scene),
): SceneDefinition => {
  const widgetIds = collectWidgetIds(fragment)
  if (widgetIds.size === 0) {
    return scene
  }

  const objects = scene.objects.filter((object) => !widgetIds.has(object.id))
  if (objects.length === scene.objects.length) {
    return scene
  }

  return {
    ...scene,
    objects,
  }
}

/**
 * 保存新格式前，把当前二维画布真实片段并入 SceneDefinition。
 *
 * 注意：二维部件暂未成为平台核心 SceneObject 的正式类型。
 * 因此这里只在编辑器接入层把 widgets、widgetLayerTree 和 widgetCanvas
 * 作为编辑器私有快照保存，避免刷新后只能看到 SceneStore 中的部件镜像对象。
 */
export const mergeEditorWidgetSceneFragmentSnapshot = (
  scene: SceneDefinition,
  widgetSceneFragment: WidgetSceneFragment | null,
): SceneDefinition => {
  if (widgetSceneFragment === null) {
    return scene
  }

  const editorSettings = isRecord(scene.settings.editor) ? scene.settings.editor : {}

  return removeEditorWidgetMirrorObjects(
    {
      ...scene,
      settings: {
        ...scene.settings,
        editor: {
          ...editorSettings,
          [EDITOR_WIDGET_SCENE_FRAGMENT_KEY]: normalizeWidgetSceneFragment(widgetSceneFragment),
        },
      },
    },
    normalizeWidgetSceneFragment(widgetSceneFragment),
  )
}

/**
 * 加载新格式后，把 settings.editor 中的二维片段恢复到现有 widget 仓库。
 * 即使片段缺失也会应用空片段，防止连续打开不同场景时保留上一场景的二维组件。
 */
export const applyEditorWidgetSceneFragment = async (
  scene: SceneDefinition,
  applyFragment?: EditorWidgetSceneFragmentApplier,
  /** 动态模块返回后再次核对页面生命周期，阻止卸载后的旧场景启动恢复。 */
  isActive?: () => boolean,
) => {
  if (isActive && !isActive()) return
  const fragment = resolveEditorWidgetSceneFragment(scene)
  if (applyFragment) {
    await applyFragment(fragment)
    return
  }

  /**
   * 运行时读取/应用二维仓库时再动态导入，避免保存加载适配器一被单测导入就加载全部
   * widget 包和虚拟图标模块。
   */
  const { applyWidgetSceneFragment } = await import('./widgetRuntime/widgetSceneFragment')
  if (isActive && !isActive()) return
  await applyWidgetSceneFragment(fragment)
}

/**
 * 从场景定义中追加指定的二维运行时片段。
 * 与全量 apply 分离，保证发布预览首次显示隐藏组件时不会重装已经渲染的图表、输入框或数据源。
 */
export const appendEditorWidgetSceneFragment = async (
  scene: SceneDefinition,
  appendFragment?: EditorWidgetSceneFragmentApplier,
) => {
  const fragment = resolveEditorWidgetSceneFragment(scene)
  if (appendFragment) {
    await appendFragment(fragment)
    return
  }

  const { appendWidgetSceneFragment } = await import('./widgetRuntime/widgetSceneFragment')
  await appendWidgetSceneFragment(fragment)
}
