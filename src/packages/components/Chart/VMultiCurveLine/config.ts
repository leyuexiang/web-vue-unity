import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineLegend,
  defaultLineTooltip,
  monthLabels,
} from '../shared/lineTheme'

export const VMultiCurveLineInfo = {
  name: '多曲线图',
  keyName: 'VMultiCurveLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-multi-curve.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  legend: {
    ...defaultLineLegend,
    data: ['A线', 'B线'],
  },
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(monthLabels),
  yAxis: createValueAxis(),
  series: [
    {
      name: 'A线',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: [42, 18, 30, 56, 28, 36],
    },
    {
      name: 'B线',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: [28, 26, 42, 54, 32, 38],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 220, zIndex: -1 }
  public info = cloneDeep(VMultiCurveLineInfo)
  public option = {
    label: '多曲线图',
    chartOption: cloneDeep(chartOption),
  }
}
