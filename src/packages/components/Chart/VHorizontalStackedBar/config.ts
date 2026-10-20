import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  barGrid,
  barMonthLabels,
  barPrimaryColor,
  barSecondaryColor,
  createHorizontalCategoryAxis,
  createHorizontalValueAxis,
  horizontalBarTooltip,
} from '../shared/barTheme'

export const VHorizontalStackedBarInfo = {
  name: '堆叠条形图',
  keyName: 'VHorizontalStackedBar',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/bar-stacked.png`, import.meta.url).href,
}

export const chartOption = {
  backgroundColor: 'transparent',
  tooltip: horizontalBarTooltip,
  grid: barGrid,
  xAxis: createHorizontalValueAxis({
    min: 0,
    max: 100,
    interval: 50,
  }),
  yAxis: createHorizontalCategoryAxis(barMonthLabels),
  series: [
    {
      type: 'bar',
      stack: 'total',
      barWidth: 8,
      data: [36, 96, 38, 45, 13, 96],
      itemStyle: {
        color: barPrimaryColor,
      },
    },
    {
      type: 'bar',
      stack: 'total',
      barWidth: 8,
      data: [30, 4, 48, 55, 28, 4],
      itemStyle: {
        color: barSecondaryColor,
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 420, h: 260, zIndex: -1 }
  public info = cloneDeep(VHorizontalStackedBarInfo)
  public option = {
    label: '堆叠条形图',
    chartOption: cloneDeep(chartOption),
  }
}
