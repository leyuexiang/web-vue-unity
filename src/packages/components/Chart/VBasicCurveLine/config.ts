import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
  monthLabels,
} from '../shared/lineTheme'

export const VBasicCurveLineInfo = {
  name: '基础曲线图',
  keyName: 'VBasicCurveLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-basic-curve.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(monthLabels),
  yAxis: createValueAxis(),
  series: [
    {
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: [22, 15, 12, 28, 44, 78],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 220, zIndex: -1 }
  public info = cloneDeep(VBasicCurveLineInfo)
  public option = {
    label: '基础曲线图',
    chartOption: cloneDeep(chartOption),
  }
}
