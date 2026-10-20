import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VTimeCommonInfo = {
  name: '时间',
  keyName: 'VTimeCommon',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/time-common.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 260, h: 50, zIndex: -1 }
  public info = clone(VTimeCommonInfo)
  public option = {
    /** 文字字体默认继承，保持旧场景外观；用户选择后随组件配置持久化。 */
    fontFamily: '',
    timeSize: 24,
    timeLineHeight: 50,
    timeTextIndent: 2,
    timeColor: '#E6F7FF',
    fontWeight: 'normal',
    showShadow: true,
    hShadow: 0,
    vShadow: 0,
    blurShadow: 8,
    colorShadow: '#0075ff',
  }
}
