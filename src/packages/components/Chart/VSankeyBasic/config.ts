import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { createSankeySeries, createSankeyTooltip } from '../shared/sankeyTheme'

export const VSankeyBasicInfo = {
  name: '基础桑基图',
  keyName: 'VSankeyBasic',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/sankey-basic.png`, import.meta.url).href,
}

const nodes = [
  { name: '流量来源' },
  { name: '广告投放' },
  { name: '自然搜索' },
  { name: '落地页' },
  { name: '注册' },
  { name: '付费' },
]

const links = [
  { source: '流量来源', target: '广告投放', value: 52 },
  { source: '流量来源', target: '自然搜索', value: 38 },
  { source: '广告投放', target: '落地页', value: 46 },
  { source: '自然搜索', target: '落地页', value: 31 },
  { source: '落地页', target: '注册', value: 54 },
  { source: '注册', target: '付费', value: 21 },
]

export const chartOption = {
  tooltip: createSankeyTooltip(),
  series: [
    createSankeySeries(nodes, links, {
      nodeWidth: 18,
      nodeGap: 18,
    }),
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 420, h: 280, zIndex: -1 }
  public info = cloneDeep(VSankeyBasicInfo)
  public option = {
    label: '基础桑基图',
    chartOption: cloneDeep(chartOption),
  }
}
