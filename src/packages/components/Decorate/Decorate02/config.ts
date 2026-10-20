import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VDecorate02Info = {
  name: '装饰-02',
  keyName: 'VDecorate02',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/decorates02.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 10, zIndex: -1 }
  public info = clone(VDecorate02Info)
  public option = {
    colors: ['#ffffff4d', '#ffffff4d'],
    dur: 3,
    lineHeight: 3,
  }
}
