import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

/** 注册名沿用分类前缀，缩略图直接复用用户提供的矢量资源。 */
export const VDecorateGreenBarInfo = {
  // 色块可自由调整颜色和宽高，展示名不再限定颜色及方向；注册键保持兼容已有场景。
  name: '纯色色块',
  keyName: 'VDecorateGreenBar',
  packageName: 'Decorate',
  icon: new URL('../assets/images/green-vertical-bar.svg', import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 初始尺寸对应原图，后续缩放和层级调整复用编辑器公共属性。 */
  public attr = { l: 0, t: 0, w: 2, h: 14, zIndex: -1 }
  public info = clone(VDecorateGreenBarInfo)
  /** 颜色及透明度统一保存在色值中；默认仍为原图的不透明绿色。 */
  public option = { color: '#4AC36A' }
}
