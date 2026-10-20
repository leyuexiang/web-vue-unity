import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder01Info = {
  name: '边框-01',
  keyName: 'VBorder01',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border01.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder01Info)
  public option = {
    dur: 0.5,
    colors: ['#4fd2dd', '#235fa7'],
    backgroundColor: '#00000000',
  }
}
