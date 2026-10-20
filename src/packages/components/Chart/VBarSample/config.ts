import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createCategoryAxis,
  createValueAxis,
  defaultLineGrid,
  defaultLineTooltip,
} from '../shared/lineTheme'

export const VBarSampleInfo = {
  name: '正负柱状图',
  keyName: 'VBarSample',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/bar-column-negative.png`, import.meta.url).href,
}

export const chartOption = {
  tooltip: defaultLineTooltip,
  grid: defaultLineGrid,
  xAxis: createCategoryAxis(['Mon', 'Tue', 'Wed', 'Thu'], {
    boundaryGap: true,
  }),
  yAxis: createValueAxis(),
  series: [
    {
      type: 'bar',
      data: [
        ['Mon', 33],
        ['Tue', -44],
        ['Wed', 55],
        ['Thu', 66],
      ],
      showBackground: true,
      backgroundStyle: {
        color: 'rgba(0, 0, 255, 0.12)',
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 260, zIndex: -1 }
  public info = cloneDeep(VBarSampleInfo)
  public option = {
    label: '正负柱状图',
    chartOption: cloneDeep(chartOption),
  }
}
