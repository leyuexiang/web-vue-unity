import type {
  ACTION_TYPE_ENUM,
  CONDITION_RULE_TYPE_ENUM,
  DOM_SELECTOR_TYPE_ENUM,
  FIXED_VALUE_TYPE_ENUM,
  INTERACTIVE_EVENT_ENUM,
  JUDGMENT_TYPE_ENUM,
  MODEL_VALUE_TYPE_ENUM,
  OBJECT_TYPE_ENUM,
  VIEW_TYPE_ENUM,
} from '@/enums/scenePanelEnum'
import type { DatasetProperty } from './threeScene'

/**
 * 单条条件规则。
 *
 * 条件规则用于状态面板和交互面板的运行时判断，来源值与目标值都可能来自固定值、
 * 模型属性、页面地址、页面 DOM、数据集或部件运行时值，因此这里保留完整来源/目标字段。
 */
export interface ConditionItem {
  id: string
  // 源对象类型
  sourceObjectType: OBJECT_TYPE_ENUM
  // 判断类型
  judgmentType: JUDGMENT_TYPE_ENUM
  // 条件启用状态
  status: boolean
  // 来源固定值类型
  sourceFixedValueType?: FIXED_VALUE_TYPE_ENUM
  // 来源固定值
  sourceFixedValue?: string | number | boolean | object
  // 来源模型值类型
  sourceModelValueType?: MODEL_VALUE_TYPE_ENUM
  // 来源模型值
  sourceModelValue?: string
  // 来源地址参数名称
  sourceUrlParamsName?: string
  // 来源地址参数默认值
  sourceUrlParamsValue?: string
  // 来源 DOM 选择器
  sourceDomSelector?: string
  // 来源 DOM 选择器类型
  sourceDomSelectorType?: DOM_SELECTOR_TYPE_ENUM
  // 来源数据集字段
  sourceDatasetProperty?: DatasetProperty
  // 当前组件数据面板过滤结果的首行字段
  sourceComponentDataField?: string
  // 当前部件运行时值字段。当前阶段统一暴露 value，后续再按部件能力扩展更多字段。
  sourceWidgetRuntimeField?: string
  // 目标对象类型
  targetObjectType: OBJECT_TYPE_ENUM
  // 目标固定值类型
  targetFixedValueType?: FIXED_VALUE_TYPE_ENUM
  // 目标固定值
  targetFixedValue?: string | number | boolean | object
  // 目标模型值类型
  targetModelValueType?: MODEL_VALUE_TYPE_ENUM
  // 目标模型值
  targetModelValue?: string
  // 目标地址参数名称
  targetUrlParamsName?: string
  // 目标地址参数默认值
  targetUrlParamsValue?: string
  // 目标 DOM 选择器
  targetDomSelector?: string
  // 目标 DOM 选择器类型
  targetDomSelectorType?: DOM_SELECTOR_TYPE_ENUM
  // 目标数据集字段
  targetDatasetProperty?: DatasetProperty
  // 当前组件数据面板过滤结果的首行字段
  targetComponentDataField?: string
  // 当前部件运行时值字段。当前阶段统一暴露 value，后续再按部件能力扩展更多字段。
  targetWidgetRuntimeField?: string
}

/** 参数化部件动作的一组“来源字段 → 目标属性”映射。 */
export interface WidgetParameterMapping {
  /** 来源数据请求的稳定编号；旧配置未提供时沿用合并快照。 */
  sourceRequestId?: string
  /** 来源组件映射快照中的字段路径；未指定来源时读取当前触发组件。 */
  sourceField: string
  /** 传参动作保存请求编号、参数位置和键的编码值；旧复合动作仍保存属性路径。 */
  targetProperty: string
}

/** 将人工录入的常量值写入目标二维组件已配置的映射字段。 */
export interface WidgetPropertyAssignment {
  /** 目标组件数据配置中的映射路径。 */
  targetProperty: string
  /** 交互触发时写入的自定义文本；空文本也允许用于清空目标字段。 */
  value: string
}

/**
 * 条件命中后的动作配置。
 *
 * 同一动作结构同时服务模型和部件，因此模型字段与部件字段都保留为可选项，
 * 由动作类型决定最终读取哪些字段。
 */
export interface ActionItem {
  id: string
  // 动作类型
  actionType: ACTION_TYPE_ENUM
  /** 统一传参动作的目标类别，不参与目标显隐。 */
  parameterTargetKind?: 'model' | 'widget' | 'three-dimensional-component'
  /** 传参来源对象；省略时读取当前触发组件，指定后按稳定编号读取，缺失时不回退。 */
  parameterSource?: {
    kind: 'widget' | 'object'
    id: string
    /** 对象来源的产品分类，保证先选择类型、尚未选对象时仍能稳定回显。 */
    category?: 'model' | 'three-dimensional-component'
  }
  // 模型动作目标
  actionTargetUuid?: string
  // 部件动作目标 ID 列表
  actionTargetWidgetIds?: string[]
  // 部件视觉分组动作目标 ID 列表；分组显隐不展开为成员部件
  actionTargetWidgetGroupIds?: string[]
  // 高亮颜色
  highlightColor?: string
  // 高亮开关
  highlightStatus?: boolean
  // 过渡时间
  transitionTime?: number
  // 平滑程度
  smoothFactor?: number
  // 跳转链接
  jumpLink?: string
  // 是否新窗口打开
  newWindow?: boolean
  // 场景地址
  sceneUrl?: string
  // 视图类型
  viewType?: VIEW_TYPE_ENUM
  // 模型可见性
  modelVisibility?: boolean
  // 模型及三维组件的来源字段 → 动态请求参数映射（旧动作兼容属性路径）
  modelParameterMappings?: WidgetParameterMapping[]
  // 部件可见性
  widgetVisibility?: boolean
  // 二维组件的来源字段 → 动态请求参数映射（旧动作兼容属性路径）
  widgetParameterMappings?: WidgetParameterMapping[]
  /** 自定义内容到目标二维组件映射字段的赋值列表。 */
  widgetPropertyAssignments?: WidgetPropertyAssignment[]
  // 旧版单参数字段，保留用于兼容历史场景
  widgetTargetProperty?: string
  widgetValueSourceField?: string
  // 观察目标
  observationTargetUuid?: string
}

/**
 * 条件块。
 *
 * 一个条件块包含一组条件和一组动作，条件规则类型用于决定条件之间按“全部满足”
 * 还是“任一满足”进行计算。
 */
export interface ConditionBlokList {
  id: string
  // 条件块内规则组合类型
  conditionRuleType: CONDITION_RULE_TYPE_ENUM | null
  // 条件列表
  conditionList: ConditionItem[]
  // 动作列表
  actionList: ActionItem[]
}

/**
 * 条件组。
 *
 * 条件组是抽屉页签的持久化结构，名称用于右侧面板展示，块列表用于运行时求值。
 */
export interface ConditionGroup {
  id: string
  // 条件组名称
  conditionGroupName: string
  // 条件块列表
  conditionBlokList: ConditionBlokList[]
}

/**
 * 交互事件或状态配置。
 *
 * 状态面板与交互面板共用这份结构：状态只保存 statusName，交互事件保存 eventName
 * 与 eventType，运行时统一消费 conditionGroupList。
 */
export interface InteractionEvent {
  id: string
  // 事件类型
  eventType?: INTERACTIVE_EVENT_ENUM
  // 事件名称
  eventName?: string
  // 状态名称
  statusName?: string
  // 条件组列表
  conditionGroupList?: ConditionGroup[]
  // 是否开启
  isOpen: boolean
}
