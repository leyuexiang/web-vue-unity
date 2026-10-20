import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder08Info = {
  name: '边框-08',
  keyName: 'VBorder08',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border08.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder08Info)
  public option = {
    colors: ['#235fa7', '#4fd2dd'],
    dur: 3,
    reverse: false,
    backgroundColor: '#00000000',
  }
}
