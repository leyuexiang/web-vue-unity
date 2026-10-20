import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VPieSampleInfo = {
  name: '基础饼状图',
  keyName: 'VPieSample',
  packageName: 'Chart',
  icon: new URL(`../assets/images/figma/pie.png`, import.meta.url).href,
}

export const chartOption = {
  title: {
    text: '某站点用户访问来源',
    subtext: '纯属虚构',
    left: 'center',
  },
  tooltip: {
    trigger: 'item',
  },
  legend: {
    orient: 'vertical',
    left: 'left',
  },
  series: [
    {
      name: '访问来源',
      type: 'pie',
      radius: '55%',
      center: ['50%', '60%'],
      data: [
        { value: 335, name: '直接访问' },
        { value: 310, name: '邮件营销' },
        { value: 234, name: '联盟广告' },
        { value: 135, name: '视频广告' },
        { value: 1548, name: '搜索引擎' },
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
  ],
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 360, h: 300, zIndex: -1 }
  public info = cloneDeep(VPieSampleInfo)
  public option = {
    label: '基础饼状图',
    chartOption: cloneDeep(chartOption),
  }
}
