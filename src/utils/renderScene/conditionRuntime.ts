import { get, isEqual } from 'lodash-es'
import type * as THREE from '@/types/legacyObjectPort'
import { CONDITION_SIDE_FIELD_MAP, type ConditionSideFieldConfig } from '@/config/event'
import {
  DOM_SELECTOR_TYPE_ENUM,
  FIXED_VALUE_TYPE_ENUM,
  JUDGMENT_TYPE_ENUM,
  MODEL_VALUE_TYPE_ENUM,
  OBJECT_TYPE_ENUM,
  CONDITION_RULE_TYPE_ENUM,
} from '@/enums/scenePanelEnum'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import type { SceneObject, SceneStore } from '@/scene-platform'
import type {
  ConditionItem,
  ConditionBlokList,
  DataPanelConfig,
  DatasetProperty,
} from '@/types/threeScene'
import type { ConditionSide, ConditionSideValue } from '@/types/event'
import type { ComponentDataConfig } from '@/types/data-config'
import {
  normalizeDataConfig,
  resolveComponentMappedDataRow,
  upgradeLegacyDataPanelConfigList,
} from '@/utils/dataConfig'
import { getSceneRuntimeBridge } from './sceneRuntimeBridge'
import { appLogger } from '@/utils/logger'
import { getWidgetRuntimeValueById } from '@/integrations/scene/widgetRuntime'
import {
  getRecordPaginationSelection,
  projectRecordPaginationSelection,
} from '@/utils/dataConfig/recordPaginationSelection'
import { findSceneObjectByTargetId } from './sceneObjectTargetResolver'

const sceneRuntime = getSceneRuntimeBridge()

export type WidgetConditionRuntimeContext = {
  kind: 'widget'
  widgetId: string
  widget: BaseWidgetConfig
}

/** 三维平台对象用领域快照求值，避免 Unity 规则再查询不存在的旧 Three 场景。 */
export type SceneObjectConditionRuntimeContext = {
  kind: 'sceneObject'
  sceneObject: SceneObject
  store: Pick<SceneStore, 'getObject'>
}

export type ConditionRuntimeContext =
  | THREE.Object3D
  | WidgetConditionRuntimeContext
  | SceneObjectConditionRuntimeContext

const isWidgetRuntimeContext = (
  context: ConditionRuntimeContext,
): context is WidgetConditionRuntimeContext =>
  typeof context === 'object' && context !== null && 'kind' in context && context.kind === 'widget'

const isSceneObjectRuntimeContext = (
  context: ConditionRuntimeContext,
): context is SceneObjectConditionRuntimeContext =>
  typeof context === 'object' && context !== null && 'kind' in context && context.kind === 'sceneObject'

/**
 * 统一执行条件块判断。
 * 状态模块与交互模块都走这一份逻辑，避免两边各自维护一套条件解析后再次分叉。
 */
export const evaluateConditionBlock = (
  conditionBlock: ConditionBlokList,
  contextObject: ConditionRuntimeContext,
): boolean => {
  const { conditionRuleType, conditionList } = conditionBlock

  if (!conditionList || conditionList.length === 0) {
    return true
  }

  if (conditionRuleType === CONDITION_RULE_TYPE_ENUM.All) {
    return conditionList.every((condition) => evaluateCondition(condition, contextObject))
  }

  if (conditionRuleType === CONDITION_RULE_TYPE_ENUM.One) {
    return conditionList.some((condition) => evaluateCondition(condition, contextObject))
  }

  return true
}

/**
 * 统一执行单条条件判断。
 * 这里新增了“当前组件数据”取值链，直接读取当前组件数据面板里已经过滤完成的结果，
 * 不额外再发请求，也不会绕过现有提取路径与过滤器。
 */
