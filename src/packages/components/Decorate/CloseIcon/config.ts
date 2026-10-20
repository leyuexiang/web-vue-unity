import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

/** 不使用边框或装饰前缀，按现有分类规则进入“更多”；点击行为由编辑器事件配置。 */
export const VCloseIconInfo = {
  name: '关闭图标',
  keyName: 'VCloseIcon',
  packageName: 'Decorate',
  icon: new URL('../assets/images/close-icon.svg', import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 保留原图默认尺寸与留白，缩放复用画布公共属性。 */
  public attr = { l: 0, t: 0, w: 24, h: 24, zIndex: -1 }
  public info = clone(VCloseIconInfo)
  /** 默认使用原图绿色，颜色及透明度随场景配置保存。 */
  public option = { color: '#4AC36A' }
}
