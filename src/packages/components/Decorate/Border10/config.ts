import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder10Info = {
  name: '边框-10',
  keyName: 'VBorder10',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border10.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder10Info)
  public option = {
    colors: ['#1089ff', '#0000ff'],
    backgroundColor: '#00000000',
  }
}
