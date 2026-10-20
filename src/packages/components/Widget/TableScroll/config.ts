import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import type { TablePlusOption } from '../shared/tableTypes'

export const VTableScrollInfo = {
  name: '滚动表格',
  keyName: 'VTableScroll',
  packageName: 'Widget',
  icon: new URL('../assets/images/table-scrollboard.png', import.meta.url).href,
}

const createDefaultSource = () => [
  { key: 0, sequence: '1', time: '2023-06-17 13:50', content: '事件内容', status: '处理中' },
  { key: 1, sequence: '2', time: '2023-06-17 13:51', content: '事件内容', status: '已完成' },
  { key: 2, sequence: '3', time: '2023-06-17 13:52', content: '事件内容', status: '待处理' },
  { key: 3, sequence: '4', time: '2023-06-17 13:53', content: '事件内容', status: '已完成' },
  { key: 4, sequence: '5', time: '2023-06-17 13:54', content: '事件内容', status: '处理中' },
  { key: 5, sequence: '6', time: '2023-06-17 13:55', content: '事件内容', status: '处理中' },
  { key: 6, sequence: '7', time: '2023-06-17 13:57', content: '事件内容', status: '待处理' },
  { key: 7, sequence: '8', time: '2023-06-17 13:58', content: '事件内容', status: '处理中' },
  { key: 8, sequence: '9', time: '2023-06-17 13:59', content: '事件内容', status: '处理中' },
  { key: 9, sequence: '10', time: '2023-06-17 14:00', content: '事件内容', status: '已完成' },
  { key: 10, sequence: '11', time: '2023-06-17 14:01', content: '事件内容', status: '处理中' },
  { key: 11, sequence: '12', time: '2023-06-17 14:02', content: '事件内容', status: '已完成' },
]

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 600, h: 260, zIndex: -1 }
  public info = cloneDeep(VTableScrollInfo)
  public option: TablePlusOption = {
    variant: 'scroll',
    dataset: {
      dimensions: [
        { title: '序号', key: 'sequence', width: 60 },
        { title: '时间', key: 'time', width: 112 },
        { title: '事件内容', key: 'content', width: 112 },
        { title: '处理状态', key: 'status' },
      ],
      source: createDefaultSource(),
    },
    align: 'left',
    rowHeight: 32,
    colWidth: 90,
    maxNum: 5,
    swiper: true,
    waitTime: 2,
    carousel: 'single',
    style: {
      colHeaders: true,
      bordered: false,
      hLine: true,
      vLine: false,
      stripe: false,
      stripeColor: '#407FFF1F',
      background: '#10131A',
      headerBackground: '#303746',
      textColor: '#FFFFFF',
      headerTextColor: '#FFFFFF',
      borderColor: '#407FFF66',
      fontSize: 14,
    },
    cellTextColors: {
      status: {
        处理中: '#05CFF9FF',
        已完成: '#B3D1FFFF',
        待处理: '#E6A82EFF',
      },
    },
    label: '滚动表格',
  }
}
