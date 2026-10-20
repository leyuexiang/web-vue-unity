import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
  monthLabels,
} from '../shared/lineTheme'

export const VAreaGradientLineInfo = {
  name: '渐变面积图',
  keyName: 'VAreaGradientLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-area-gradient.png`, import.meta.url).href,
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
      showSymbol: false,
      lineStyle: {
        width: 2.5,
        color: '#3b82f6',
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59,130,246,0.48)' },
            { offset: 1, color: 'rgba(59,130,246,0.04)' },
          ],
        },
      },
      data: [42, 36, 34, 52, 46, 68],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 220, zIndex: -1 }
  public info = cloneDeep(VAreaGradientLineInfo)
  public option = {
    label: '渐变面积图',
    chartOption: cloneDeep(chartOption),
  }
}
