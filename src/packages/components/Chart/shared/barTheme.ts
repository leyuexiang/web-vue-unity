export const barMonthLabels = ['6月', '5月', '4月', '3月', '2月', '1月']

export const barGrid = {
  top: 20,
  left: 28,
  right: 24,
  bottom: 18,
  containLabel: true,
}

export const barAxisTextColor = 'rgba(255,255,255,0.68)'
export const barAxisLineColor = 'rgba(255,255,255,0.22)'
export const barSplitLineColor = 'rgba(255,255,255,0.08)'

export const barPrimaryColor = '#4F83FF'
export const barSecondaryColor = '#47C0DE'

export const createHorizontalValueAxis = (extra: Record<string, unknown> = {}) => ({
  type: 'value',
  axisTick: {
    show: false,
  },
  axisLabel: {
    color: barAxisTextColor,
  },
  axisLine: {
    show: false,
  },
  splitLine: {
    lineStyle: {
      color: barSplitLineColor,
    },
  },
  ...extra,
})

export const createHorizontalCategoryAxis = (
  data: string[] = barMonthLabels,
  extra: Record<string, unknown> = {},
) => ({
  type: 'category',
  data,
  axisTick: {
    show: false,
  },
  axisLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: 600,
  },
  axisLine: {
    lineStyle: {
      color: barAxisLineColor,
    },
  },
  ...extra,
})

export const horizontalBarTooltip = {
  trigger: 'axis',
  axisPointer: {
    type: 'shadow',
  },
}

