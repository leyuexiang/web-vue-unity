import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { createGaugeAxisLabel, createGaugeSplitLine } from '../shared/gaugeTheme'

export const VGaugeSegmentedInfo = {
  name: '分段仪表盘',
  keyName: 'VGaugeSegmented',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/gauge-segmented.png`, import.meta.url).href,
}

export const chartOption = {
  series: [
    {
      type: 'gauge',
      min: 0,
      max: 100,
      splitNumber: 5,
      startAngle: 220,
      endAngle: -40,
      progress: {
        show: true,
        width: 12,
        roundCap: true,
        itemStyle: {
          color: '#3B82F6',
        },
      },
      pointer: {
        width: 4,
        length: '45%',
        itemStyle: {
          color: '#3B82F6',
        },
      },
      anchor: {
        show: true,
        size: 12,
        itemStyle: {
          color: '#3B82F6',
        },
      },
      axisLine: {
        lineStyle: {
          width: 12,
          color: [
            [0.25, 'rgba(59,130,246,0.18)'],
            [0.5, 'rgba(96,165,250,0.22)'],
            [0.75, 'rgba(96,165,250,0.28)'],
            [1, 'rgba(37,99,235,0.12)'],
          ],
        },
      },
      splitLine: createGaugeSplitLine('rgba(37,99,235,0.55)', 12, -12),
      axisTick: {
        show: false,
      },
      axisLabel: createGaugeAxisLabel('#000000', 20),
      detail: {
        valueAnimation: true,
        offsetCenter: [0, '0%'],
        fontSize: 18,
        color: '#000000',
      },
      data: [{ value: 40 }],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 240, zIndex: -1 }
  public info = cloneDeep(VGaugeSegmentedInfo)
  public option = {
    label: '分段仪表盘',
    chartOption: cloneDeep(chartOption),
  }
}
