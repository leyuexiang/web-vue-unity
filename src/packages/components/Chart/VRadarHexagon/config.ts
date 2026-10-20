import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VRadarHexagonInfo = {
  name: '六边形雷达图',
  keyName: 'VRadarHexagon',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/radar-hexagon.png`, import.meta.url).href,
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
    shape: 'polygon',
    indicator,
    splitNumber: 5,
    axisName: {
      color: '#F3F4F6',
      fontSize: 14,
      fontWeight: 600,
    },
    axisLine: {
      lineStyle: {
        color: 'rgba(148, 163, 184, 0.35)',
      },
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(100, 116, 139, 0.55)',
        width: 1.2,
      },
    },
    splitArea: {
      areaStyle: {
        color: [
          'rgba(30, 41, 59, 0.12)',
          'rgba(30, 41, 59, 0.2)',
          'rgba(30, 41, 59, 0.28)',
          'rgba(30, 41, 59, 0.36)',
          'rgba(30, 41, 59, 0.44)',
        ],
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
        color: 'rgba(59, 130, 246, 0.18)',
      },
      data: [
        {
          value: [68, 52, 61, 78, 90, 84],
          name: '团队 A',
          lineStyle: {
            color: '#3B82F6',
          },
        },
        {
          value: [90, 79, 81, 62, 86, 88],
          name: '团队 B',
          itemStyle: {
            color: '#22D3EE',
          },
          lineStyle: {
            color: '#22D3EE',
          },
          areaStyle: {
            color: 'rgba(34, 211, 238, 0.12)',
          },
        },
      ],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 300, zIndex: -1 }
  public info = cloneDeep(VRadarHexagonInfo)
  public option = {
    label: '六边形雷达图',
    chartOption: cloneDeep(chartOption),
  }
}
