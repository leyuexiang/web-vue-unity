import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

/** 带顶部短分割线和右侧斜纹装饰的毛玻璃边框。 */
export const VBorderDividerGlassInfo = {
  name: '带分割线装饰毛玻璃边框',
  keyName: 'VBorderDividerGlass',
  packageName: 'Decorate',
  icon: new URL('../assets/images/border-divider-glass.svg', import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 初始尺寸与设计图一致，四角装饰在任意宽高下都保持固定形状。 */
  public attr = { l: 0, t: 0, w: 374, h: 317, zIndex: -1 }
  public info = clone(VBorderDividerGlassInfo)
  /** 毛玻璃默认叠加设计图中的深蓝色，颜色值包含透明度以保留背景模糊。 */
  public option = {
    glassColor: 'rgba(12, 49, 88, 0.72)',
    borderColor: 'rgba(205, 235, 255, 0.82)',
    lineColor: 'rgba(169, 205, 229, 0.32)',
    accentColor: '#00C6FF',
  }
}
