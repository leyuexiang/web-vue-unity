import type { ChartPanelSchema } from './chartConfigTypes'

const lineKeys = new Set([
  'VLine',
  'VLineSample',
  'VLineTrend',
  'VBasicCurveLine',
  'VCurveTrendLine',
  'VGradientCurveLine',
  'VMultiLine',
  'VMultiCurveLine',
  'VStepLine',
  'VDoubleYAxisLine',
  'VAreaBasicLine',
  'VAreaSmoothLine',
  'VAreaGradientLine',
  'VAreaDualLine',
  'VAreaStackedLine',
])

const lineLegendKeys = new Set([
  'VMultiLine',
  'VMultiCurveLine',
  'VDoubleYAxisLine',
  'VAreaDualLine',
  'VAreaStackedLine',
])

const barKeys = new Set([
  'VBar',
  'VBarSample',
  'VGradientBar',
  'VGroupedBar',
  'VStackedBar',
  'VNegativeBar',
  'VHorizontalBar',
  'VHorizontalGroupedBar',
  'VHorizontalNegativeBar',
  'VHorizontalStackedBar',
])

const barLegendKeys = new Set([
  'VGroupedBar',
  'VStackedBar',
  'VHorizontalGroupedBar',
  'VHorizontalStackedBar',
])

const pieKeys = new Set([
  'VPieSample',
  'VPieSolid',
  'VPieRoseRing',
  'VDonutSmooth',
  'VDonutSegmented',
])

const gaugeKeys = new Set([
  'VGaugeClassic',
  'VGaugeCyan',
  'VGaugeDark',
  'VGaugeHalo',
  'VGaugeNeon',
  'VGaugeSegmented',
])

const radarKeys = new Set(['VRadarCircle', 'VRadarHexagon'])

const sankeyKeys = new Set([
  'VSankeyBasic',
  'VSankeyBiDirectional',
  'VSankeyEnergy',
  'VSankeyGradient',
  'VSankeyMultiStage',
])

const treemapKeys = new Set(['VBasicTreemap'])

const seriesLabelMap = {
  line: '\u6298\u7ebf\u56fe',
  area: '\u9762\u79ef\u56fe',
  bar: '\u67f1\u72b6\u56fe',
  pie: '\u997c\u56fe',
  gauge: '\u4eea\u8868\u76d8',
  radar: '\u96f7\u8fbe\u56fe',
  sankey: '\u6851\u57fa\u56fe',
  treemap: '\u77e9\u5f62\u6811\u56fe',
  chart: '\u56fe\u8868',
} as const

export const getChartPanelSchema = (chartKey: string): ChartPanelSchema => {
  if (lineKeys.has(chartKey)) {
    const isAreaChart = chartKey.includes('Area')

    return {
      chartKey,
      family: 'line',
      seriesLabel: isAreaChart ? seriesLabelMap.area : seriesLabelMap.line,
      supports: {
        title: true,
        grid: true,
        legend: lineLegendKeys.has(chartKey),
        xAxis: true,
        yAxis: true,
        visualMap: false,
        radar: false,
      },
      flags: {
        area: isAreaChart,
        multiYAxis: chartKey === 'VDoubleYAxisLine',
      },
    }
  }

  if (barKeys.has(chartKey)) {
    return {
      chartKey,
      family: 'bar',
      seriesLabel: seriesLabelMap.bar,
      supports: {
        title: true,
        grid: true,
        legend: barLegendKeys.has(chartKey),
        xAxis: true,
        yAxis: true,
        visualMap: false,
        radar: false,
      },
      flags: {
        horizontalBar: chartKey.includes('Horizontal'),
      },
    }
  }

  if (pieKeys.has(chartKey)) {
    return {
      chartKey,
      family: 'pie',
      seriesLabel: seriesLabelMap.pie,
      supports: {
        title: true,
        grid: false,
        legend: true,
        xAxis: false,
        yAxis: false,
        visualMap: false,
        radar: false,
      },
      flags: {
        pieLike: true,
      },
    }
  }

  if (gaugeKeys.has(chartKey)) {
    return {
      chartKey,
      family: 'gauge',
      seriesLabel: seriesLabelMap.gauge,
      supports: {
        title: true,
        grid: false,
        legend: false,
        xAxis: false,
        yAxis: false,
        visualMap: false,
        radar: false,
      },
      flags: {
        gaugeLike: true,
      },
    }
  }

  if (radarKeys.has(chartKey)) {
    return {
      chartKey,
      family: 'radar',
      seriesLabel: seriesLabelMap.radar,
      supports: {
        title: true,
        grid: false,
        legend: true,
        xAxis: false,
        yAxis: false,
        visualMap: false,
        radar: true,
      },
      flags: {},
    }
  }

  if (sankeyKeys.has(chartKey)) {
    return {
      chartKey,
      family: 'sankey',
      seriesLabel: seriesLabelMap.sankey,
      supports: {
        title: true,
        grid: false,
        legend: false,
        xAxis: false,
        yAxis: false,
        visualMap: false,
        radar: false,
      },
      flags: {
        sankeyLike: true,
      },
    }
  }

  if (treemapKeys.has(chartKey)) {
    return {
      chartKey,
      family: 'treemap',
      seriesLabel: seriesLabelMap.treemap,
      supports: {
        title: true,
        grid: false,
        legend: false,
        xAxis: false,
        yAxis: false,
        visualMap: false,
        radar: false,
      },
      flags: {
        treemapLike: true,
      },
    }
  }

  return {
    chartKey,
    family: 'line',
    seriesLabel: seriesLabelMap.chart,
    supports: {
      title: true,
      grid: true,
      legend: true,
      xAxis: true,
      yAxis: true,
      visualMap: false,
      radar: false,
    },
    flags: {},
  }
}
