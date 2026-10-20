import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
  monthLabels,
} from '../shared/lineTheme'

export const VAreaSmoothLineInfo = {
  name: '平滑面积图',
  keyName: 'VAreaSmoothLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-area-smooth.png`, import.meta.url).href,
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
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: {
        color: '#2563eb',
      },
      lineStyle: {
        width: 2.5,
        color: '#2563eb',
      },
      areaStyle: {
        color: 'rgba(37,99,235,0.2)',
      },
      data: [28, 24, 25, 36, 4, 58],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 220, zIndex: -1 }
  public info = cloneDeep(VAreaSmoothLineInfo)
  public option = {
    label: '平滑面积图',
    chartOption: cloneDeep(chartOption),
  }
}
