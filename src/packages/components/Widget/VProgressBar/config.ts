import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

/** 直线进度条所有可编辑的显示字段，确保配置面板只能写入受支持的文本位置。 */
export interface VProgressBarOption {
  percentage: number
  fillColor: string
  trackColor: string
  trackHeight: number
  borderRadius: number
  showPercentage: boolean
  textPosition: 'inside' | 'right'
  textColor: string
  textSize: number
  label: string
}

export const VProgressBarInfo = {
  name: '直线进度条',
  keyName: 'VProgressBar',
  packageName: 'Widget',
  // 使用本组件自带的透明矢量缩略图，不冒用其它控件或图表的设计资源。
  icon: new URL('../assets/images/progress-bar.svg', import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 默认宽度留足展示空间；较矮的容器仍可通过属性面板调整轨道高度。 */
  public attr = { l: 0, t: 0, w: 420, h: 36, zIndex: -1 }
  public info = clone(VProgressBarInfo)
  public option: VProgressBarOption = {
    /** 当前进度使用 0–100 的百分比语义，默认值对应参考图中的约七成填充。 */
    percentage: 70,
    /** 默认青色填充和深蓝灰底轨贴近用户提供的直线进度条效果。 */
    fillColor: '#08B5D2',
    trackColor: '#35465A',
    /** 轨道厚度与圆角分别配置，便于从细线调整为更醒目的进度带。 */
    trackHeight: 15,
    borderRadius: 6,
    /** 默认隐藏文字以匹配纯进度条参考图；需要时可在轨道内或右侧显示百分比。 */
    showPercentage: false,
    textPosition: 'right',
    textColor: '#D0D8E2',
    textSize: 14,
    label: '直线进度条',
  }
}
