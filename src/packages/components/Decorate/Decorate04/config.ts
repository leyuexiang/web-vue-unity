import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VDecorate04Info = {
  name: '装饰-04',
  keyName: 'VDecorate04',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/decorates04.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 40, zIndex: -1 }
  public info = clone(VDecorate04Info)
  public option = {
    colors: ['#1dc1f5', '#1dc1f5'],
    reverse: false,
  }
}
