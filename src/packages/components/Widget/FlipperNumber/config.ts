import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import type { FlipType } from '@/components/Pages/Flipper'

type FlipperNumberOption = {
  /** 可选字体兼容未保存字体字段的历史配置。 */
  fontFamily?: string
  dataset: number
  flipperLength: number
  flipperBgColor: string
  flipperTextColor: string
  flipperWidth: number
  flipperHeight: number
  flipperRadius: number
  flipperGap: number
  flipperType: FlipType
  flipperSpeed: number
  flipperBorderWidth: number
  label: string
}

export const VFlipperNumberInfo = {
  name: '数字翻牌',
  keyName: 'VFlipperNumber',
  packageName: 'Widget',
  icon: new URL(`../assets/images/flipper-number.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 100, zIndex: -1 }
  public info = clone(VFlipperNumberInfo)
  public option: FlipperNumberOption = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    fontFamily: '',
    dataset: 3234,
    flipperLength: 6,
    flipperBgColor: '#16293E',
    flipperTextColor: '#4A9EF8FF',
    flipperWidth: 30,
    flipperHeight: 50,
    flipperRadius: 5,
    flipperGap: 10,
    flipperType: 'down',
    flipperSpeed: 450,
    flipperBorderWidth: 0,
    label: '数字翻牌',
  }
}
