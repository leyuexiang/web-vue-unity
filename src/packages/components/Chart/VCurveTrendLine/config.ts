import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
  realtimeLabels,
} from '../shared/lineTheme'

export const VCurveTrendLineInfo = {
  name: '曲线趋势图',
  keyName: 'VCurveTrendLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-curve-trend.png`, import.meta.url).href,
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
      smooth: true,
      showSymbol: false,
      data: [18, 96, 88, 16, 72, 15, 80, 8, 54, 14, 86, 20, 58, 12, 50],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 220, zIndex: -1 }
  public info = cloneDeep(VCurveTrendLineInfo)
  public option = {
    label: '曲线趋势图',
    chartOption: cloneDeep(chartOption),
  }
}
