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

export const VAreaStackedLineInfo = {
  name: '堆叠面积图',
  keyName: 'VAreaStackedLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-area-stacked.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  legend: {
    ...defaultLineLegend,
    data: ['办公', '生产', '运营'],
  },
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(monthLabels),
  yAxis: createValueAxis({
    min: 0,
    max: 180,
  }),
  series: [
    {
      name: '办公',
      type: 'line',
      smooth: true,
      stack: 'total',
      showSymbol: false,
      lineStyle: {
        width: 1.8,
        color: '#60a5fa',
      },
      areaStyle: {
        color: 'rgba(96,165,250,0.28)',
      },
      data: [18, 16, 20, 28, 26, 32],
    },
    {
      name: '生产',
      type: 'line',
      smooth: true,
      stack: 'total',
      showSymbol: false,
      lineStyle: {
        width: 1.8,
        color: '#38bdf8',
      },
      areaStyle: {
        color: 'rgba(56,189,248,0.28)',
      },
      data: [22, 26, 34, 42, 36, 44],
    },
    {
      name: '运营',
      type: 'line',
      smooth: true,
      stack: 'total',
      showSymbol: false,
      lineStyle: {
        width: 1.8,
        color: '#22c55e',
      },
      areaStyle: {
        color: 'rgba(34,197,94,0.24)',
      },
      data: [12, 18, 20, 26, 30, 34],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 240, zIndex: -1 }
  public info = cloneDeep(VAreaStackedLineInfo)
  public option = {
    label: '堆叠面积图',
    chartOption: cloneDeep(chartOption),
  }
}
