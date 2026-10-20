import BaseConfig from '../../BaseWidgetConfig'
import type { ImageOption } from '../../Widget/Image/config'

/** 两个背景槽位共用图片来源协议，市场图片只持久化稳定编号。 */
export type ButtonImage = Pick<ImageOption, 'sourceType' | 'value' | 'resourceKey' | 'fit'>
export type ButtonImageKey = 'normal' | 'pressed'
export type ButtonOption = {
  label: string
  interactive: boolean
  images: Record<ButtonImageKey, ButtonImage>
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  text: {
    value: string
    fontFamily: string
    fontSize: number
    fontColor: string
    bold: boolean
    lineHeight: number
    letterSpacing: number
    wrap: boolean
    align: 'left' | 'center' | 'right' | 'justify'
    verticalAlign: 'top' | 'center' | 'bottom'
    /** 容器相对按钮左上角的逻辑像素偏移；宽高为零时填满按钮。 */
    x: number
    y: number
    width: number
    height: number
  }
  press: {
    enabled: boolean
    /** 缩放和亮度以百分比编辑，下移距离使用舞台逻辑像素。 */
    scale: number
    offsetY: number
    brightness: number
  }
}

export const VButtonInfo = {
  name: '按钮',
  keyName: 'VButton',
  packageName: 'Control',
  icon: new URL('./preview.svg', import.meta.url).href,
}

/** 按钮配置只保存外观与交互参数，按住状态由组件实例独立管理。 */
export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 180, h: 48, zIndex: -1 }
  public info = { ...VButtonInfo }
  public option: ButtonOption = {
    label: '按钮',
    interactive: true,
    images: {
      normal: { sourceType: 'external', value: '', fit: 'fill' },
      pressed: { sourceType: 'external', value: '', fit: 'fill' },
    },
    backgroundColor: '#5ab2a5',
    borderColor: '#48998e',
    borderWidth: 1,
    borderRadius: 4,
    text: {
      value: '按钮',
      fontFamily: '',
      fontSize: 18,
      fontColor: '#ffffff',
      bold: false,
      lineHeight: 0,
      letterSpacing: 0,
      wrap: true,
      align: 'center',
      verticalAlign: 'center',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    },
    press: { enabled: true, scale: 97, offsetY: 2, brightness: 90 },
  }
}
