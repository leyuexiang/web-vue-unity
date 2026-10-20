import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder05Info = {
  name: '边框-05',
  keyName: 'VBorder05',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border05.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder05Info)
  public option = {
    colors: ['#1d48c4', '#d3e1f8'],
    backgroundColor: '#00000000',
  }
}
