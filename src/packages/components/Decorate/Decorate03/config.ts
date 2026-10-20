import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VDecorate03Info = {
  name: '装饰-03',
  keyName: 'VDecorate03',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/decorates03.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 40, zIndex: -1 }
  public info = clone(VDecorate03Info)
  public option = {
    /** 文字字体默认继承，保持旧场景外观；用户选择后随组件配置持久化。 */
    fontFamily: '',
    dataset: '我是标题',
    textColor: '#fff',
    textSize: 32,
    colors: ['#1dc1f5', '#1dc1f5'],
  }
}
