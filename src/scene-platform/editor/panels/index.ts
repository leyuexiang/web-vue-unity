/**
 * 编辑器面板平台协议。
 *
 * 这一层只描述二维画布部件面板需要的最小能力和目标形态：
 * - 不导入 Vue、Pinia、Three、Cesium；
 * - 不感知当前项目的 BaseWidgetConfig、WidgetCommand 或旧渲染模块；
 * - 后续替换三维底层架构时，可以继续复用这份协议和二维面板组件。
 */

export type WidgetPanelKind = 'base' | 'animation' | 'data' | 'status' | 'interaction'

export type WidgetPanelSelectionKind = 'none' | 'widget' | 'widgetChild' | 'widgetGroup' | 'multiWidget'

export interface WidgetPanelCapabilities {
  /**
   * 基础配置能力。
   * 对应名称、显隐、位置、尺寸和组件自有配置。
   */
  base: boolean
  /**
   * 公共动画能力。
   * 是否可展示动画页签只由二维部件包声明决定，不依赖三维运行时。
   */
  animation: boolean
  /**
   * 数据配置能力。
   * 对应 component.dataConfig 的独立读写链路。
   */
  data: boolean
  /**
   * 状态配置能力。
   * 对应 component.statusList 的独立读写链路。
   */
  status: boolean
  /**
   * 交互配置能力。
   * 对应 component.interactiveEvent 的独立读写链路。
   */
  interaction: boolean
}

export interface WidgetPanelTarget<TWidget = unknown> {
  kind: 'widget'
  id: string
  widget: TWidget
  capabilities: WidgetPanelCapabilities
  /** 组件自身锁定、父组继承锁定及最终有效锁定，供所有属性页共享只读判断。 */
  ownLocked: boolean
  inheritedLocked: boolean
  effectiveLocked: boolean
}

export interface WidgetGroupPanelTarget {
  kind: 'widgetGroup'
  id: string
  widgetIds: string[]
  effectiveLocked: boolean
}

export interface WidgetChildPanelTarget<TWidget = unknown> {
  kind: 'widgetChild'
  frameId: string
  childId: string
  widget: TWidget
  effectiveLocked: boolean
}

export interface MultiWidgetPanelTarget {
  kind: 'multiWidget'
  ids: string[]
  effectiveLocked: boolean
}

export interface EmptyWidgetPanelTarget {
  kind: 'none'
}

export type WidgetPanelSelection<TWidget = unknown> =
  | EmptyWidgetPanelTarget
  | WidgetPanelTarget<TWidget>
  | WidgetChildPanelTarget<TWidget>
  | WidgetGroupPanelTarget
  | MultiWidgetPanelTarget

export interface WidgetPanelReadWriteAdapter<
  TWidget = unknown,
  TDataConfig = unknown,
  TEvent = unknown,
> {
  /**
   * 读取当前二维面板选中目标。
   * 适配层负责把具体项目里的选中态翻译成平台协议。
   */
  getSelection: () => WidgetPanelSelection<TWidget>
  /**
   * 按实例 ID 读取二维部件目标。
   */
  getTargetById: (id: string) => WidgetPanelTarget<TWidget> | null
  /**
   * 读取指定二维部件可展示的面板能力。
   */
  getCapabilities: (widget: TWidget | null | undefined) => WidgetPanelCapabilities
  /**
   * 读取或写回二维数据配置。
   */
  getDataConfig?: (id: string) => TDataConfig | null
  setDataConfig?: (id: string, dataConfig: TDataConfig | null) => void
  /**
   * 读取或写回二维状态与交互配置。
   */
  getStatusList?: (id: string) => TEvent[]
  setStatusList?: (id: string, statusList: TEvent[]) => void
  getInteractiveEventList?: (id: string) => TEvent[]
  setInteractiveEventList?: (id: string, interactiveEventList: TEvent[]) => void
}
