import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VBorderTranslucentBlurredGoldCapsuleInfo = {
  name: '半透明模糊金边胶囊边框',
  keyName: 'VBorderTranslucentBlurredGoldCapsule',
  packageName: 'Decorate',
  icon: new URL('../assets/images/translucent-blurred-gold-capsule-border.png', import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 331, h: 30, zIndex: -1 }
  public info = clone(VBorderTranslucentBlurredGoldCapsuleInfo)
  public option = {}
}
