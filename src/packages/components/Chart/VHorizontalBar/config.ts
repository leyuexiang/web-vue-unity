import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  barGrid,
  barMonthLabels,
  barPrimaryColor,
  createHorizontalCategoryAxis,
  createHorizontalValueAxis,
  horizontalBarTooltip,
} from '../shared/barTheme'

export const VHorizontalBarInfo = {
  name: '基础条形图',
  keyName: 'VHorizontalBar',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/bar.png`, import.meta.url).href,
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
      barWidth: 8,
      data: [88, 72, 56, 22, 20, 26],
      itemStyle: {
        color: barPrimaryColor,
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 420, h: 260, zIndex: -1 }
  public info = cloneDeep(VHorizontalBarInfo)
  public option = {
    label: '基础条形图',
    chartOption: cloneDeep(chartOption),
  }
}
