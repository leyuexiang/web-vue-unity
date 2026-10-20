import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VDecorate06Info = {
  name: '装饰-06',
  keyName: 'VDecorate06',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/decorates06.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 60, zIndex: -1 }
  public info = clone(VDecorate06Info)
  public option = {
    /** 文字字体默认继承，保持旧场景外观；用户选择后随组件配置持久化。 */
    fontFamily: '',
    colors: ['#1DC1F533', '#1DC1F5FF'],
    dataset: '我是标题',
    textColor: '#fff',
    textSize: 32,
  }
}
