import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
  monthLabels,
} from '../shared/lineTheme'

export const VAreaBasicLineInfo = {
  name: '基础面积图',
  keyName: 'VAreaBasicLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-area-basic.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(monthLabels),
  yAxis: createValueAxis({
    min: 0,
    max: 100,
  }),
  series: [
    {
      type: 'line',
      symbolSize: 7,
      itemStyle: {
        color: '#3b82f6',
      },
      lineStyle: {
        width: 2,
        color: '#3b82f6',
      },
      areaStyle: {
        color: 'rgba(59,130,246,0.24)',
      },
      data: [32, 27, 26, 36, 2, 62],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 220, zIndex: -1 }
  public info = cloneDeep(VAreaBasicLineInfo)
  public option = {
    label: '基础面积图',
    chartOption: cloneDeep(chartOption),
  }
}
