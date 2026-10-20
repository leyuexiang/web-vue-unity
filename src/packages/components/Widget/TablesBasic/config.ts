import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import type { TableBasicOption } from '../shared/tableTypes'

export const VTablesBasicInfo = {
  name: '基础分页表格',
  keyName: 'VTablesBasic',
  packageName: 'Widget',
  icon: new URL(`../assets/images/tables-basic.png`, import.meta.url).href,
}

const createDefaultSource = () => [
  { key: 0, productName: '产品A1', totalSum: 10, totalAmount: 10 },
  { key: 1, productName: '产品B1', totalSum: 10, totalAmount: 10 },
  { key: 2, productName: '产品C1', totalSum: 10, totalAmount: 10 },
  { key: 3, productName: '产品D1', totalSum: 10, totalAmount: 10 },
  { key: 4, productName: '产品A2', totalSum: 10, totalAmount: 10 },
  { key: 5, productName: '产品D2', totalSum: 10, totalAmount: 10 },
  { key: 6, productName: '产品A3', totalSum: 10, totalAmount: 10 },
]

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 600, h: 300, zIndex: -1 }
  public info = cloneDeep(VTablesBasicInfo)
  /**
   * 基础分页表格保留“列定义 + 数据源”的结构。
   * 运行时接收到动态数据后，只替换 dataset，分页和样式继续沿用用户配置。
   */
  public option: TableBasicOption = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    headerFontFamily: '',
    bodyFontFamily: '',
    searchFontFamily: '',
    paginationFontFamily: '',
    dataset: {
      dimensions: [
        { title: '产品名称', key: 'productName' },
        { title: '产品销量（万）', key: 'totalSum' },
        { title: '销售额（万）', key: 'totalAmount' },
      ],
      source: createDefaultSource(),
    },
    pagination: {
      page: 1,
      pageSize: 5,
    },
    align: 'center',
    style: {
      border: 'on',
      singleColumn: 'off',
      singleLine: 'off',
      bottomBordered: 'on',
      striped: 'on',
      fontSize: 16,
      borderWidth: 0,
      borderColor: 'black',
      borderStyle: 'solid',
    },
    inputShow: 'none',
    label: '基础分页表格',
  }
}
