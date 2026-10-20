import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import type { ImageShape } from './shape'

type ImageFitMode = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
export type ImageResourceSource = 'external' | 'resource-market'
export type ImageOption = {
  /** 图片来源：外部资源保存在线地址，资源市场保存稳定的对象存储编号。 */
  sourceType: ImageResourceSource
  /** 基础选择的即时地址；数据映射为市场编号时清空，由呈现层独立解析地址。 */
  value: string
  /** 资源市场稳定编号；选择资源或 value 数据映射时同步，保存时只持久化该引用。 */
  resourceKey?: string
  fit: ImageFitMode
  /** 图片边缘形状；缺失时按矩形处理，兼容历史场景。 */
  shape: ImageShape
  borderRadius: number
  label: string
}

export const VImageInfo = {
  name: '图片',
  keyName: 'VImage',
  packageName: 'Widget',
  icon: new URL(`../assets/images/image.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 240, h: 160, zIndex: -1 }
  public info = clone(VImageInfo)
  public option: ImageOption = {
    /** 默认保持历史行为，新建图片仍直接使用当前内置图片地址。 */
    sourceType: 'external',
    value: new URL(`../../../../assets/images/logo.png`, import.meta.url).href,
    fit: 'contain',
    shape: 'rectangle',
    borderRadius: 10,
    label: '图片',
  }
}
