import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VTextBarrageInfo = {
  name: '弹幕文字',
  keyName: 'VTextBarrage',
  packageName: 'Widget',
  icon: new URL(`../assets/images/text-barrage.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 500, h: 70, zIndex: -1 }
  public info = clone(VTextBarrageInfo)
  public option = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    fontFamily: '',
    value: '我是弹幕文字',
    fontSize: 32,
    fontColor: '#ffffff',
    fontWeight: 'normal',
    letterSpacing: 5,
    showShadow: true,
    hShadow: 0,
    vShadow: 0,
    blurShadow: 8,
    shadowColor: '#0075ff',
    duration: 12,
    label: '弹幕文字',
  }
}
