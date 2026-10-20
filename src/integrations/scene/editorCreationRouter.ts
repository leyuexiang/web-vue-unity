import { DRAG_MODEL_ENUM } from '@/enums'
import type {
  AnnotationModel,
  FileModel,
  GeometryModel,
  ImageModel,
  MarkingModel,
  PipeModel,
  WidgetModel,
  EffectDragItem,
} from '@/types/threeScene'
import { appLogger } from '@/utils/logger'
import type { SceneLightConfig } from '@/scene-platform/core/types'
import type { FirstPersonConfig } from '@/scene-platform/core/types'

export interface LightDragItem {
  [key: string]: unknown
  id: string
  name: string
  modelType: DRAG_MODEL_ENUM.Light
  icon: string
  light: Partial<SceneLightConfig>
}

export interface FirstPersonDragItem {
  [key: string]: unknown
  id: string
  name: string
  modelType: DRAG_MODEL_ENUM.FirstPerson
  icon: string
  firstPerson: Partial<FirstPersonConfig>
}

export type EditorCreationModel =
  | GeometryModel
  | FileModel
  | MarkingModel
  | AnnotationModel
  | ImageModel
  | WidgetModel
  | PipeModel
  | EffectDragItem
  | LightDragItem
  | FirstPersonDragItem

export interface EditorCreationResult {
  objectId: string | null
}

export interface EditorCreationRouterContext {
  /**
   * 二维部件拥有独立 DOM 生命周期，不属于三维运行时对象；因此仍通过专属端口创建。
   * 该上下文刻意不再暴露旧 sceneApi，避免新增调用方绕过 CommandBus 直接创建三维实例。
   */
  createWidget: (
    model: WidgetModel,
    vector2: { clientX: number; clientY: number },
  ) => string | null | Promise<string | null>
}

/**
 * 编辑器拖拽创建的二维部件兜底路由。
 *
 * 所有三维对象必须先写入 CommandBus，再由 RuntimeBridge 创建真实运行时对象。本路由不持有
 * 旧 sceneApi，也不允许把三维模型、图片、标注、几何体、打点或管线回退到旧实例创建，防止
 * 同一拖拽同时产生“旧实例 + SceneStore 对象”两份数据。二维 Widget 保持专属端口是因为其
 * 生命周期由 DOM 覆盖层管理，不能伪装成 Three 或 Cesium 可渲染实体。
 */
export const routeEditorCreation = async (
  modelData: EditorCreationModel,
  vector2: { clientX: number; clientY: number },
  context: EditorCreationRouterContext,
): Promise<EditorCreationResult> => {
  switch (modelData.modelType) {
    case DRAG_MODEL_ENUM.Widget:
      return { objectId: await context.createWidget(modelData, vector2) }
    case DRAG_MODEL_ENUM.Effect:
      // 场景效果由 SceneCanvas 的 CommandBus 专用分支处理；这里明确拒绝旧对象回退。
      appLogger.warn('EditorCreationRouter', '效果必须经 SceneStore effects 创建，已拒绝旧路由回退', modelData)
      return { objectId: null }
    case DRAG_MODEL_ENUM.Geometry:
    case DRAG_MODEL_ENUM.Light:
    case DRAG_MODEL_ENUM.Pipe:
    case DRAG_MODEL_ENUM.Annotation:
    case DRAG_MODEL_ENUM.Image:
    case DRAG_MODEL_ENUM.Model:
    case DRAG_MODEL_ENUM.CustomModel:
    case DRAG_MODEL_ENUM.Marking:
      /**
       * 正常画布流程会在此之前由 CommandBus 主路由截获。这里显式拒绝而不是静默回退，
       * 使未来新增入口能立即暴露架构违规，不会重新引入旧 sceneApi 双写。
       */
      appLogger.warn(
        'EditorCreationRouter',
        '三维对象必须经 CommandBus 创建，已拒绝旧路由回退',
        modelData,
      )
      return { objectId: null }
    default:
      appLogger.warn('EditorCreationRouter', '未知拖拽模型类型', modelData)
      return { objectId: null }
  }
}
