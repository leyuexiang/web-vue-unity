import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineLegend,
  defaultLineTooltip,
  monthLabels,
} from '../shared/lineTheme'

export const VMultiLineInfo = {
  name: '多折线图',
  keyName: 'VMultiLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-multi.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  legend: {
    ...defaultLineLegend,
    data: ['系列A', '系列B'],
  },
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(monthLabels),
  yAxis: createValueAxis(),
  series: [
    {
      name: '系列A',
      type: 'line',
      data: [18, 14, 26, 34, 38, 46],
      symbolSize: 6,
    },
    {
      name: '系列B',
      type: 'line',
      data: [50, 16, 50, 64, 56, 62],
      symbolSize: 6,
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 220, zIndex: -1 }
  public info = cloneDeep(VMultiLineInfo)
  public option = {
    label: '多折线图',
    chartOption: cloneDeep(chartOption),
  }
}
