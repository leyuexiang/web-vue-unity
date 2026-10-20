import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder04Info = {
  name: '边框-04',
  keyName: 'VBorder04',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border04.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder04Info)
  public option = {
    /** 文字字体默认继承，保持旧场景外观；用户选择后随组件配置持久化。 */
    borderTitleFontFamily: '',
    borderTitle: '边框-04',
    borderTitleWidth: 250,
    borderTitleHeight: 32,
    borderTitleSize: 18,
    borderTitleColor: '#fff',
    colors: ['#8aaafb', '#1f33a2'],
    backgroundColor: '#00000000',
  }
}
