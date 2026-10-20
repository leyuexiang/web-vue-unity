import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VPipelineHInfo = {
  name: '水平管道',
  keyName: 'VPipelineH',
  packageName: 'Decorate',
  icon: new URL(`../assets/images/Pipeline_H.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 20, zIndex: -1 }
  public info = clone(VPipelineHInfo)
  public option = {
    color_type: 1,
    o_color: '#0a7ae2',
    i_color: '#119bfa',
    line_class: 'svg-ani-flow',
  }
}
