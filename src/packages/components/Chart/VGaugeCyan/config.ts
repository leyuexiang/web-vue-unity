import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VGaugeCyanInfo = {
  name: '青环仪表盘',
  keyName: 'VGaugeCyan',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/gauge-cyan.png`, import.meta.url).href,
}

export const chartOption = {
  series: [
    {
      type: 'gauge',
      min: 0,
      max: 100,
      startAngle: 225,
      endAngle: -45,
      progress: {
        show: true,
        roundCap: true,
        width: 10,
        itemStyle: {
          color: '#14B8A6',
        },
      },
      pointer: {
        width: 3,
        length: '48%',
        itemStyle: {
          color: '#0F766E',
        },
      },
      anchor: {
        show: true,
        size: 8,
        itemStyle: {
          color: '#14B8A6',
        },
      },
      axisLine: {
        lineStyle: {
          width: 10,
          color: [[1, 'rgba(15,118,110,0.18)']],
        },
      },
      splitLine: {
        distance: -16,
        length: 10,
        lineStyle: {
          color: 'rgba(20,184,166,0.5)',
          width: 1.5,
        },
      },
      axisTick: {
        distance: -16,
        splitNumber: 4,
        length: 5,
        lineStyle: {
          color: 'rgba(20,184,166,0.4)',
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
      data: [{ value: 55 }],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 300, h: 240, zIndex: -1 }
  public info = cloneDeep(VGaugeCyanInfo)
  public option = {
    label: '青环仪表盘',
    chartOption: cloneDeep(chartOption),
  }
}
