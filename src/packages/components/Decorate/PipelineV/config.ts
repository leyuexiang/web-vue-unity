import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VPipelineVInfo = {
  name: '垂直管道',
  keyName: 'VPipelineV',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/Pipeline_V.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 20, h: 300, zIndex: -1 }
  public info = clone(VPipelineVInfo)
  public option = {
    color_type: 1,
    o_color: '#0a7ae2',
    i_color: '#119bfa',
    line_class: 'svg-ani-flow',
  }
}
