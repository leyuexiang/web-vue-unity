import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import {
  createBasicTreemapLevel,
  createTreemapLabelFormatter,
  treemapLabelColor,
} from '../shared/treemapTheme'

export const VBasicTreemapInfo = {
  name: '基础矩形树图',
  keyName: 'VBasicTreemap',
  packageName: 'Chart',
  // 当前没有对应的 Figma 导出资源，使用专用透明矢量缩略图，避免伪装成设计稿资产。
  icon: new URL('../assets/images/treemap-basic.svg', import.meta.url).href,
}

/**
 * 基础矩形树图遵循 ECharts 官方 name/value 节点协议：一个 value 同时决定面积和标签数值。
 * 不再用双值数组人为拆分布局值与展示值，确保默认数据、静态编辑和接口数据语义一致。
 */
const treemapData = [
  { name: '当归', value: 580 },
  { name: '党参', value: 320 },
  { name: '黄芪', value: 280 },
  { name: '大黄', value: 200 },
  { name: '姜', value: 12 },
  // 参考图最右侧为纯色窄块；显式关闭标签，避免通用格式化器仍显示数值与单位。
  { name: '', value: 8, label: { show: false } },
]

export const chartOption = {
  backgroundColor: 'transparent',
  tooltip: {
    show: false,
  },
  series: [
    {
      type: 'treemap',
      left: 6,
      top: 6,
      right: 6,
      bottom: 6,
      sort: false,
      // 压低目标宽高比，优先让每个首层节点独占一列，令宽扁容器中的六个节点保持单行排列。
      squareRatio: 0.08,
      roam: false,
      nodeClick: false,
      breadcrumb: {
        show: false,
      },
      visibleMin: 1,
      label: {
        show: true,
        position: 'insideTopLeft',
        distance: 12,
        color: treemapLabelColor,
        fontSize: 18,
        lineHeight: 28,
        // “亩”只是默认示例单位，属性面板会通过可序列化格式化字符串安全修改或清空它。
        formatter: createTreemapLabelFormatter('亩'),
        rich: {
          name: {
            color: treemapLabelColor,
            fontSize: 18,
            fontWeight: 400,
          },
          value: {
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: 700,
          },
          unit: {
            color: '#FFFFFF',
            fontSize: 12,
            padding: [0, 0, 0, 2],
          },
        },
      },
      upperLabel: {
        show: false,
      },
      itemStyle: {
        borderColor: '#26362E',
        borderWidth: 0,
        gapWidth: 3,
      },
      levels: [createBasicTreemapLevel()],
      data: treemapData,
    },
  ],
}

export default class Config extends BaseConfig {
  // 宽扁比例确保首层节点保持单行排列，并与用户提供的参考图尺寸关系一致。
  public attr = { l: 0, t: 0, w: 700, h: 110, zIndex: -1 }
  public info = cloneDeep(VBasicTreemapInfo)
  public option = {
    label: '基础矩形树图',
    chartOption: cloneDeep(chartOption),
  }
}
