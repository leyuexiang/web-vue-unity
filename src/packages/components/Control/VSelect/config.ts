import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export type VSelectOptionValue = string | number | null

export type VSelectOptionItem = {
  label: string
  value: VSelectOptionValue
}

export type VSelectOption = {
  /** 选中值与浮层候选项独立设置字体；缺省时沿用原有字体。 */
  fontFamily?: string
  optionFontFamily?: string
  /**
   * 编辑器属性面板里展示的人类可读名称。
   * 该字段不参与数据映射，运行时只消费 value 和 options。
   */
  label: string
  /**
   * 当前选中值允许保留外部数据的原始类型。
   * 例如数据内容里传入数字 1，而 options 中 value 是字符串 "1"，
   * 组件显示层会做兼容匹配，但这里不强行改写原始值，避免影响外部规则判断。
   */
  value: VSelectOptionValue | undefined
  /**
   * 下拉候选项由 label/value 组成。
   * 静态数据或动态接口可以整体替换它，用于动态修改下拉文案和候选值。
   */
  options: VSelectOptionItem[]
}

export const VSelectInfo = {
  /**
   * 这里沿用旧项目“信息 -> 控件”里的命名口径，左侧面板直接显示“下拉选择器”。
   * 这样用户在当前项目里看到的名称和旧项目截图一致，不需要再做额外心智转换。
   */
  name: '下拉选择器',
  keyName: 'VSelect',
  packageName: 'Control',
  /**
   * 缩略图改用旧项目信息栏里的原始 PNG，
   * 保证“部件”面板视觉和用户熟悉的来源项目尽量一致。
   */
  icon: new URL(`../assets/images/inputs-select.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 260, h: 32, zIndex: -1 }
  public info = clone(VSelectInfo)
  public option: VSelectOption = {
    /**
     * 运行时真正消费的是 value + options。
     * label 仅用于当前编辑器里的人类可读名称，不参与数据映射。
     */
    label: '下拉选择器',
    value: '1',
    options: [
      { label: '选项1', value: '1' },
      { label: '选项2', value: '2' },
      { label: '选项3', value: '3' },
    ],
  }
}
