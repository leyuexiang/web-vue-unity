import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { pieBaseSeries, pieTooltip } from '../shared/pieTheme'

export const VDonutSmoothInfo = {
  name: '平滑环图',
  keyName: 'VDonutSmooth',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/pie-donut-smooth.png`, import.meta.url).href,
}

export const chartOption = {
  backgroundColor: 'transparent',
  tooltip: pieTooltip,
  series: [
    {
      ...pieBaseSeries,
      radius: ['44%', '66%'],
      center: ['50%', '50%'],
      startAngle: 90,
      itemStyle: {
        ...pieBaseSeries.itemStyle,
        borderWidth: 0,
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 300, zIndex: -1 }
  public info = cloneDeep(VDonutSmoothInfo)
  public option = {
    label: '平滑环图',
    chartOption: cloneDeep(chartOption),
  }
}
