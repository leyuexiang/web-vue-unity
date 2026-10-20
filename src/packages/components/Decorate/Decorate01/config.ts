import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VDecorate01Info = {
  name: '装饰-01',
  keyName: 'VDecorate01',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/decorates01.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 40, zIndex: -1 }
  public info = clone(VDecorate01Info)
  public option = {
    colors: ['#3faacb', '#fff'],
    dur: 3,
    lineHeight: 2,
    endWidth: 5,
  }
}
