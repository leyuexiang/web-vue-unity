import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

/** 使用原图九宫格切片的实心深绿色边框。 */
export const VBorderSolidDeepGreenInfo = {
  name: '实心深绿边框',
  keyName: 'VBorderSolidDeepGreen',
  packageName: 'Decorate',
  icon: new URL('../assets/images/solid-deep-green-border.png', import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 初始尺寸沿用 1x 原图尺寸，便于首次拖入时保持设计比例。 */
  public attr = { l: 0, t: 0, w: 364, h: 354, zIndex: -1 }
  public info = clone(VBorderSolidDeepGreenInfo)
  /** 图片本身已经包含深绿色填充，没有额外可编辑配置。 */
  public option = {}
}
