import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineLegend,
  defaultLineTooltip,
} from '../shared/lineTheme'

export const VGroupedBarInfo = {
  name: '分组柱状图',
  keyName: 'VGroupedBar',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/bar-column-grouped.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  legend: {
    ...defaultLineLegend,
    data: ['计划', '实际'],
  },
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(['1月', '2月', '3月', '4月', '5月', '6月'], {
    boundaryGap: true,
  }),
  yAxis: createValueAxis({
    min: 0,
    max: 100,
  }),
  series: [
    {
      name: '计划',
      type: 'bar',
      barMaxWidth: 16,
      data: [96, 2, 52, 22, 42, 34],
      itemStyle: {
        color: '#4F83FF',
      },
    },
    {
      name: '实际',
      type: 'bar',
      barMaxWidth: 16,
      data: [58, 68, 66, 68, 22, 67],
      itemStyle: {
        color: '#47C0DE',
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 340, h: 240, zIndex: -1 }
  public info = cloneDeep(VGroupedBarInfo)
  public option = {
    label: '分组柱状图',
    chartOption: cloneDeep(chartOption),
  }
}
