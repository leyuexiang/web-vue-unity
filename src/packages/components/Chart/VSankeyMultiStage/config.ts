import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { createSankeySeries, createSankeyTooltip } from '../shared/sankeyTheme'

export const VSankeyMultiStageInfo = {
  name: '多阶段桑基图',
  keyName: 'VSankeyMultiStage',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/sankey-multi-stage.png`, import.meta.url).href,
}

const nodes = [
  { name: '采购' },
  { name: '仓储' },
  { name: '生产A线' },
  { name: '生产B线' },
  { name: '质检' },
  { name: '渠道一' },
  { name: '渠道二' },
  { name: '终端客户' },
]

const links = [
  { source: '采购', target: '仓储', value: 120 },
  { source: '仓储', target: '生产A线', value: 68 },
  { source: '仓储', target: '生产B线', value: 44 },
  { source: '生产A线', target: '质检', value: 60 },
  { source: '生产B线', target: '质检', value: 38 },
  { source: '质检', target: '渠道一', value: 54 },
  { source: '质检', target: '渠道二', value: 32 },
  { source: '渠道一', target: '终端客户', value: 49 },
  { source: '渠道二', target: '终端客户', value: 28 },
]

export const chartOption = {
  tooltip: createSankeyTooltip(),
  series: [
    createSankeySeries(nodes, links, {
      nodeWidth: 16,
      nodeGap: 14,
      levels: [
        { depth: 0, itemStyle: { color: '#1d4ed8' } },
        { depth: 1, itemStyle: { color: '#2563eb' } },
        { depth: 2, itemStyle: { color: '#3b82f6' } },
        { depth: 3, itemStyle: { color: '#60a5fa' } },
      ],
    }),
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 460, h: 300, zIndex: -1 }
  public info = cloneDeep(VSankeyMultiStageInfo)
  public option = {
    label: '多阶段桑基图',
    chartOption: cloneDeep(chartOption),
  }
}
