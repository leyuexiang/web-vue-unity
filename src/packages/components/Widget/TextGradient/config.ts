import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VTextGradientInfo = {
  name: '渐变文字',
  keyName: 'VTextGradient',
  packageName: 'Widget',
  icon: new URL(`../assets/images/text-gradient.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 260, h: 80, zIndex: -1 }
  public info = clone(VTextGradientInfo)
  public option = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    fontFamily: '',
    value: '我是渐变文本',
    fontSize: 28,
    fontWeight: 'bold',
    fromColor: '#5be7ff',
    toColor: '#a855f7',
    deg: 45,
    label: '渐变文字',
  }
}
