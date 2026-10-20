import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorder12Info = {
  name: '边框-12',
  keyName: 'VBorder12',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/border12.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 200, zIndex: -1 }
  public info = clone(VBorder12Info)
  public option = {
    colors: ['#2862b7', '#2862b7'],
    backgroundColor: '#00000000',
  }
}