export const evaluateCondition = (
  condition: ConditionItem,
  contextObject: ConditionRuntimeContext,
): boolean => {
  if (!condition.status) {
    return false
  }

  const sourceValue = resolveConditionValue(condition, 'source', contextObject)
  const targetValue = resolveConditionValue(condition, 'target', contextObject)
  if (!sourceValue || !targetValue) {
    return false
  }

  if (
    sourceValue.objectType === OBJECT_TYPE_ENUM.FixedValue &&
    targetValue.objectType === OBJECT_TYPE_ENUM.FixedValue &&
    sourceValue.fixedValueType !== targetValue.fixedValueType
  ) {
    return false
  }

  if (
    sourceValue.objectType === OBJECT_TYPE_ENUM.DatasetValue &&
    targetValue.objectType === OBJECT_TYPE_ENUM.DatasetValue &&
    !areDatasetPropertiesEqual(sourceValue.datasetProperty, targetValue.datasetProperty)
  ) {
    return false
  }

  return compareValues(sourceValue.value, targetValue.value, condition.judgmentType)
}

const resolveConditionValue = (
  condition: ConditionItem,
  side: ConditionSide,
  contextObject: ConditionRuntimeContext,
): ConditionSideValue | null => {
  const fieldConfig = CONDITION_SIDE_FIELD_MAP[side]
  const objectType = condition[fieldConfig.objectTypeKey] as OBJECT_TYPE_ENUM | undefined
  if (!objectType) return null

  switch (objectType) {
    case OBJECT_TYPE_ENUM.FixedValue:
      return resolveFixedValue(condition, fieldConfig)
    case OBJECT_TYPE_ENUM.ModelValue:
      return resolveModelValue(condition, fieldConfig, contextObject)
    case OBJECT_TYPE_ENUM.UrlParamValue:
      return resolveUrlParamValue(condition, fieldConfig)
    case OBJECT_TYPE_ENUM.DomValue:
      return resolveDomValue(condition, fieldConfig)
    case OBJECT_TYPE_ENUM.DatasetValue:
      return resolveDatasetValue(condition, fieldConfig)
    case OBJECT_TYPE_ENUM.ComponentDataValue:
      return resolveComponentDataValue(condition, fieldConfig, contextObject)
    case OBJECT_TYPE_ENUM.WidgetRuntimeValue:
      return resolveWidgetRuntimeValue(condition, fieldConfig, contextObject)
    default:
      return null
  }
}

const resolveFixedValue = (
  condition: ConditionItem,
  fieldConfig: ConditionSideFieldConfig,
): ConditionSideValue | null => {
  const fixedValueType = condition[fieldConfig.fixedValueTypeKey] as
    | FIXED_VALUE_TYPE_ENUM
    | undefined
  if (!fixedValueType) return null

  const rawValue = condition[fieldConfig.fixedValueKey]
  const textValue = condition[fieldConfig.textKey]
  let value: unknown

  switch (fixedValueType) {
    case FIXED_VALUE_TYPE_ENUM.String:
      value = typeof textValue === 'string' ? textValue : ''
      break
    case FIXED_VALUE_TYPE_ENUM.Number: {
      const parsedValue =
        typeof rawValue === 'number'
          ? rawValue
          : typeof rawValue === 'string'
            ? Number(rawValue)
            : Number.NaN
      if (Number.isNaN(parsedValue)) {
        return null
      }
      value = parsedValue
      break
    }
    case FIXED_VALUE_TYPE_ENUM.Boolean:
      value = typeof rawValue === 'boolean' ? rawValue : Boolean(rawValue)
      break
    case FIXED_VALUE_TYPE_ENUM.JSON:
      value = safeParseJson(rawValue)
      break
    default:
      return null
  }

  return {
    objectType: OBJECT_TYPE_ENUM.FixedValue,
    value,
    fixedValueType,
  }
}

