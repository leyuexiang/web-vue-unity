import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

/** 沿用边框分类和动态组件加载协议。 */
export const VBorderCornerGlowInfo = {
  name: '四角发光边框',
  keyName: 'VBorderCornerGlow',
  packageName: 'Decorate',
  icon: new URL('../assets/images/corner-glow-border.svg', import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 原图尺寸含发光留边，容器缩放时整体双向拉伸。 */
  public attr = { l: 0, t: 0, w: 670, h: 546, zIndex: -1 }
  public info = clone(VBorderCornerGlowInfo)
  /** 原图两种绿色分别可调，深色背景不进入可编辑配置。 */
  public option = { color: '#4AC36A', frameColor: '#05A256' }
}
