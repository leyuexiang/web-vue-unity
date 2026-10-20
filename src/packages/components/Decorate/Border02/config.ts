import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder02Info = {
  name: '边框-02',
  keyName: 'VBorder02',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border02.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder02Info)
  public option = {
    colors: ['#6586ec', '#2cf7fe'],
    backgroundColor: '#00000000',
  }
}