const resolveModelValue = (
  condition: ConditionItem,
  fieldConfig: ConditionSideFieldConfig,
  contextObject: ConditionRuntimeContext,
): ConditionSideValue | null => {
  const targetOnlyUuid = condition[fieldConfig.modelValueKey] as string | undefined
  const modelValueType = condition[fieldConfig.modelValueTypeKey] as
    | MODEL_VALUE_TYPE_ENUM
    | undefined
  if (!targetOnlyUuid || !modelValueType) return null

  if (isSceneObjectRuntimeContext(contextObject)) {
    const targetObject =
      targetOnlyUuid === contextObject.sceneObject.id
        ? contextObject.sceneObject
        : contextObject.store.getObject(targetOnlyUuid)
    if (!targetObject) return null
    const value = resolveSceneObjectModelValue(targetObject, modelValueType)
    return value === undefined ? null : { objectType: OBJECT_TYPE_ENUM.ModelValue, value }
  }

  const targetObject = getTargetObjectByUuid(targetOnlyUuid)
  if (!targetObject) return null
  let value: unknown
  switch (modelValueType) {
    case MODEL_VALUE_TYPE_ENUM.Visibility:
      value = targetObject.visible
      break
    case MODEL_VALUE_TYPE_ENUM.Position:
      value = vectorToPlain(targetObject.position)
      break
    case MODEL_VALUE_TYPE_ENUM.Rotation:
      value = vectorToPlain(targetObject.rotation)
      break
    case MODEL_VALUE_TYPE_ENUM.Scale:
      value = vectorToPlain(targetObject.scale)
      break
    default:
      return null
  }

  return {
    objectType: OBJECT_TYPE_ENUM.ModelValue,
    value,
  }
}

const resolveUrlParamValue = (
  condition: ConditionItem,
  fieldConfig: ConditionSideFieldConfig,
): ConditionSideValue | null => {
  const paramName = (condition[fieldConfig.textKey] as string | undefined)?.trim()
  if (!paramName) return null

  const urlValue = getUrlParamValue(paramName)
  const fallbackValue = condition[fieldConfig.urlFallbackKey]
  const value = urlValue ?? (typeof fallbackValue === 'string' ? fallbackValue : '')

  return {
    objectType: OBJECT_TYPE_ENUM.UrlParamValue,
    value,
  }
}

const resolveDomValue = (
  condition: ConditionItem,
  fieldConfig: ConditionSideFieldConfig,
): ConditionSideValue | null => {
  const selector = (condition[fieldConfig.domSelectorKey] as string | undefined)?.trim()
  const selectorType = condition[fieldConfig.domSelectorTypeKey] as
    | DOM_SELECTOR_TYPE_ENUM
    | undefined
  if (!selector || !selectorType) return null

  const value = getDomValue(selector, selectorType)
  if (value === undefined) {
    return null
  }

  return {
    objectType: OBJECT_TYPE_ENUM.DomValue,
    value,
  }
}

const resolveDatasetValue = (
  condition: ConditionItem,
  fieldConfig: ConditionSideFieldConfig,
): ConditionSideValue | null => {
  const datasetProperty = condition[fieldConfig.datasetPropertyKey] as DatasetProperty | undefined
  if (!datasetProperty) {
    return null
  }

  return {
    objectType: OBJECT_TYPE_ENUM.DatasetValue,
    value: buildDatasetPropertyKey(datasetProperty),
    datasetProperty,
  }
}

/**
 * 当前组件数据值规则读取“过滤结果首行经过属性映射后的组件字段”。
 * 解析器会同时保留原始字段以兼容既有规则，并追加图表人工映射目标字段，因此数据面板
 * 新增的 `data3 ← data1` 可在这里按 `data3` 取到真实值。后续若支持聚合或指定行，
 * 仍只需扩展共享解析入口，避免规则下拉框和运行时判断再次分叉。
 */
const resolveComponentDataValue = (
  condition: ConditionItem,
  fieldConfig: ConditionSideFieldConfig,
  contextObject: ConditionRuntimeContext,
): ConditionSideValue | null => {
  const fieldPath = (condition[fieldConfig.componentDataFieldKey] as string | undefined)?.trim()
  if (!fieldPath) {
    return null
  }

  const dataConfig = getComponentDataConfig(contextObject)
  // 翻页组件的条件与传参必须读取同一条当前记录，普通组件仍读取原首行。
  const selection = isWidgetRuntimeContext(contextObject)
    ? getRecordPaginationSelection(contextObject.widget, contextObject.widgetId)
    : undefined
  const mappedRow = resolveComponentMappedDataRow(
    dataConfig && selection ? projectRecordPaginationSelection(dataConfig, selection) : dataConfig,
  )
  if (!mappedRow) {
    return null
  }

  const value = get(mappedRow, fieldPath)
  if (value === undefined) {
    // 条件字段缺失时返回不匹配，避免异常中断整组状态或交互规则。
    appLogger.warn('ConditionRuntime', '当前组件数据中不存在字段', fieldPath)
    return null
  }

  return {
    objectType: OBJECT_TYPE_ENUM.ComponentDataValue,
    value,
  }
}

