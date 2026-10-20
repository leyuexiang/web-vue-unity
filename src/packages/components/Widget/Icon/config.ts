import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { DEFAULT_GOVIEW_ICON_NAME } from './iconCatalog'
import { createGoviewIconDataConfig } from './iconRuntime'

export type VIconRotateValue = 0 | 1 | 2 | 3

export interface VIconOption {
  dataset: string
  value: string
  color: string
  size: number
  rotate: VIconRotateValue
  visible: boolean
  label: string
}

export const VIconInfo = {
  name: '图标',
  keyName: 'VIcon',
  packageName: 'Widget',
  icon: new URL(`../assets/images/icon-widget.svg`, import.meta.url).href,
}

export const defaultIconOption: VIconOption = {
  dataset: DEFAULT_GOVIEW_ICON_NAME,
  value: DEFAULT_GOVIEW_ICON_NAME,
  color: '#9ca3af',
  size: 64,
  rotate: 0,
  visible: true,
  label: 'apple',
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 96, h: 96, zIndex: -1 }
  public info = cloneDeep(VIconInfo)
  public option = cloneDeep(defaultIconOption)

  /**
   * 新拖入的图标和图表一样，需要在“数据”面板直接展示默认数据。
   * 这里给默认图标也补一份静态数据配置；左侧具体图标卡片拖拽时会用自己的图标名覆盖它。
   */
  public dataConfig = createGoviewIconDataConfig(defaultIconOption.dataset)
}
