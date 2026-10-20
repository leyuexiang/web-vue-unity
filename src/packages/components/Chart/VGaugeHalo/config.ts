import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VGaugeHaloInfo = {
  name: '光晕仪表盘',
  keyName: 'VGaugeHalo',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/gauge-halo.png`, import.meta.url).href,
}

export const chartOption = {
  series: [
    {
      type: 'gauge',
      min: 0,
      max: 100,
      startAngle: 220,
      endAngle: -40,
      radius: '96%',
      pointer: {
        width: 3,
        length: '42%',
        itemStyle: {
          color: '#38BDF8',
        },
      },
      anchor: {
        show: true,
        showAbove: true,
        size: 12,
        itemStyle: {
          color: '#67E8F9',
        },
      },
      axisLine: {
        roundCap: true,
        lineStyle: {
          width: 5,
          color: [
            [0.78, '#60A5FA'],
            [1, 'rgba(14, 165, 233, 0.2)'],
          ],
        },
      },
      splitLine: {
        distance: -10,
        length: 8,
        lineStyle: {
          color: 'rgba(6,182,212,0.55)',
          width: 1.5,
        },
      },
      axisTick: {
        distance: -10,
        splitNumber: 4,
        length: 4,
        lineStyle: {
          color: 'rgba(6,182,212,0.4)',
          width: 1,
        },
      },
      axisLabel: {
        show: false,
      },
      detail: {
        valueAnimation: true,
        fontSize: 20,
        offsetCenter: [0, '50%'],
        color: '#000000',
      },
      title: {
        show: false,
      },
      data: [{ value: 79 }],
    },
    {
      type: 'gauge',
      radius: '68%',
      startAngle: 220,
      endAngle: -40,
      pointer: { show: false },
      progress: { show: false },
      axisLine: {
        lineStyle: {
          width: 18,
          color: [[1, 'rgba(37, 99, 235, 0.15)']],
        },
      },
      splitLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      detail: { show: false },
      data: [{ value: 79 }],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 240, zIndex: -1 }
  public info = cloneDeep(VGaugeHaloInfo)
  public option = {
    label: '光晕仪表盘',
    chartOption: cloneDeep(chartOption),
  }
}
