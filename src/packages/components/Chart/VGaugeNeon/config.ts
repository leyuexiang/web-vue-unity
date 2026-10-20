import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createGaugeAnchor,
  createGaugeAxisLabel,
  createGaugeAxisTick,
  createGaugePointer,
  createGaugeProgress,
  createGaugeSplitLine,
  gaugeAxisLineColor,
  gaugeTextColor,
} from '../shared/gaugeTheme'

export const VGaugeNeonInfo = {
  name: '霓虹仪表盘',
  keyName: 'VGaugeNeon',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/gauge-neon.png`, import.meta.url).href,
}

export const chartOption = {
  series: [
    {
      type: 'gauge',
      min: 0,
      max: 100,
      startAngle: 210,
      endAngle: -30,
      progress: createGaugeProgress('#2563EB', 8),
      pointer: createGaugePointer('#2563EB', 4, '52%'),
      anchor: createGaugeAnchor('#2563EB', 10),
      axisLine: {
        roundCap: true,
        lineStyle: {
          width: 8,
          color: [[1, gaugeAxisLineColor]],
        },
      },
      axisTick: createGaugeAxisTick('rgba(37,99,235,0.45)', 5, -8),
      splitLine: createGaugeSplitLine('rgba(37,99,235,0.65)', 9, -8),
      axisLabel: createGaugeAxisLabel(gaugeTextColor, 18),
      detail: {
        valueAnimation: true,
        fontSize: 20,
        offsetCenter: [0, '48%'],
        color: gaugeTextColor,
      },
      data: [{ value: 75 }],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 240, zIndex: -1 }
  public info = cloneDeep(VGaugeNeonInfo)
  public option = {
    label: '霓虹仪表盘',
    chartOption: cloneDeep(chartOption),
  }
}
