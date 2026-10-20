import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { createSankeySeries, createSankeyTooltip } from '../shared/sankeyTheme'

export const VSankeyBiDirectionalInfo = {
  name: '双侧流向桑基图',
  keyName: 'VSankeyBiDirectional',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/sankey-bidirectional.png`, import.meta.url).href,
}

const nodes = [
  { name: '华东' },
  { name: '华南' },
  { name: '区域中心' },
  { name: '北京' },
  { name: '上海' },
  { name: '广州' },
  { name: '深圳' },
]

const links = [
  { source: '华东', target: '区域中心', value: 48 },
  { source: '华南', target: '区域中心', value: 42 },
  { source: '区域中心', target: '北京', value: 22 },
  { source: '区域中心', target: '上海', value: 26 },
  { source: '区域中心', target: '广州', value: 18 },
  { source: '区域中心', target: '深圳', value: 24 },
]

export const chartOption = {
  tooltip: createSankeyTooltip(),
  series: [
    createSankeySeries(nodes, links, {
      nodeAlign: 'left',
      nodeWidth: 18,
      nodeGap: 20,
      itemStyle: {
        color: '#0ea5e9',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
      },
      lineStyle: {
        color: 'gradient',
        curveness: 0.55,
        opacity: 0.45,
      },
    }),
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 440, h: 290, zIndex: -1 }
  public info = cloneDeep(VSankeyBiDirectionalInfo)
  public option = {
    label: '双侧流向桑基图',
    chartOption: cloneDeep(chartOption),
  }
}
