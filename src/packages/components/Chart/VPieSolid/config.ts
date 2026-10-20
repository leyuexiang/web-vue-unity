import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { pieBaseSeries, pieTooltip } from '../shared/pieTheme'

export const VPieSolidInfo = {
  name: '实心饼图',
  keyName: 'VPieSolid',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/pie-solid.png`, import.meta.url).href,
}

export const chartOption = {
  backgroundColor: 'transparent',
  tooltip: pieTooltip,
  series: [
    {
      ...pieBaseSeries,
      radius: ['0%', '60%'],
      center: ['50%', '50%'],
      startAngle: 90,
      itemStyle: {
        ...pieBaseSeries.itemStyle,
        borderWidth: 0.8,
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 300, zIndex: -1 }
  public info = cloneDeep(VPieSolidInfo)
  public option = {
    label: '实心饼图',
    chartOption: cloneDeep(chartOption),
  }
}
