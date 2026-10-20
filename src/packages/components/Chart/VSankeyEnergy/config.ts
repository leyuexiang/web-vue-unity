import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { createSankeySeries, createSankeyTooltip } from '../shared/sankeyTheme'

export const VSankeyEnergyInfo = {
  name: '能耗分配桑基图',
  keyName: 'VSankeyEnergy',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/sankey-energy.png`, import.meta.url).href,
}

const nodes = [
  { name: '总能耗' },
  { name: '电力' },
  { name: '天然气' },
  { name: '生产设备' },
  { name: '办公区域' },
  { name: '制冷系统' },
  { name: '照明' },
]

const links = [
  { source: '总能耗', target: '电力', value: 86 },
  { source: '总能耗', target: '天然气', value: 34 },
  { source: '电力', target: '生产设备', value: 42 },
  { source: '电力', target: '办公区域', value: 18 },
  { source: '电力', target: '制冷系统', value: 26 },
  { source: '天然气', target: '生产设备', value: 18 },
  { source: '天然气', target: '照明', value: 10 },
]

export const chartOption = {
  tooltip: createSankeyTooltip('{b}: {c} kWh'),
  series: [
    createSankeySeries(nodes, links, {
      nodeWidth: 22,
      nodeGap: 22,
      lineStyle: {
        color: 'source',
        curveness: 0.45,
        opacity: 0.5,
      },
      levels: [
        { depth: 0, itemStyle: { color: '#f59e0b' } },
        { depth: 1, itemStyle: { color: '#fb923c' } },
        { depth: 2, itemStyle: { color: '#facc15' } },
      ],
    }),
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 440, h: 290, zIndex: -1 }
  public info = cloneDeep(VSankeyEnergyInfo)
  public option = {
    label: '能耗分配桑基图',
    chartOption: cloneDeep(chartOption),
  }
}
