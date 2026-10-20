import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VDecorate05Info = {
  name: '装饰-05',
  keyName: 'VDecorate05',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/decorates05.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 40, zIndex: -1 }
  public info = clone(VDecorate05Info)
  public option = {
    colors: ['#00c2ff', '#00c2ff4d'],
    dur: 3,
  }
}
