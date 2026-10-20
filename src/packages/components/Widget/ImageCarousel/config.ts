import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

type ImageFitMode = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
type CarouselDirection = 'horizontal' | 'vertical'
type CarouselEffect = 'slide' | 'fade' | 'card'
type CarouselDotType = 'dot' | 'line'
type CarouselDotPlacement = 'top' | 'bottom' | 'left' | 'right'
type ImageCarouselOption = {
  dataset: string[]
  options: Array<{ label: string; value: string }>
  autoplay: boolean
  interval: number
  direction: CarouselDirection
  effect: CarouselEffect
  showDots: boolean
  dotType: CarouselDotType
  dotPlacement: CarouselDotPlacement
  showArrow: boolean
  fit: ImageFitMode
  label: string
}

export const VImageCarouselInfo = {
  name: '图片轮播',
  keyName: 'VImageCarousel',
  packageName: 'Widget',
  icon: new URL(`../assets/images/image-carousel.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 180, zIndex: -1 }
  public info = clone(VImageCarouselInfo)
  public option: ImageCarouselOption = {
    /**
     * 这里补回旧项目更直观的图片路径数组。
     * 基础面板优先编辑 dataset，运行时与数据映射再兼容 options。
     */
    dataset: [new URL(`../../../../assets/images/logo.png`, import.meta.url).href],
    /**
     * 保留 options 是为了兼容当前项目已有的数据映射链路。
     * 右侧数据面板把列表型映射结果写进 options 后，组件仍然能够正确消费。
     */
    options: [
      {
        label: '图片1',
        value: new URL(`../../../../assets/images/logo.png`, import.meta.url).href,
      },
    ],
    autoplay: true,
    interval: 5000,
    direction: 'horizontal',
    effect: 'slide',
    showDots: true,
    dotType: 'dot',
    dotPlacement: 'bottom',
    showArrow: false,
    fit: 'contain',
    label: '图片轮播',
  }
}
