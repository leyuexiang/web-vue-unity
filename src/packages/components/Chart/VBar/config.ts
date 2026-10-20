/* @vite-ignore */
import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
export const VBarInfo = {
  name: '基础柱状图',
  keyName: 'VBar',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/bar-column.png`, import.meta.url).href,
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
      type: 'bar',
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 260, h: 260, zIndex: -1 }
  public info = cloneDeep(VBarInfo)
  public option = {
    label: '基础柱状图',
    chartOption: cloneDeep(chartOption),
  }

  constructor() {
    super()
  }
}
