import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { createSankeySeries, createSankeyTooltip } from '../shared/sankeyTheme'

export const VSankeyGradientInfo = {
  name: '渐变桑基图',
  keyName: 'VSankeyGradient',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/sankey-gradient.png`, import.meta.url).href,
}

const nodes = [
  { name: '线索' },
  { name: '销售跟进' },
  { name: '方案报价' },
  { name: '签约成交' },
  { name: '复购' },
]

const links = [
  { source: '线索', target: '销售跟进', value: 82 },
  { source: '销售跟进', target: '方案报价', value: 56 },
  { source: '方案报价', target: '签约成交', value: 32 },
  { source: '签约成交', target: '复购', value: 18 },
]

export const chartOption = {
  tooltip: createSankeyTooltip('{b}: {c}'),
  series: [
    createSankeySeries(nodes, links, {
      nodeWidth: 20,
      nodeGap: 24,
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#60a5fa' },
            { offset: 1, color: '#2563eb' },
          ],
        },
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
      },
      lineStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: 'rgba(96,165,250,0.65)' },
            { offset: 1, color: 'rgba(37,99,235,0.2)' },
          ],
        },
        curveness: 0.5,
        opacity: 1,
      },
    }),
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 420, h: 280, zIndex: -1 }
  public info = cloneDeep(VSankeyGradientInfo)
  public option = {
    label: '渐变桑基图',
    chartOption: cloneDeep(chartOption),
  }
}
