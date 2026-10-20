export const gaugeTextColor = '#000000'
export const gaugeMinorTickColor = 'rgba(59, 130, 246, 0.45)'
export const gaugeAxisLineColor = 'rgba(37, 99, 235, 0.18)'
export const gaugeSplitLineColor = 'rgba(37, 99, 235, 0.55)'
export const gaugeLabelDistance = 16
export const gaugeTickDistance = -10
export const gaugeSplitDistance = -10

export const createGaugeAxisLabel = (color = gaugeTextColor, distance = gaugeLabelDistance) => ({
  color,
  distance,
  fontSize: 10,
})

export const createGaugeAxisTick = (color = gaugeMinorTickColor, length = 6, distance = gaugeTickDistance) => ({
  distance,
  splitNumber: 4,
  lineStyle: {
    color,
    width: 1,
  },
  length,
})

export const createGaugeSplitLine = (
  color = gaugeSplitLineColor,
  length = 12,
  distance = gaugeSplitDistance,
) => ({
  distance,
  length,
  lineStyle: {
    color,
    width: 2,
  },
})

export const createGaugePointer = (color = '#2563eb', width = 4, length = '55%') => ({
  width,
  length,
  itemStyle: {
    color,
  },
})

export const createGaugeProgress = (color = '#2563eb', width = 10) => ({
  show: true,
  overlap: false,
  roundCap: true,
  clip: false,
  itemStyle: {
    color,
  },
  width,
})

export const createGaugeAnchor = (color = '#2563eb', size = 10) => ({
  show: true,
  showAbove: true,
  size,
  itemStyle: {
    color,
    borderColor: color,
    borderWidth: 0,
  },
})