/**
 * 当前部件值从运行时注册表读取，而不是从配置项读取。
 * 这样标签选择器、输入框、倒计时等部件的实时变化才能立刻参与规则判断。
 */
const resolveWidgetRuntimeValue = (
  condition: ConditionItem,
  fieldConfig: ConditionSideFieldConfig,
  contextObject: ConditionRuntimeContext,
): ConditionSideValue | null => {
  const field = (condition[fieldConfig.widgetRuntimeFieldKey] as string | undefined)?.trim()
  if (!field || !isWidgetRuntimeContext(contextObject)) {
    return null
  }

  /**
   * 二维运行时值通过当前项目适配层读取，不再从三维 sceneRuntimeBridge 访问二维值表。
   * 后续统一 SceneRuntime 落地时，只替换适配层即可。
   */
  const runtimeValue = getWidgetRuntimeValueById(contextObject.widgetId, field)
  if (runtimeValue === undefined) {
    return null
  }

  return {
    objectType: OBJECT_TYPE_ENUM.WidgetRuntimeValue,
    value: runtimeValue,
  }
}

const getComponentDataConfig = (
  contextObject: ConditionRuntimeContext,
): ComponentDataConfig | null => {
  if (isWidgetRuntimeContext(contextObject)) {
    return normalizeDataConfig(contextObject.widget.dataConfig || null)
  }

  if (isSceneObjectRuntimeContext(contextObject)) {
    const metadata = contextObject.sceneObject.metadata ?? {}
    const existing = (metadata.dataConfig as ComponentDataConfig | undefined) || null
    const upgraded =
      existing ||
      upgradeLegacyDataPanelConfigList(
        metadata.datasetConfigList as DataPanelConfig[] | undefined,
        metadata.type as string | undefined,
      )
    return normalizeDataConfig(upgraded)
  }

  const existing = (contextObject.userData?.dataConfig as ComponentDataConfig | undefined) || null
  const upgraded =
    existing ||
    upgradeLegacyDataPanelConfigList(
      contextObject.userData?.datasetConfigList as DataPanelConfig[] | undefined,
      contextObject.userData?.type as string | undefined,
    )

  return normalizeDataConfig(upgraded)
}

/** 将领域模型属性转为规则比较使用的稳定三轴快照。 */
const resolveSceneObjectModelValue = (
  object: SceneObject,
  valueType: MODEL_VALUE_TYPE_ENUM,
) => {
  const transform = object.transform
  switch (valueType) {
    case MODEL_VALUE_TYPE_ENUM.Visibility:
      return object.visible
    case MODEL_VALUE_TYPE_ENUM.Position:
      return transform.kind === 'geo'
        ? { x: transform.longitude, y: transform.latitude, z: transform.height }
        : vectorToPlain({ x: transform.position[0], y: transform.position[1], z: transform.position[2] })
    case MODEL_VALUE_TYPE_ENUM.Rotation:
      return transform.kind === 'geo'
        ? { x: transform.heading, y: transform.pitch, z: transform.roll }
        : vectorToPlain({ x: transform.rotation[0], y: transform.rotation[1], z: transform.rotation[2] })
    case MODEL_VALUE_TYPE_ENUM.Scale: {
      const scale = transform.scale
      const vector = typeof scale === 'number' ? [scale, scale, scale] : scale
      return vectorToPlain({ x: vector[0], y: vector[1], z: vector[2] })
    }
    default:
      return undefined
  }
}

