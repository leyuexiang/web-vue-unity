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

export const VHorizontalGroupedBarInfo = {
  name: '分组条形图',
  keyName: 'VHorizontalGroupedBar',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/bar-grouped.png`, import.meta.url).href,
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
      barWidth: 6,
      barGap: '35%',
      data: [50, 90, 35, 36, 25, 62],
      itemStyle: {
        color: barPrimaryColor,
      },
    },
    {
      type: 'bar',
      barWidth: 6,
      data: [32, 32, 45, 35, 25, 54],
      itemStyle: {
        color: barSecondaryColor,
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 420, h: 260, zIndex: -1 }
  public info = cloneDeep(VHorizontalGroupedBarInfo)
  public option = {
    label: '分组条形图',
    chartOption: cloneDeep(chartOption),
  }
}
