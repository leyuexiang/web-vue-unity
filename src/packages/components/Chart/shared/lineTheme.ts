export const lineTextColor = '#000000'
export const lineLegendColor = '#000000'
export const lineSplitColor = 'rgba(0,0,0,0.16)'
export const lineAxisColor = 'rgba(0,0,0,0.4)'

export const lineColors = ['#3b82f6', '#22d3ee', '#f59e0b']

export const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月']
export const realtimeLabels = ['10:43:56', '10:44:02', '10:44:08', '10:44:14', '10:44:20', '10:44:26']
export const hourLabels = ['0', '6', '12', '18', '24']

export const defaultLineGrid = {
  top: 28,
  left: 42,
  right: 22,
  bottom: 30,
  containLabel: true,
}

export const defaultLineTooltip = {
  trigger: 'axis',
}

export const defaultLineLegend = {
  top: 0,
  textStyle: {
    color: lineLegendColor,
  },
}

export const createCategoryAxis = (data: string[], extra: Record<string, unknown> = {}) => ({
  type: 'category',
  boundaryGap: false,
  data,
  axisTick: {
    show: false,
  },
  axisLabel: {
    color: lineTextColor,
  },
  axisLine: {
    lineStyle: {
      color: lineAxisColor,
    },
  },
  ...extra,
})

export const createValueAxis = (extra: Record<string, unknown> = {}) => ({
  type: 'value',
  splitNumber: 4,
  axisTick: {
    show: false,
  },
  axisLabel: {
    color: lineTextColor,
  },
  axisLine: {
    show: false,
  },
  splitLine: {
    lineStyle: {
      color: lineSplitColor,
    },
  },
  ...extra,
})
