import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
  realtimeLabels,
} from '../shared/lineTheme'

export const VLineTrendInfo = {
  name: '折线趋势图',
  keyName: 'VLineTrend',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-trend.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(realtimeLabels, {
    boundaryGap: true,
  }),
  yAxis: createValueAxis({
    min: 0,
    max: 100,
  }),
  series: [
    {
      type: 'line',
      showSymbol: false,
      data: [12, 68, 62, 85, 8, 70, 18, 58, 55, 0, 96, 52, 22, 5, 18, 68],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 220, zIndex: -1 }
  public info = cloneDeep(VLineTrendInfo)
  public option = {
    label: '折线趋势图',
    chartOption: cloneDeep(chartOption),
  }
}
