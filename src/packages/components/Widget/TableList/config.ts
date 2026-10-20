import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import type { TableListOption } from '../shared/tableTypes'

export const VTableListInfo = {
  name: '滚动排名列表',
  keyName: 'VTableList',
  packageName: 'Widget',
  icon: new URL(`../assets/images/tables-list.png`, import.meta.url).href,
}

const createDefaultDataset = () => [
  { name: '荣成', value: 26700 },
  { name: '河南', value: 20700 },
  { name: '河北', value: 18700 },
  { name: '徐州', value: 17800 },
  { name: '漯河', value: 16756 },
  { name: '三门峡', value: 12343 },
  { name: '郑州', value: 9822 },
  { name: '周口', value: 8912 },
  { name: '濮阳', value: 6834 },
  { name: '信阳', value: 5875 },
  { name: '新乡', value: 3832 },
  { name: '大同', value: 1811 },
]

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 500, h: 300, zIndex: -1 }
  public info = cloneDeep(VTableListInfo)
  /**
   * 保留旧排名列表的核心配置语义。
   * dataset 只保存名称和数值，动态数据进入时由表格运行时统一转换，不在组件里重复猜字段。
   */
  public option: TableListOption = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    indexFontFamily: '',
    leftFontFamily: '',
    rightFontFamily: '',
    dataset: createDefaultDataset(),
    rowNum: 5,
    waitTime: 2,
    unit: '',
    sort: true,
    color: '#1370fb',
    textColor: '#CDD2F8FF',
    borderColor: '#1370fb80',
    carousel: 'single',
    indexFontSize: 12,
    leftFontSize: 12,
    rightFontSize: 12,
    label: '滚动排名列表',
  }
}
