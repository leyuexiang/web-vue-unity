import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VRadarCircleInfo = {
  name: '圆形雷达图',
  keyName: 'VRadarCircle',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/radar-circle.png`, import.meta.url).href,
}

const indicator = [
  { name: '销售', max: 100 },
  { name: '营销', max: 100 },
  { name: '开发', max: 100 },
  { name: '支持', max: 100 },
  { name: '数据', max: 100 },
  { name: '管理', max: 100 },
]

export const chartOption = {
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
  },
  radar: {
    center: ['50%', '52%'],
    radius: '65%',
    shape: 'circle',
    indicator,
    splitNumber: 5,
    axisName: {
      color: '#F3F4F6',
      fontSize: 14,
      fontWeight: 600,
    },
    axisLine: {
      lineStyle: {
        color: 'rgba(148, 163, 184, 0.32)',
      },
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(100, 116, 139, 0.58)',
        width: 1.2,
      },
    },
    splitArea: {
      areaStyle: {
        color: ['transparent'],
      },
    },
  },
  series: [
    {
      type: 'radar',
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 2,
      },
      itemStyle: {
        color: '#3B82F6',
      },
      areaStyle: {
        color: 'rgba(59, 130, 246, 0.12)',
      },
      data: [
        {
          value: [70, 75, 88, 82, 54, 86],
          name: '团队 A',
          lineStyle: {
            color: '#3B82F6',
          },
        },
        {
          value: [91, 81, 74, 61, 84, 85],
          name: '团队 B',
          itemStyle: {
            color: '#22D3EE',
          },
          lineStyle: {
            color: '#22D3EE',
          },
          areaStyle: {
            color: 'rgba(34, 211, 238, 0.14)',
          },
        },
      ],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 300, zIndex: -1 }
  public info = cloneDeep(VRadarCircleInfo)
  public option = {
    label: '圆形雷达图',
    chartOption: cloneDeep(chartOption),
  }
}
