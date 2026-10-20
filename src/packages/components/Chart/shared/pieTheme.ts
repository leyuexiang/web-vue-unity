const chartPalette = ['#4E83FF', '#46B9D8', '#3198B7', '#3FC46C', '#2AA85E']

const chartData = [
  { value: 18, name: '2D' },
  { value: 24, name: '3D' },
  { value: 28, name: '大屏' },
  { value: 20, name: '物联网' },
  { value: 16, name: '图形库' },
]

export const piePalette = chartPalette

export const pieSeriesData = chartData.map((item, index) => ({
  ...item,
  itemStyle: {
    color: chartPalette[index % chartPalette.length],
  },
}))

export const pieTooltip = {
  trigger: 'item',
}

export const pieLabel = {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 600,
}

export const pieLabelLine = {
  length: 16,
  length2: 20,
  smooth: false,
  lineStyle: {
    width: 1.5,
  },
}

export const pieBaseSeries = {
  type: 'pie',
  clockwise: true,
  avoidLabelOverlap: true,
  minAngle: 6,
  itemStyle: {
    borderColor: '#1F2734',
    borderWidth: 1,
  },
  label: pieLabel,
  labelLine: pieLabelLine,
  data: pieSeriesData,
}
