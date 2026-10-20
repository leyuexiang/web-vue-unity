import { FIXED_VALUE_TYPE_ENUM, OBJECT_TYPE_ENUM } from '@/enums/scenePanelEnum'
import type { ConditionItem, ActionItem } from '@/types/threeScene'
import type { FixedValueLocation } from './type'

/**
 * 获取动作属性路径
 * @param groupIndex 条件组索引
 * @param blockIndex 条件块索引
 * @param actionIndex 动作索引
 * @param field 动作属性
 * @returns 动作属性路径
 */
export const getActionProp = (
  groupIndex: number,
  blockIndex: number,
  actionIndex: number,
  field: keyof Pick<
    ActionItem,
    | 'actionType'
    | 'actionTargetUuid'
    | 'actionTargetWidgetIds'
    | 'highlightColor'
    | 'highlightStatus'
    | 'observationTargetUuid'
    | 'transitionTime'
    | 'smoothFactor'
    | 'jumpLink'
    | 'newWindow'
    | 'sceneUrl'
    | 'modelVisibility'
    | 'widgetVisibility'
    | 'widgetTargetProperty'
    | 'widgetValueSourceField'
    | 'viewType'
  >,
) =>
  `conditionGroupList.${groupIndex}.conditionBlokList.${blockIndex}.actionList.${actionIndex}.${field}`

/**
 * 获取参数映射行的表单属性路径。
 * 参数映射属于动作内部的数组，单独生成路径可以让 Element Plus 对每一行独立校验。
 */
export const getWidgetParameterProp = (
  groupIndex: number,
  blockIndex: number,
  actionIndex: number,
  mappingIndex: number,
  field: 'sourceField' | 'targetProperty',
) =>
  [
    'conditionGroupList',
    groupIndex,
    'conditionBlokList',
    blockIndex,
    'actionList',
    actionIndex,
    'widgetParameterMappings',
    mappingIndex,
    field,
  ].join('.')

/** 获取自定义赋值映射行的表单路径，便于每个目标字段独立提示必填错误。 */
export const getWidgetPropertyAssignmentProp = (
  groupIndex: number,
  blockIndex: number,
  actionIndex: number,
  assignmentIndex: number,
) =>
  [
    'conditionGroupList',
    groupIndex,
    'conditionBlokList',
    blockIndex,
    'actionList',
    actionIndex,
    'widgetPropertyAssignments',
    assignmentIndex,
    'targetProperty',
  ].join('.')

/** 获取参数化模型动作的映射行表单属性路径。 */
export const getModelParameterProp = (
  groupIndex: number,
  blockIndex: number,
  actionIndex: number,
  mappingIndex: number,
  field: 'sourceField' | 'targetProperty',
) =>
  [
    'conditionGroupList',
    groupIndex,
    'conditionBlokList',
    blockIndex,
    'actionList',
    actionIndex,
    'modelParameterMappings',
    mappingIndex,
    field,
  ].join('.')

const locationFieldMap: Record<
  FixedValueLocation,
  {
    objectTypeKey: 'sourceObjectType' | 'targetObjectType'
    fixedValueTypeKey: 'sourceFixedValueType' | 'targetFixedValueType'
    fixedValueKey: 'sourceFixedValue' | 'targetFixedValue'
    textKey: 'sourceUrlParamsName' | 'targetUrlParamsName'
    modelValueKey: 'sourceModelValue' | 'targetModelValue'
    modelValueTypeKey: 'sourceModelValueType' | 'targetModelValueType'
    domSelectorKey: 'sourceDomSelector' | 'targetDomSelector'
    domSelectorTypeKey: 'sourceDomSelectorType' | 'targetDomSelectorType'
    datasetPropertyKey: 'sourceDatasetProperty' | 'targetDatasetProperty'
    componentDataFieldKey: 'sourceComponentDataField' | 'targetComponentDataField'
    widgetRuntimeFieldKey: 'sourceWidgetRuntimeField' | 'targetWidgetRuntimeField'
  }
> = {
  source: {
    objectTypeKey: 'sourceObjectType',
    fixedValueTypeKey: 'sourceFixedValueType',
    fixedValueKey: 'sourceFixedValue',
    textKey: 'sourceUrlParamsName',
    modelValueKey: 'sourceModelValue',
    modelValueTypeKey: 'sourceModelValueType',
    domSelectorKey: 'sourceDomSelector',
    domSelectorTypeKey: 'sourceDomSelectorType',
    datasetPropertyKey: 'sourceDatasetProperty',
    componentDataFieldKey: 'sourceComponentDataField',
    widgetRuntimeFieldKey: 'sourceWidgetRuntimeField',
  },
  target: {
    objectTypeKey: 'targetObjectType',
    fixedValueTypeKey: 'targetFixedValueType',
    fixedValueKey: 'targetFixedValue',
    textKey: 'targetUrlParamsName',
    modelValueKey: 'targetModelValue',
    modelValueTypeKey: 'targetModelValueType',
    domSelectorKey: 'targetDomSelector',
    domSelectorTypeKey: 'targetDomSelectorType',
    datasetPropertyKey: 'targetDatasetProperty',
    componentDataFieldKey: 'targetComponentDataField',
    widgetRuntimeFieldKey: 'targetWidgetRuntimeField',
  },
}

