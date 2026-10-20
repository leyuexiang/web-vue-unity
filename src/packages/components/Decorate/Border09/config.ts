import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder09Info = {
  name: '边框-09',
  keyName: 'VBorder09',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border09.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder09Info)
  public option = {
    colors: ['#3140ad', '#235fa7'],
    backgroundColor: '#00000000',
  }
}
