import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

/** 使用装饰分类前缀，缩略图沿用原始绿色图形。 */
export const VDecorateSlantedLineInfo = {
  name: '渐变斜角线',
  keyName: 'VDecorateSlantedLine',
  packageName: 'Decorate',
  icon: new URL('../assets/images/slanted-gradient-line.svg', import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 默认尺寸与原图一致，宽高均由画布公共属性控制。 */
  public attr = { l: 0, t: 0, w: 289, h: 10, zIndex: -1 }
  public info = clone(VDecorateSlantedLineInfo)
  /** 含透明度的颜色值直接持久化，默认保持原始绿色。 */
  public option = { color: '#4AC36A' }
}
