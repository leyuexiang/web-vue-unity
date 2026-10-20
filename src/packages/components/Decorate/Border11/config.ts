import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder11Info = {
  name: '边框-11',
  keyName: 'VBorder11',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border11.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder11Info)
  public option = {
    colors: ['#2862b7', '#2862b7'],
    backgroundColor: '#00000000',
  }
}
