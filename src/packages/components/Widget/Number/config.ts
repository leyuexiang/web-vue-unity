import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VNumberInfo = {
  name: '数字计数器',
  keyName: 'VNumber',
  packageName: 'Widget',
  icon: new URL(`../assets/images/number.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 100, zIndex: -1 }
  public info = clone(VNumberInfo)
  public option = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    prefixFontFamily: '',
    numberFontFamily: '',
    suffixFontFamily: '',
    dataset: 100000,
    dur: 3,
    precision: 0,
    showSeparator: true,
    numberSize: 34,
    numberColor: '#4a9ef8',
    prefixText: '￥',
    prefixColor: '#4a9ef8',
    suffixText: '元',
    suffixColor: '#4a9ef8',
    label: '数字计数器',
  }
}
