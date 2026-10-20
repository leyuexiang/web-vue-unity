export const sankeyLabelColor = '#000000'
export const sankeyLinkOpacity = 0.35
export const sankeyNodeBorderColor = 'rgba(255,255,255,0.9)'

export const createSankeyTooltip = (formatter?: string) => ({
  trigger: 'item',
  triggerOn: 'mousemove',
  ...(formatter ? { formatter } : {}),
})

export const createSankeySeries = (
  nodes: Array<Record<string, unknown>>,
  links: Array<Record<string, unknown>>,
  extra: Record<string, unknown> = {},
) => ({
  type: 'sankey',
  data: nodes,
  links,
  emphasis: {
    focus: 'adjacency',
  },
  nodeAlign: 'justify',
  draggable: true,
  left: '4%',
  top: '6%',
  right: '4%',
  bottom: '6%',
  lineStyle: {
    color: 'source',
    curveness: 0.5,
    opacity: sankeyLinkOpacity,
  },
  label: {
    color: sankeyLabelColor,
    fontSize: 12,
  },
  itemStyle: {
    borderWidth: 1,
    borderColor: sankeyNodeBorderColor,
  },
  ...extra,
})
