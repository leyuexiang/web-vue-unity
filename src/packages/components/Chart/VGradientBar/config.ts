import { cloneDeep } from 'lodash-es'
import * as echarts from 'echarts'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
} from '../shared/lineTheme'

export const VGradientBarInfo = {
  name: '渐变柱状图',
  keyName: 'VGradientBar',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/bar-gradient-glow.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: {
    ...defaultLineTooltip,
    valueFormatter: (value: number) => `${value} 万kwh`,
  },
  grid: {
    ...defaultLineGrid,
    top: 36,
  },
  graphic: [
    {
      type: 'text',
      left: 20,
      top: 2,
      style: {
        text: '单位: 万kwh',
        fill: '#000000',
        font: '14px sans-serif',
      },
    },
  ],
  xAxis: createCategoryAxis(['1月', '2月', '3月', '4月', '5月', '6月'], {
    boundaryGap: true,
  }),
  yAxis: createValueAxis({
    min: 0,
    max: 600,
    interval: 150,
  }),
  series: [
    {
      type: 'bar',
      barMaxWidth: 18,
      data: [360, 160, 470, 205, 320, 430],
      itemStyle: {
        borderRadius: [3, 3, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(122, 167, 255, 0.95)' },
          { offset: 0.55, color: 'rgba(79, 131, 255, 0.78)' },
          { offset: 1, color: 'rgba(79, 131, 255, 0.18)' },
        ]),
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 340, h: 240, zIndex: -1 }
  public info = cloneDeep(VGradientBarInfo)
  public option = {
    label: '渐变柱状图',
    chartOption: cloneDeep(chartOption),
  }
}