const compareValues = (
  sourceValue: unknown,
  targetValue: unknown,
  judgmentType: JUDGMENT_TYPE_ENUM,
): boolean => {
  if (sourceValue === undefined || targetValue === undefined) {
    return false
  }

  const numericSource = toNumber(sourceValue)
  const numericTarget = toNumber(targetValue)
  const bothNumeric = numericSource !== null && numericTarget !== null

  if (bothNumeric) {
    switch (judgmentType) {
      case JUDGMENT_TYPE_ENUM.Equal:
        return numericSource === numericTarget
      case JUDGMENT_TYPE_ENUM.NotEqual:
        return numericSource !== numericTarget
      case JUDGMENT_TYPE_ENUM.GreaterThan:
        return numericSource > numericTarget
      case JUDGMENT_TYPE_ENUM.LessThan:
        return numericSource < numericTarget
      case JUDGMENT_TYPE_ENUM.GreaterThanOrEqual:
        return numericSource >= numericTarget
      case JUDGMENT_TYPE_ENUM.LessThanOrEqual:
        return numericSource <= numericTarget
      default:
        return false
    }
  }

  if (typeof sourceValue === 'boolean' && typeof targetValue === 'boolean') {
    switch (judgmentType) {
      case JUDGMENT_TYPE_ENUM.Equal:
        return sourceValue === targetValue
      case JUDGMENT_TYPE_ENUM.NotEqual:
        return sourceValue !== targetValue
      default:
        return false
    }
  }

  if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
    switch (judgmentType) {
      case JUDGMENT_TYPE_ENUM.Equal:
        return sourceValue === targetValue
      case JUDGMENT_TYPE_ENUM.NotEqual:
        return sourceValue !== targetValue
      default:
        return false
    }
  }

  if (isComparableObject(sourceValue) && isComparableObject(targetValue)) {
    switch (judgmentType) {
      case JUDGMENT_TYPE_ENUM.Equal:
        return isEqual(sourceValue, targetValue)
      case JUDGMENT_TYPE_ENUM.NotEqual:
        return !isEqual(sourceValue, targetValue)
      default:
        return false
    }
  }

  return false
}

const areDatasetPropertiesEqual = (source?: DatasetProperty, target?: DatasetProperty): boolean => {
  if (!source || !target) return false
  return isEqual(source, target)
}

const vectorToPlain = (vector: { x: number; y: number; z: number }) => ({
  x: Number(vector.x.toFixed(6)),
  y: Number(vector.y.toFixed(6)),
  z: Number(vector.z.toFixed(6)),
})

const safeParseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value ?? null
  }
  if (!value.trim()) {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const isComparableObject = (value: unknown): value is Record<string, unknown> | unknown[] =>
  typeof value === 'object' && value !== null

const buildDatasetPropertyKey = (datasetProperty: DatasetProperty): string => {
  const { datasetName, tableName, bindProperty, dataSourceId } = datasetProperty
  return [datasetName, tableName, bindProperty, dataSourceId].filter(Boolean).join(':')
}

/**
 * 条件规则中的“模型值”与动作目标使用同一套目标标识兼容规则。
 *
 * 状态/交互配置在刷新重开后可能带着 `uuid` 或旧 `onlyUuid`，这里不再只识别
 * `onlyUuid`，避免条件判断先失败导致后续动作完全不触发。
 */
const getTargetObjectByUuid = (uuid: string): THREE.Object3D | null =>
  findSceneObjectByTargetId(sceneRuntime.scene, uuid)

const getUrlParamValue = (paramName: string): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const params = new URLSearchParams(window.location.search)
  return params.get(paramName)
}

const getDomValue = (
  selector: string,
  selectorType: DOM_SELECTOR_TYPE_ENUM,
): string | boolean | null | undefined => {
  if (typeof document === 'undefined') {
    return undefined
  }

  const element = document.querySelector(selector)
  if (!element) {
    return undefined
  }

  switch (selectorType) {
    case DOM_SELECTOR_TYPE_ENUM.TextContent:
      return element.textContent?.trim() ?? ''
    case DOM_SELECTOR_TYPE_ENUM.InputValue:
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element.value
      }
      return element.textContent ?? ''
    case DOM_SELECTOR_TYPE_ENUM.IsChecked:
      if ('checked' in element) {
        return Boolean((element as HTMLInputElement).checked)
      }
      return false
    case DOM_SELECTOR_TYPE_ENUM.IsSelected:
      if ('selected' in element) {
        return Boolean((element as HTMLOptionElement).selected)
      }
      return element.getAttribute('aria-selected') === 'true'
    case DOM_SELECTOR_TYPE_ENUM.HTML:
      return element.innerHTML
    default:
      return undefined
  }
}
