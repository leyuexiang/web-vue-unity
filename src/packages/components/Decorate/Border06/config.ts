import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder06Info = {
  name: '边框-06',
  keyName: 'VBorder06',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border06.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder06Info)
  public option = {
    colors: ['#3140ad', '#1089ff'],
    backgroundColor: '#00000000',
  }
}
