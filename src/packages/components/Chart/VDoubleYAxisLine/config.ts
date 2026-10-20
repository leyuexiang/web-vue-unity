import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineLegend,
  defaultLineTooltip,
} from '../shared/lineTheme'

export const VDoubleYAxisLineInfo = {
  name: '双Y轴折线图',
  keyName: 'VDoubleYAxisLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-double-y.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: {
    ...defaultLineTooltip,
    axisPointer: {
      type: 'cross',
    },
  },
  legend: {
    ...defaultLineLegend,
    data: ['电压', '电流'],
  },
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(['1', '2', '3', '4', '5', '6']),
  yAxis: [
    createValueAxis({
      name: '电压',
      min: 0,
      max: 120,
    }),
    createValueAxis({
      name: '电流',
      min: 0,
      max: 120,
    }),
  ],
  series: [
    {
      name: '电压',
      type: 'line',
      smooth: true,
      data: [8, 36, 10, 42, 28, 34],
    },
    {
      name: '电流',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: [12, 18, 8, 22, 62, 40],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 240, zIndex: -1 }
  public info = cloneDeep(VDoubleYAxisLineInfo)
  public option = {
    label: '双Y轴折线图',
    chartOption: cloneDeep(chartOption),
  }
}
