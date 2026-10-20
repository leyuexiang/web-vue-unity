import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

/** 注册名沿用分类前缀，缩略图直接复用用户提供的矢量资源。 */
export const VBorderGradientInfo = {
  // 两端颜色与透明度均可配置，名称不再限定深色；保留注册键以兼容已有场景。
  name: '渐变背景',
  keyName: 'VBorderGradient',
  packageName: 'Decorate',
  icon: new URL('../assets/images/dark-gradient-background.svg', import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 初始尺寸对应原图，后续缩放和层级调整复用编辑器公共属性。 */
  public attr = { l: 0, t: 0, w: 456, h: 260, zIndex: -1 }
  public info = clone(VBorderGradientInfo)
  /** 两端色值包含各自透明度，精确保留原图从顶部浅透到底部深色的渐变。 */
  public option = {
    topColor: 'rgba(30, 30, 30, 0.117647)',
    bottomColor: 'rgba(30, 30, 30, 0.6)',
  }
}
