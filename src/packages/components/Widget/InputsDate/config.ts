import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VInputsDateInfo = {
  name: '时间选择器',
  keyName: 'VInputsDate',
  packageName: 'Widget',
  icon: new URL(`../assets/images/inputs-date.png`, import.meta.url).href,
}

/**
 * 这里沿用旧项目的默认值语义：
 * - static  : 固定静态值
 * - dynamic : 基于当前时间做偏移
 * - none    : 不设置默认值
 */
export const INPUTS_DATE_DEFAULT_TYPE = {
  STATIC: 'static',
  DYNAMIC: 'dynamic',
  NONE: 'none',
} as const

/**
 * 旧项目时间类型里包含季度，但当前项目使用的 Element Plus 不支持季度选择器。
 * 为了兼容历史场景数据，这里保留原始枚举值；
 * 但配置面板里已不再提供“季度/季度范围”的可选入口，
 * 真正渲染时再降级映射到月份 / 月份范围。
 */
export const INPUTS_DATE_TYPE = {
  DATE: 'date',
  DATETIME: 'datetime',
  DATERANGE: 'daterange',
  DATETIMERANGE: 'datetimerange',
  MONTH: 'month',
  MONTHRANGE: 'monthrange',
  YEAR: 'year',
  YEARRANGE: 'yearrange',
  QUARTER: 'quarter',
  QUARTERRANGE: 'quarterrange',
} as const

export const INPUTS_DATE_DIFFER_UNIT = {
  DAY: 'd',
  WEEK: 'w',
  MONTH: 'M',
  QUARTER: 'Q',
  YEAR: 'y',
  HOUR: 'h',
  MINUTE: 'm',
  SECOND: 's',
  MILLISECOND: 'ms',
} as const

type InputsDateType = (typeof INPUTS_DATE_TYPE)[keyof typeof INPUTS_DATE_TYPE]
type InputsDateDefaultType =
  (typeof INPUTS_DATE_DEFAULT_TYPE)[keyof typeof INPUTS_DATE_DEFAULT_TYPE]
type InputsDateDifferUnit = (typeof INPUTS_DATE_DIFFER_UNIT)[keyof typeof INPUTS_DATE_DIFFER_UNIT]
type InputsDateValue = number | [number, number] | null
type InputsDateOption = {
  /** 可选字体兼容未保存字体字段的历史配置。 */
  fontFamily?: string
  panelFontFamily?: string
  isPanel: 0 | 1
  value: InputsDateValue
  type: InputsDateType
  defaultType: InputsDateDefaultType
  differUnit: [InputsDateDifferUnit, InputsDateDifferUnit]
  differValue: [number, number]
  label: string
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 260, h: 32, zIndex: -1 }
  public info = clone(VInputsDateInfo)
  public option: InputsDateOption = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    fontFamily: '',
    panelFontFamily: '',
    /**
     * 时间选择器在当前项目里固定使用“下拉展示”。
     * 保留这个字段只是为了兼容旧数据结构，避免历史场景反序列化时报错。
     * 新逻辑不再暴露该配置项，也不会再走面板展示分支。
     */
    isPanel: 0,
    /**
     * 这里继续使用 value 作为当前项目统一字段，
     * 但内部语义与旧项目的 dataset 对齐。
     */
    value: Date.now(),
    type: INPUTS_DATE_TYPE.DATETIME,
    defaultType: INPUTS_DATE_DEFAULT_TYPE.STATIC,
    differUnit: [INPUTS_DATE_DIFFER_UNIT.DAY, INPUTS_DATE_DIFFER_UNIT.DAY],
    differValue: [0, 0],
    label: '时间选择器',
  }
}
