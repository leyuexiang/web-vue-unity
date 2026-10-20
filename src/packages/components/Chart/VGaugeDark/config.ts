import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createGaugeAxisLabel,
  createGaugeAxisTick,
  createGaugeSplitLine,
} from '../shared/gaugeTheme'

export const VGaugeDarkInfo = {
  name: '深盘仪表盘',
  keyName: 'VGaugeDark',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/gauge-dark.png`, import.meta.url).href,
}

export const chartOption = {
  series: [
    {
      type: 'gauge',
      min: 0,
      max: 100,
      startAngle: 225,
      endAngle: -45,
      radius: '95%',
      progress: {
        show: true,
        roundCap: true,
        width: 6,
        itemStyle: {
          color: '#2563EB',
        },
      },
      pointer: {
        width: 4,
        length: '52%',
        itemStyle: {
          color: '#2563EB',
        },
      },
      anchor: {
        show: false,
      },
      axisLine: {
        lineStyle: {
          width: 6,
          color: [[1, 'rgba(37,99,235,0.22)']],
        },
      },
      splitLine: createGaugeSplitLine('rgba(37,99,235,0.45)', 9, -8),
      axisTick: createGaugeAxisTick('rgba(37,99,235,0.3)', 5, -8),
      axisLabel: createGaugeAxisLabel('#000000', 18),
      detail: {
        valueAnimation: true,
        fontSize: 20,
        offsetCenter: [0, '50%'],
        color: '#000000',
      },
      data: [{ value: 79 }],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 240, zIndex: -1 }
  public info = cloneDeep(VGaugeDarkInfo)
  public option = {
    label: '深盘仪表盘',
    chartOption: cloneDeep(chartOption),
  }
}
