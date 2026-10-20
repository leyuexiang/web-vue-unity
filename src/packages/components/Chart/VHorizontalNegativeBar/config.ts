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

export const VHorizontalNegativeBarInfo = {
  name: '正负条形图',
  keyName: 'VHorizontalNegativeBar',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/bar-negative.png`, import.meta.url).href,
}

export const chartOption = {
  backgroundColor: 'transparent',
  tooltip: horizontalBarTooltip,
  grid: barGrid,
  xAxis: createHorizontalValueAxis({
    min: -50,
    max: 100,
    interval: 50,
  }),
  yAxis: createHorizontalCategoryAxis(barMonthLabels),
  series: [
    {
      type: 'bar',
      stack: 'mix',
      barWidth: 8,
      data: [26, 88, 56, 26, 12, 78],
      itemStyle: {
        color: barPrimaryColor,
      },
    },
    {
      type: 'bar',
      stack: 'mix',
      barWidth: 8,
      data: [74, 10, 44, -8, -10, 22],
      itemStyle: {
        color: barSecondaryColor,
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 420, h: 260, zIndex: -1 }
  public info = cloneDeep(VHorizontalNegativeBarInfo)
  public option = {
    label: '正负条形图',
    chartOption: cloneDeep(chartOption),
  }
}
