import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import type { FlipType } from '@/components/Pages/Flipper'

type STYLE = '时分秒' | '冒号'
type CountDownOption = {
  /** 可选字体兼容未保存字体字段的历史配置。 */
  numberFontFamily?: string
  unitFontFamily?: string
  dataset: number
  useEndDate: boolean
  endDate: number
  style: STYLE
  showDay: boolean
  flipperBgColor: string
  flipperTextColor: string
  flipperWidth: number
  flipperHeight: number
  flipperRadius: number
  flipperGap: number
  flipperType: FlipType
  flipperSpeed: number
  label: string
}

export const VCountDownInfo = {
  name: '倒计时',
  keyName: 'VCountDown',
  packageName: 'Widget',
  icon: new URL(`../assets/images/countdown.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 500, h: 100, zIndex: -1 }
  public info = clone(VCountDownInfo)
  public option: CountDownOption = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    numberFontFamily: '',
    unitFontFamily: '',
    dataset: 10 * 60,
    useEndDate: false,
    endDate: new Date().getTime(),
    style: '时分秒' as STYLE,
    showDay: false,
    flipperBgColor: '#16293E',
    flipperTextColor: '#4A9EF8FF',
    flipperWidth: 30,
    flipperHeight: 50,
    flipperRadius: 5,
    flipperGap: 10,
    flipperType: 'down',
    flipperSpeed: 450,
    label: '倒计时',
  }
}
