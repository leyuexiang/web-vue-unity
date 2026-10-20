import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineLegend,
  defaultLineTooltip,
} from '../shared/lineTheme'

export const VStackedBarInfo = {
  name: '堆叠柱状图',
  keyName: 'VStackedBar',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/bar-column-stacked.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  legend: {
    ...defaultLineLegend,
    data: ['电量', '用量'],
  },
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(['1月', '2月', '3月', '4月', '5月', '6月'], {
    boundaryGap: true,
  }),
  yAxis: createValueAxis({
    min: 0,
    max: 150,
  }),
  series: [
    {
      name: '电量',
      type: 'bar',
      stack: 'total',
      barMaxWidth: 18,
      data: [62, 45, 36, 28, 92, 8],
      itemStyle: {
        color: '#4F83FF',
      },
    },
    {
      name: '用量',
      type: 'bar',
      stack: 'total',
      barMaxWidth: 18,
      data: [34, 48, 54, 46, 8, 72],
      itemStyle: {
        color: '#47C0DE',
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 340, h: 240, zIndex: -1 }
  public info = cloneDeep(VStackedBarInfo)
  public option = {
    label: '堆叠柱状图',
    chartOption: cloneDeep(chartOption),
  }
}
