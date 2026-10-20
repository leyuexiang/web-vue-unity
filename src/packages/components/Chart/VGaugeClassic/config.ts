import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createGaugeAxisLabel,
  createGaugeAxisTick,
  createGaugePointer,
  createGaugeSplitLine,
  gaugeTextColor,
} from '../shared/gaugeTheme'

export const VGaugeClassicInfo = {
  name: '经典仪表盘',
  keyName: 'VGaugeClassic',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/gauge-classic.png`, import.meta.url).href,
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
      axisLine: {
        lineStyle: {
          width: 6,
          color: [
            [0.6, '#2563EB'],
            [1, 'rgba(37,99,235,0.2)'],
          ],
        },
      },
      axisTick: createGaugeAxisTick('rgba(100,116,139,0.5)', 4, -8),
      splitLine: createGaugeSplitLine('rgba(100,116,139,0.65)', 10, -8),
      axisLabel: createGaugeAxisLabel(gaugeTextColor, 18),
      pointer: createGaugePointer('#2563EB', 4, '62%'),
      anchor: {
        show: false,
      },
      detail: {
        valueAnimation: true,
        fontSize: 18,
        offsetCenter: [0, '52%'],
        color: gaugeTextColor,
      },
      data: [{ value: 57 }],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 240, zIndex: -1 }
  public info = cloneDeep(VGaugeClassicInfo)
  public option = {
    label: '经典仪表盘',
    chartOption: cloneDeep(chartOption),
  }
}
