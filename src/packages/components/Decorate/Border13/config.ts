import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder13Info = {
  name: '边框-13',
  keyName: 'VBorder13',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border13.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder13Info)
  public option = {
    colors: ['#2862b7', '#4b77b7'],
    backgroundColor: '#00000000',
  }
}
