import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
  monthLabels,
} from '../shared/lineTheme'

export const VStepLineInfo = {
  name: '阶梯折线图',
  keyName: 'VStepLine',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/line-step.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(monthLabels, {
    boundaryGap: true,
  }),
  yAxis: createValueAxis(),
  series: [
    {
      type: 'line',
      step: 'middle',
      symbolSize: 6,
      data: [18, 26, 44, 38, 46, 48],
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 220, zIndex: -1 }
  public info = cloneDeep(VStepLineInfo)
  public option = {
    label: '阶梯折线图',
    chartOption: cloneDeep(chartOption),
  }
}
