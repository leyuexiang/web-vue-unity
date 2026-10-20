// 历史三维兼容结构仅用于类型边界，不加载渲染引擎。
import type * as THREE from '@/types/legacyObjectPort'
import { DRAG_MODEL_ENUM, MODEL_ENUM, TASK_TYPE_ENUM } from '@/enums/index'
import type { ModelLodVariant } from '@/scene-platform/core/types'
import type { WidgetConfig } from '@/stores/sceneEditStore'
import type { ComponentDataConfig, PublicRequestConfig, RequestGlobalConfig } from './data-config'
import type { InteractionEvent } from './sceneInteraction'

/**
 * 交互/状态类型已拆到独立文件，主类型入口继续转导出。
 * 这样既能压缩 `threeScene.ts` 的体积，又不影响旧代码从本文件导入类型。
 */
export type {
  ActionItem,
  WidgetParameterMapping,
  WidgetPropertyAssignment,
  ConditionBlokList,
  ConditionGroup,
  ConditionItem,
  InteractionEvent,
} from './sceneInteraction'

export type LightHelperType =
  | THREE.DirectionalLightHelper
  | THREE.PointLightHelper
  | THREE.SpotLightHelper

export interface CurrentDragItem {
  clientX: number
  clientY: number
  modelData: unknown
}
// 几何体模型
export type GeometryModel = {
  // 基础属性
  name: string
  type: string
  modelType: DRAG_MODEL_ENUM.Geometry
  icon: string

  // 几何参数 - 根据不同的几何体类型，这些属性可能不同。
  // 本地 Three.js 场景约定 1 个长度单位为 1 米；立方体默认值由资源配置统一提供。
  // 立方体相关
  width?: number
  height?: number
  depth?: number
  widthSegments?: number
  heightSegments?: number
  depthSegments?: number

  // 球体相关
  radius?: number
  phiStart?: number
  phiLength?: number
  thetaStart?: number
  thetaLength?: number

  // 圆柱体相关
  radiusTop?: number
  radiusBottom?: number
  radialSegments?: number
  openEnded?: boolean

  // 圆锥相关
  // 胶囊相关
  length?: number
  capSegments?: number

  // 圆形相关
  segments?: number

  // 圆环相关
  innerRadius?: number
  outerRadius?: number
  thetaSegments?: number
  phiSegments?: number

  // 圆环体相关
  tube?: number
  tubularSegments?: number
  arc?: number

  // 多面体相关
  detail?: number

  // 变换属性
  position?: {
    x?: number
    y?: number
    z?: number
  }
  rotation?: {
    x?: number
    y?: number
    z?: number
  }
  scale?: {
    x?: number
    y?: number
    z?: number
  }

  // 材质属性
  material?: {
    color?: string
    metalness?: number
    roughness?: number
    emissive?: string
    emissiveIntensity?: number
    side?: 'FrontSide' | 'BackSide' | 'DoubleSide'
  }

  // 阴影属性
  castShadow?: boolean
  receiveShadow?: boolean

  // 用户数据
  userData?: Record<string, unknown>
  // 索引签名，允许动态访问属性
  [key: string]: unknown
}

// 管道模型
export type PipeModel = {
  // 模型属性
  name: string
  type: string
  modelType: DRAG_MODEL_ENUM.Pipe
  icon: string

  // 管道参数
  radius?: number
  height?: number
  radialSegments?: number
  heightSegments?: number
  capSegments?: number

  // 材质属性
  material?: {
    color?: string
    metalness?: number
    roughness?: number
  }
}

//
// 标注模型
export type AnnotationModel = {
  name: string
  type: string
  modelType: DRAG_MODEL_ENUM.Annotation
  icon: string
  text?: string
  fontSize?: number
  fontColor?: string
  backgroundColor?: string
  backgroundImage?: HTMLImageElement | null
  borderWidth?: number
  borderColor?: string
  padding?: [number, number, number, number] // top, right, bottom, left
  width?: number
  height?: number
  lineHeight?: number
}

// 图片模型
export type ImageModel = {
  name: string
  type: string
  modelType: DRAG_MODEL_ENUM.Image
  icon: string
  defaultImagePath: string
  color?: string
  imagePath?: string
}
/**
 * 资源市场模型的稳定资产引用。
 *
 * `id` 和 `version` 来自资源服务，而不是场景对象的 UUID；因此同一资源被多次拖入时，
 * 场景运行时可以识别为同一份可复用资源。`url` 保留当次资源版本的实际加载地址，
 * 避免仅凭资源名称或相对路径推断文件内容。
 */
