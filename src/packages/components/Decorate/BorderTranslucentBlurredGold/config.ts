import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorderTranslucentBlurredGoldInfo = {
  name: '半透明模糊金边边框',
  keyName: 'VBorderTranslucentBlurredGold',
  packageName: 'Decorate',
  icon: new URL('../assets/images/translucent-blurred-gold-border.png', import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 364, h: 137, zIndex: -1 }
  public info = clone(VBorderTranslucentBlurredGoldInfo)
  public option = {}
}
