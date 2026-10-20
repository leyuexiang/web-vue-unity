import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { pieBaseSeries, pieTooltip } from '../shared/pieTheme'

export const VDonutSegmentedInfo = {
  name: '分段环图',
  keyName: 'VDonutSegmented',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/pie-donut-segmented.png`, import.meta.url).href,
}

export const chartOption = {
  backgroundColor: 'transparent',
  tooltip: pieTooltip,
  series: [
    {
      ...pieBaseSeries,
      radius: ['46%', '66%'],
      center: ['50%', '50%'],
      startAngle: 92,
      padAngle: 3,
      itemStyle: {
        ...pieBaseSeries.itemStyle,
        borderWidth: 0.8,
        borderRadius: 6,
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 300, zIndex: -1 }
  public info = cloneDeep(VDonutSegmentedInfo)
  public option = {
    label: '分段环图',
    chartOption: cloneDeep(chartOption),
  }
}