export interface ResourceMarketAssetRef {
  id: string
  url: string
  version?: string
  /**
   * 资源市场可选提供的远距离低细节模型变体。
   * 这里只保存 GLB / GLTF 文件身份及切换阈值，不能附带 Three/Cesium 运行时对象；未提供时仍按
   * 原始高细节资源创建场景对象，保证既有资源和已保存场景完全兼容。
   */
  modelLodVariants?: ModelLodVariant[]
}

// 普通模型
export type FileModel = {
  name: string
  modelType: DRAG_MODEL_ENUM.Model | DRAG_MODEL_ENUM.CustomModel
  icon: string
  filePath: string
  fileType: MODEL_ENUM
  /**
   * 仅资源市场拖拽时携带的稳定资源身份。
   * 历史场景、内置模型和其他来源没有该字段时，仍由场景映射层使用对象级回退资产 ID。
   */
  resourceAsset?: ResourceMarketAssetRef
}

export type MarkingModel = {
  name: string
  modelType: DRAG_MODEL_ENUM.Marking
  icon: string
}

// 部件模型
export interface WidgetDragPreset {
  /**
   * 左侧某些资源卡片共用同一个组件实现，但需要在落到画布时写入不同默认值。
   * 例如 GoView 图标都复用 `VIcon`，具体图标名就通过 option 预设传入。
   */
  option?: Record<string, unknown>
  /**
   * 新建实例时可一并带入默认数据配置。
   * 这样右侧“数据”面板首次打开就能展示该资源卡片对应的静态数据内容。
   */
  dataConfig?: ComponentDataConfig
}

export type WidgetModel = {
  name: string
  modelType: DRAG_MODEL_ENUM.Widget
  icon: string
  packageName: string
  keyName: string
  preset?: WidgetDragPreset
}

export type VolumeHeatmapDragItem = {
  id: string
  name: string
  modelType: DRAG_MODEL_ENUM.Effect
  icon: string
  effectType: 'volume-heatmap'
}

/** 中国 3D 地图使用独立预设，但创建结果仍是 SceneObject(type='effect')。 */
export type ThreeMapDragItem = {
  id: string
  name: string
  modelType: DRAG_MODEL_ENUM.Effect
  icon: string
  effectType: 'three-map'
  presetId: 'china-province-v1'
}

export type EffectDragItem = VolumeHeatmapDragItem | ThreeMapDragItem

export interface LngLatAlt {
  longitude: number
  latitude: number
  altitude: number
}

export interface BasePanelConfig {
  name: string
  visible: boolean
  pickup?: boolean
  deviceId: string
  lngLat: LngLatAlt
  position: {
    x: number
    y: number
    z: number
  }
  rotation: {
    x: number
    y: number
    z: number
  }
  scale: {
    x: number
    y: number
    z: number
  }
  offset: {
    x: number
    y: number
    z: number
  }
  transparent?: boolean
  /**
   * GIS 基础几何体的显式不透明度，取值范围为 0 至 1。
   *
   * 旧 transparent 只对应 Three 材质开关，不能推导 Cesium Entity 的透明数值；因此 GIS
   * 对象必须通过该字段表达确定的视觉结果。局部三维和未映射旧对象保持不使用此字段。
   */
  opacity?: number
}

export interface AnnotationPanelConfig {
  text: string
  fontSize: number
  fontColor: string
  backgroundColor: string
  backgroundImage: string | HTMLImageElement | null
  borderWidth: number
  borderColor: string
  padding: [number, number, number, number] // top, right, bottom, left
  width: number
  height: number
  lineHeight: number
}

export interface ImagePanelConfig {
  color: string
  imagePath: string
  defaultImagePath: string
}

export type MarkingPanelConfig = ImageModel | FileModel | AnnotationModel | GeometryModel

export interface DatasetProperty {
  datasetName: string
  bindProperty: string
  databaseName: string
  tableName: string
  dataSourceId: string
}
export interface DataPanelConfig {
  id: string
  targetName: string
  fields: string[]
  propertyName: string
  datasetProperty: DatasetProperty
}

