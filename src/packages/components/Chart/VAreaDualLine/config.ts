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

export const VAreaDualLineInfo = {
  name: '双系列面积图',
  keyName: 'VAreaDualLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-area-dual.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  legend: {
    ...defaultLineLegend,
    data: ['计划', '实际'],
  },
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(monthLabels),
  yAxis: createValueAxis({
    min: 0,
    max: 100,
  }),
  series: [
    {
      name: '计划',
      type: 'line',
      smooth: true,
      symbolSize: 6,
      lineStyle: {
        width: 2.5,
        color: '#3b82f6',
      },
      itemStyle: {
        color: '#3b82f6',
      },
      areaStyle: {
        color: 'rgba(59,130,246,0.2)',
      },
      data: [95, 38, 26, 74, 52, 68],
    },
    {
      name: '实际',
      type: 'line',
      smooth: true,
      symbolSize: 6,
      lineStyle: {
        width: 2.5,
        color: '#22d3ee',
      },
      itemStyle: {
        color: '#22d3ee',
      },
      areaStyle: {
        color: 'rgba(34,211,238,0.22)',
      },
      data: [24, 18, 2, 38, 10, 70],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 240, zIndex: -1 }
  public info = cloneDeep(VAreaDualLineInfo)
  public option = {
    label: '双系列面积图',
    chartOption: cloneDeep(chartOption),
  }
}
