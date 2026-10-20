import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VLineInfo = {
  name: '基础折线图',
  keyName: 'VLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-basic.png`, import.meta.url).href,
}

export const chartOption = {
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  },
  yAxis: {
    type: 'value',
    color: () => '#000',
  },
  series: [
    {
      data: [150, 230, 224, 218, 135, 147, 260],
      type: 'line',
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 260, h: 260, zIndex: -1 }
  public info = cloneDeep(VLineInfo)
  public option = {
    label: '基础折线图',
    chartOption: cloneDeep(chartOption),
  }

  constructor() {
    super()
  }
}
