import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
  hourLabels,
} from '../shared/lineTheme'

export const VGradientCurveLineInfo = {
  name: '渐变曲线图',
  keyName: 'VGradientCurveLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-gradient.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(hourLabels),
  yAxis: createValueAxis({
    min: 0,
    max: 100,
  }),
  series: [
    {
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 2,
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59,130,246,0.45)' },
            { offset: 1, color: 'rgba(59,130,246,0.02)' },
          ],
        },
      },
      data: [32, 24, 16, 18, 42, 46, 46, 46, 45],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 220, zIndex: -1 }
  public info = cloneDeep(VGradientCurveLineInfo)
  public option = {
    label: '渐变曲线图',
    chartOption: cloneDeep(chartOption),
  }
}
