import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VClockInfo = {
  name: '时钟',
  keyName: 'VClock',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/clock.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 200, h: 200, zIndex: -1 }
  public info = clone(VClockInfo)
  public option = {
    border: 6,
    color: '#ffffff',
    bgColor: '#84a5e9',
    borderColor: '#ffffff',
  }
}
