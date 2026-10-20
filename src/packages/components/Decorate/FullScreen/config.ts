import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VFullScreenInfo = {
  name: '全屏',
  keyName: 'VFullScreen',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/fullScreen.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 60, h: 60, zIndex: -1 }
  public info = clone(VFullScreenInfo)
  public option = {
    border: 6,
    bgColor: '#84a5e9',
    borderColor: '#84a5e9',
  }
}
