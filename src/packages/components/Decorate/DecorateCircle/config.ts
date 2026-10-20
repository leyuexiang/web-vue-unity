import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

/** 装饰前缀使圆形色块进入现有装饰分类，缩略图保持原图样式。 */
export const VDecorateCircleInfo = {
  name: '圆形色块',
  keyName: 'VDecorateCircle',
  packageName: 'Decorate',
  icon: new URL('../assets/images/circle-block.svg', import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 默认采用原图 6×6 尺寸，后续尺寸与位置复用公共属性。 */
  public attr = { l: 0, t: 0, w: 6, h: 6, zIndex: -1 }
  public info = clone(VDecorateCircleInfo)
  /** 原图白色与 0.8 不透明度合并存入颜色，渲染时不再重复叠加透明度。 */
  public option = { color: 'rgba(255, 255, 255, 0.8)' }
}

