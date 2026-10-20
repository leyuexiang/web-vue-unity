import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder03Info = {
  name: '边框-03',
  keyName: 'VBorder03',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border03.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder03Info)
  public option = {
    colors: ['#6586ec', '#2cf7fe'],
    backgroundColor: '#00000000',
  }
}