/**
 * 判断字符串是否填写
 * @param value 字符串
 * @returns 是否填写
 */
const isFilledString = (value?: string | null) =>
  typeof value === 'string' && value.trim().length > 0

/**
 * 判断数据集属性是否填写
 * @param property 数据集属性
 * @returns 是否填写
 */
const isDatasetPropertyFilled = (
  property: ConditionItem['sourceDatasetProperty'] | ConditionItem['targetDatasetProperty'],
) =>
  Boolean(
    property &&
      property.datasetName &&
      property.bindProperty &&
      property.databaseName &&
      property.tableName &&
      property.dataSourceId,
  )

/**
 * 判断固定值是否填写
 * @param row 条件项
 * @param location 固定值位置
 * @returns 是否填写
 */
const isFixedValueFilled = (row: ConditionItem, location: FixedValueLocation) => {
  const { fixedValueTypeKey, fixedValueKey, textKey } = locationFieldMap[location]
  const type = row[fixedValueTypeKey]
  if (!type) return false
  const value = row[fixedValueKey]
  const textValue = row[textKey]
  switch (type) {
    case FIXED_VALUE_TYPE_ENUM.String:
      return isFilledString(textValue)
    case FIXED_VALUE_TYPE_ENUM.Number:
      return typeof value === 'number' && !Number.isNaN(value)
    case FIXED_VALUE_TYPE_ENUM.Boolean:
      return typeof value === 'boolean'
    case FIXED_VALUE_TYPE_ENUM.JSON:
      return isFilledString(value as string | undefined)
    default:
      return false
  }
}

const isModelValueFilled = (row: ConditionItem, location: FixedValueLocation) => {
  const { modelValueKey, modelValueTypeKey } = locationFieldMap[location]
  return isFilledString(row[modelValueKey]) && Boolean(row[modelValueTypeKey])
}

const isUrlParamFilled = (row: ConditionItem, location: FixedValueLocation) => {
  const { textKey } = locationFieldMap[location]
  return isFilledString(row[textKey])
}

const isDomValueFilled = (row: ConditionItem, location: FixedValueLocation) => {
  const { domSelectorKey, domSelectorTypeKey } = locationFieldMap[location]
  return isFilledString(row[domSelectorKey]) && row[domSelectorTypeKey] !== undefined
}

const isDatasetValueFilled = (row: ConditionItem, location: FixedValueLocation) => {
  const { datasetPropertyKey } = locationFieldMap[location]
  return isDatasetPropertyFilled(row[datasetPropertyKey])
}

/**
 * 判断当前组件数据字段是否填写。
 * 这里取的是数据面板里已经经过提取路径与过滤器处理后的首行字段名，
 * 条件运行时会再用这个字段名去读取当前组件最新的数据结果。
 */
const isComponentDataValueFilled = (row: ConditionItem, location: FixedValueLocation) => {
  const { componentDataFieldKey } = locationFieldMap[location]
  return isFilledString(row[componentDataFieldKey])
}

/**
 * 当前部件值当前阶段只允许选择一个明确字段 value。
 * 这里只校验字段名是否已被选择，不直接校验运行时是否已有值，
 * 因为预览前部件可能尚未产生交互，但配置本身依旧是完整的。
 */
const isWidgetRuntimeValueFilled = (row: ConditionItem, location: FixedValueLocation) => {
  const { widgetRuntimeFieldKey } = locationFieldMap[location]
  return isFilledString(row[widgetRuntimeFieldKey])
}

/**
 * 判断条件项是否填写
 * @param row 条件项
 * @param location 固定值位置
 * @returns 是否填写
 */

export const isConditionSideCompleted = (row: ConditionItem, location: FixedValueLocation) => {
  const { objectTypeKey } = locationFieldMap[location]
  const objectType = row[objectTypeKey]
  switch (objectType) {
    case OBJECT_TYPE_ENUM.FixedValue:
      return isFixedValueFilled(row, location)
    case OBJECT_TYPE_ENUM.ModelValue:
      return isModelValueFilled(row, location)
    case OBJECT_TYPE_ENUM.UrlParamValue:
      return isUrlParamFilled(row, location)
    case OBJECT_TYPE_ENUM.DomValue:
      return isDomValueFilled(row, location)
    case OBJECT_TYPE_ENUM.DatasetValue:
      return isDatasetValueFilled(row, location)
    case OBJECT_TYPE_ENUM.ComponentDataValue:
      return isComponentDataValueFilled(row, location)
    case OBJECT_TYPE_ENUM.WidgetRuntimeValue:
      return isWidgetRuntimeValueFilled(row, location)
    default:
      return false
  }
}

/**
 * 判断条件项是否完成
 * @param row 条件项
 * @returns 是否完成
 */
export const isConditionItemCompleted = (row: ConditionItem) =>
  isConditionSideCompleted(row, 'source') && isConditionSideCompleted(row, 'target')
