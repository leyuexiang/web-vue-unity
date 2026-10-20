import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
  lineAxisColor,
  lineTextColor,
} from '../shared/lineTheme'

export const VLineSampleInfo = {
  name: '平滑折线图',
  keyName: 'VLineSample',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-smooth.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  grid: defaultLineGrid,
  xAxis: {
    type: 'time',
    axisTick: {
      show: false,
    },
    axisLabel: {
      color: lineTextColor,
    },
    axisLine: {
      lineStyle: {
        color: lineAxisColor,
      },
    },
  },
  yAxis: createValueAxis({
    boundaryGap: [0, '100%'],
  }),
  series: [
    {
      name: '模拟数据',
      type: 'line',
      smooth: true,
      data: [
        [Date.UTC(1970, 9, 29), 0],
        [Date.UTC(1970, 10, 9), 0],
        [Date.UTC(1970, 11, 1), 6],
        [Date.UTC(1971, 0, 1), 6],
        [Date.UTC(1971, 0, 10), 6],
        [Date.UTC(1971, 1, 19), 0],
        [Date.UTC(1971, 2, 25), 0],
        [Date.UTC(1971, 3, 19), 3],
        [Date.UTC(1971, 3, 30), 3],
        [Date.UTC(1971, 4, 14), 3],
        [Date.UTC(1971, 4, 24), 0],
        [Date.UTC(1971, 5, 10), 0],
      ],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 260, zIndex: -1 }
  public info = cloneDeep(VLineSampleInfo)
  public option = {
    label: '平滑折线图',
    chartOption: cloneDeep(chartOption),
  }
}
