import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder07Info = {
  name: '边框-07',
  keyName: 'VBorder07',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border07.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder07Info)
  public option = {
    colors: ['#11eefd', '#0078d2'],
    backgroundColor: '#00000000',
  }
}