export interface SceneAsyncConfig {
  // 场景配置
  sceneConfig: {
    // 用户配置的发布舞台尺寸。三维渲染窗口和二维部件层共用这份坐标基准，显示缩放不写入场景快照。
    widgetCanvas?: WidgetCanvasConfig
    // GIS 配置
    gis?: {
      // 场景原点经纬度（Three.js 坐标原点对应的地理位置）
      sceneOrigin: LngLatAlt
      // 是否启用 GIS 地图
      enableGIS: boolean
    }
    /**
     * GIS 场景天气的前端持久化快照。
     *
     * 旧接口只透传 sceneConfigInfo，不能新增后端字段；因此这里保存统一场景平台的
     * weather-main 纯数据 effect。仅旧 GIS 场景的保存适配器会读写它，旧本地三维场景
     * 不会因此产生天气配置。schemaVersion 用于后续兼容升级，effect 中禁止放入
     * Cesium、Three 或 DOM 等运行时实例。
     */
    weather?: {
      schemaVersion: 1
      effect: {
        id: 'weather-main'
        type: 'weather'
        params: Record<string, unknown>
      }
    }
    // 平行光配置
    directionalLight: {
      position: {
        x: number
        y: number
        z: number
      }
      intensity: number
    }
    // 相机配置
    camera: {
      position: {
        x: number
        y: number
        z: number
      }
      fov: number
      near: number
      far: number
    }
    // 场景配置
    scene: {
      background: string
    }
    controls: {
      x: number
      y: number
      z: number
    }
  }
  // 几何体配置列表
  geometryConfig: GeometryConfig[]
  // 标注配置列表
  annotationConfig: AnnotationConfig[]
  // 图片配置列表
  imageConfig: ImageConfig[]
  // 模型配置列表
  modelConfig: ModelConfig[]
  // 打点配置列表
  markingConfig: MarkingConfig[]
  // 数据集配置列表
  datasetConfig: Dataset[]
  // 公共接口配置列表
  publicRequestConfig?: PublicRequestConfig[]
  // 场景级请求全局配置
  requestGlobalConfig?: RequestGlobalConfig
  // 任务事件配置列表
  taskEventConfig?: TaskEvent[]
  // 转移主体列表
  transferMainList?: TransferMain[]
  // 小部件配置列表
  widgets: WidgetConfig[]
  // 部件视觉管理树。只记录结构面板排序和分组归属；真实部件仍保持平铺，禁止把分组解释为画布父节点。
  widgetLayerTree?: WidgetLayerNode[]
  // 管道配置列表
  pipeConfig: PipeConfig[]
}

export interface WidgetCanvasConfig {
  width: number
  height: number
}

/**
 * 部件图层树中的普通节点。
 * 这里只保存部件 id，不复制真实实例，避免图层结构与部件配置出现双写源。
 */
export interface WidgetLayerItemNode {
  id: string
  type: 'widget'
}

/**
 * 部件图层树中的分组节点。
 * children 继续只存真实部件 id，保证旧场景数据无需迁移；childGroupIds 用于表达视觉分组嵌套，
 * 被引用的子分组仍保留自己的名称、成员、显隐和锁定状态，不会在创建父组时被拆散。
 */
export interface WidgetLayerGroupNode {
  id: string
  type: 'group'
  name: string
  /** 分组自身的显隐状态；不覆盖成员各自的 visible，最终显示取两者交集。 */
  visible?: boolean
  /** 分组自身的锁定状态；不覆盖成员各自的 locked，最终锁定取两者并集。 */
  locked?: boolean
  children: string[]
  /** 直属子分组 id；省略时等价于空数组，兼容既有单层分组快照。 */
  childGroupIds?: string[]
}

/**
 * 结构面板“部件视觉管理树”的统一节点类型。
 * 顶层数组、组内 children 与 childGroupIds 递归拍平后的顺序仍对应真实渲染顺序，
 * 但视觉分组本身不创建画布 DOM 父节点。
 */
export type WidgetLayerNode = WidgetLayerItemNode | WidgetLayerGroupNode

/**
 * 分组在画布中的运行时包围框。
 * 这是纯派生结果，只服务于编辑态的整体选中与整体移动，不参与场景配置持久化。
 */
export interface WidgetGroupBounds {
  l: number
  t: number
  w: number
  h: number
}

export interface GeometryConfig {
  // 配置
  options: GeometryModel
  // 是否可拖拽
  isDrag: boolean
  // 设备ID
  deviceId: string
  // 网格数据
  meshData: MeshEditData
  // 类型
  type: DRAG_MODEL_ENUM.Geometry
  // 唯一ID
  onlyUuid: string
  // 数据集配置列表
  datasetConfigList: DataPanelConfig[]
  // 交互事件列表
  interactiveEvent: InteractionEvent[]
  // 状态列表
  statusList: InteractionEvent[]
  dataConfig?: ComponentDataConfig | null
}

export interface AnnotationConfig {
  // 配置
  options: AnnotationModel
  // 是否可拖拽
  isDrag: boolean
  // 设备ID
  deviceId: string
  // 网格数据
  meshData: MeshEditData
  type: DRAG_MODEL_ENUM.Annotation
  // 唯一ID
  onlyUuid: string
  // 数据集配置列表
  datasetConfigList: DataPanelConfig[]
  // 交互事件列表
  interactiveEvent: InteractionEvent[]
  // 状态列表
  statusList: InteractionEvent[]
  dataConfig?: ComponentDataConfig | null
}

