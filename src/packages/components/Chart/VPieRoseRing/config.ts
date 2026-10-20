import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { pieBaseSeries, pieTooltip } from '../shared/pieTheme'

export const VPieRoseRingInfo = {
  name: '玫瑰饼环图',
  keyName: 'VPieRoseRing',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/pie-rose-ring.png`, import.meta.url).href,
}

export const chartOption = {
  backgroundColor: 'transparent',
  tooltip: pieTooltip,
  series: [
    {
      ...pieBaseSeries,
      roseType: 'radius',
      radius: ['14%', '64%'],
      center: ['50%', '50%'],
      startAngle: 90,
      itemStyle: {
        ...pieBaseSeries.itemStyle,
        borderWidth: 0.8,
        borderRadius: 8,
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 300, zIndex: -1 }
  public info = cloneDeep(VPieRoseRingInfo)
  public option = {
    label: '玫瑰饼环图',
    chartOption: cloneDeep(chartOption),
  }
}
