import { cloneDeep } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import type { TableScrollBoardOption } from '../shared/tableTypes'

export const VTableScrollBoardInfo = {
  name: '轮播列表',
  keyName: 'VTableScrollBoard',
  packageName: 'Widget',
  icon: new URL(`../assets/images/table-scrollboard.png`, import.meta.url).href,
}

const createDefaultDataset = () => [
  ['行1列1', '行1列2', '行1列3'],
  ['行2列1', '行2列2', '行2列3'],
  ['行3列1', '行3列2', '行3列3'],
  ['行4列1', '行4列2', '行4列3'],
  ['行5列1', '行5列2', '行5列3'],
  ['行6列1', '行6列2', '行6列3'],
  ['行7列1', '行7列2', '行7列3'],
  ['行8列1', '行8列2', '行8列3'],
  ['行9列1', '行9列2', '行9列3'],
  ['行10列1', '行10列2', '行10列3'],
]

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 500, h: 300, zIndex: -1 }
  public info = cloneDeep(VTableScrollBoardInfo)
  /**
   * 轮播列表沿用旧配置字段，但去掉旧请求配置对象。
   * 当前项目的数据来源统一进入 dataConfig，再由运行时写回 header 和 dataset。
   */
  public option: TableScrollBoardOption = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    headerFontFamily: '',
    bodyFontFamily: '',
    indexFontFamily: '',
    header: ['列1', '列2', '列3'],
    dataset: createDefaultDataset(),
    index: true,
    columnWidth: [30, 100, 100],
    align: ['center', 'right', 'right', 'right'],
    rowNum: 5,
    waitTime: 2,
    headerHeight: 35,
    carousel: 'single',
    headerBGC: '#00BAFF',
    oddRowBGC: '#003B51',
    evenRowBGC: '#0A2732',
    label: '轮播列表',
  }
}
