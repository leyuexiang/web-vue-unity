import type { ComponentDataConfig } from '@/types/data-config'

interface InfoType {
  name: string
  keyName: string
  packageName: string
  icon: string
}

interface OptionType {
  [key: string]: unknown
}

interface StylesType {
  /**
   * 公共动画使用单值数组保存，和 go-view 的数据结构保持一致。
   * 当前版本仍然只消费第一个值，保留数组形态是为了兼容后续扩展。
   */
  animations: string[]
}

export interface WidgetAttr {
  /** 部件左上角在当前发布舞台中的 X 坐标。 */
  l: number
  /** 部件左上角在当前发布舞台中的 Y 坐标。 */
  t: number
  /** 部件在当前发布舞台中的逻辑宽度，会随统一舞台一起等比显示缩放。 */
  w: number
  /** 部件在当前发布舞台中的逻辑高度，会随统一舞台一起等比显示缩放。 */
  h: number
  /** 点击比例锁时保存的宽高比；缺省或零表示自由缩放，随属性一起保存和撤销。 */
  aspectRatio?: number
  /** 部件在二维 DOM 图层中的堆叠顺序。 */
  zIndex: number
}

export interface ImplConfig {
  attr: WidgetAttr
  info: InfoType
  option: OptionType
  styles: StylesType
  dataConfig?: ComponentDataConfig
}
