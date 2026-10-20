import type { FIXED_VALUE_TYPE_ENUM, OBJECT_TYPE_ENUM } from "@/enums/scenePanelEnum"
import type { DatasetProperty } from "./threeScene"

export type ConditionSide = 'source' | 'target'


export type ConditionSideValue = {
  objectType: OBJECT_TYPE_ENUM
  /**
   * 统一承接规则运行时最终参与比较的值。
   * 这里既可能是固定值、模型属性值，也可能是部件当前运行时值。
   */
  value: unknown
  fixedValueType?: FIXED_VALUE_TYPE_ENUM
  datasetProperty?: DatasetProperty
}