export interface ImageConfig {
  // 配置
  options: ImageModel
  // 是否可拖拽
  isDrag: boolean
  // 设备ID
  deviceId: string
  // 网格数据
  meshData: MeshEditData
  // 类型
  type: DRAG_MODEL_ENUM.Image
  // 唯一ID
  onlyUuid: string
  // 数据集配置列表
  datasetConfigList: DataPanelConfig[]
  // 交互事件列表
  interactiveEvent: InteractionEvent[]
  // 状态列表
  statusList: InteractionEvent[]
  dataConfig?: ComponentDataConfig | null
}

export interface ModelConfig {
  options: {
    filePath: string
    fileType: MODEL_ENUM
  }
  isDrag: boolean
  deviceId: string
  meshData: MeshEditData
  type: DRAG_MODEL_ENUM.Model
  onlyUuid: string
  datasetConfigList: DataPanelConfig[]
  interactiveEvent: InteractionEvent[]
  statusList: InteractionEvent[]
  dataConfig?: ComponentDataConfig | null
}

export interface MarkingConfig {
  // 配置
  options: MarkingPanelConfig
  // 是否可拖拽
  isDrag: boolean
  // 类型
  type: DRAG_MODEL_ENUM.Marking
  // 唯一ID
  onlyUuid: string
  // 数据集配置列表
  datasetConfigList: DataPanelConfig[]
  // 交互事件列表
  interactiveEvent: InteractionEvent[]
  // 状态列表
  statusList: InteractionEvent[]
  dataConfig?: ComponentDataConfig | null
}

export interface PipePathPoint {
  x: number
  y: number
  z: number
}

export interface PipeConfig {
  // 配置
  options: PipeModel
  // 是否可拖拽
  isDrag: boolean
  // 类型
  type: DRAG_MODEL_ENUM.Pipe
  // 设备ID
  deviceId: string
  // 唯一ID
  onlyUuid: string
  // 数据集配置列表
  datasetConfigList: DataPanelConfig[]
  // 交互事件列表
  interactiveEvent: InteractionEvent[]
  // 状态列表
  statusList: InteractionEvent[]
  dataConfig?: ComponentDataConfig | null
  // 网格（管道整体）变换数据
  meshData: MeshEditData
  // 管道路径点（局部坐标）
  pathPoints: PipePathPoint[]
}
export interface MeshEditData {
  // 可见性
  visible: boolean
  // 透明度
  transparent: boolean
  // 经纬度坐标
  lngLat: LngLatAlt
  // 位置
  position: {
    x: number
    y: number
    z: number
  }
  rotation: {
    x: number
    y: number
    z: number
  }
  scale: {
    x: number
    y: number
    z: number
  }
  offset: {
    x: number
    y: number
    z: number
  }
  name?: string
}

export interface SceneAllContentsItem {
  // 名称
  name: string
  // 唯一ID
  uuid: string
  // 用户数据
  userData: Record<string, unknown>
  // 可见性
  visible: boolean
  // 子对象
  children?: SceneAllContentsItem[]
  // 唯一ID
  onlyUuid?: string
}

export interface SceneWidgetTargetItem {
  // 部件实例ID
  id: string
  // 部件显示名称
  name: string
  // 部件包类型，当前区分图表、装饰与部件
  packageName: string
  // 部件当前可见性
  visible: boolean
  // 结构面板和动作候选统一使用的类型文案
  kindLabel: '图表' | '装饰' | '部件' | '控件'
}

export interface SceneDataItemDataSource {
  // 名称
  name: string
  // 类型名称
  sourceTypeName: string
  // 类型ID
  sourceTypeId: string
  // 表名
  tableName: string
  // 数据源ID
  dataSourceId: string
}
export interface Dataset {
  // 唯一ID
  id: string
  // 名称
  name: string
  // 超时时间
  setTimeoutTime: number | null
  // 数据源列表
  dataSourceList: SceneDataItemDataSource[]
}

export interface TaskStatusColor {
  // 状态码
  stateCode: string
  // 颜色
  color: string
  // 唯一ID
  id: string
}
export interface TaskEvent {
  // 任务ID
  taskId: string
  // 任务名称
  taskName: string
  // 任务类型
  taskType: TASK_TYPE_ENUM
  // 绑定事件
  taskBindEvent: string
  // 绑定模型
  taskBindModel?: string
  // 反转角度
  taskAngle?: boolean
  // 状态颜色列表
  taskStatusColorList?: TaskStatusColor[]
  // 转移主体
  taskTransferMain?: string
  // 目标载体
  taskTransferTarget?: string
}

export type TaskEventList = TaskEvent[]

export type TransferMain = {
  // 名称路径
  namePath: string
  // 对象名称
  objectName: string
  // 唯一ID
  id: string
}
