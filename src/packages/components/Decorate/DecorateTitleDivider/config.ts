import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

/** 标题下方的亮色短段与半透明延伸线。 */
export const VDecorateTitleDividerInfo = {
  name: '标题分隔线',
  keyName: 'VDecorateTitleDivider',
  packageName: 'Decorate',
  icon: new URL('../assets/images/title-divider.svg', import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 与用户提供的 341 × 2 像素原图保持一致，可通过公共布局属性自由拉伸。 */
  public attr = { l: 0, t: 0, w: 341, h: 2, zIndex: -1 }
  public info = clone(VDecorateTitleDividerInfo)
  public option = {
    accentColor: '#00C6FF',
    lineColor: 'rgba(214, 235, 255, 0.1)',
  }
}
