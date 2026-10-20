import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorderSolidBlurredGoldInfo = {
  name: '实心模糊金边边框',
  keyName: 'VBorderSolidBlurredGold',
  packageName: 'Decorate',
  icon: new URL('../assets/images/solid-blurred-gold-border.png', import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 881, h: 774, zIndex: -1 }
  public info = clone(VBorderSolidBlurredGoldInfo)
  public option = {}
}
