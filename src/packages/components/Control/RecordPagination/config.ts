import BaseConfig from '../../BaseWidgetConfig'

/** 分页适配只保存字段选择，不保存用户浏览期间的页码和当前记录。 */
export interface RecordPaginationBinding {
  requestId: string
  pageParameter: string
  sizeParameter: string
  listPath: string
  totalPath: string
  firstPage: 0 | 1
  pageSize: number
}

/** 两个方向只分别保存文字，符号属于文字，不内置箭头或图片。 */
export interface RecordPaginationButton {
  text: string
}

/** 两个按钮共用唯一一份外观，避免重复配置或两个方向样式不一致。 */
export interface RecordPaginationButtonStyle {
  fontFamily: string
  fontSize: number
  color: string
  italic: boolean
  bold: boolean
  backgroundColor: string
  pressedColor: string
  pressedBackgroundColor: string
}

export interface RecordPaginationOption {
  label: string
  interactive: boolean
  gap: number
  borderRadius: number
  previous: RecordPaginationButton
  next: RecordPaginationButton
  buttonStyle: RecordPaginationButtonStyle
  pagination: RecordPaginationBinding
}

export const VRecordPaginationInfo = {
  name: '逐条翻页',
  keyName: 'VRecordPagination',
  packageName: 'Control',
  icon: new URL('./preview.svg', import.meta.url).href,
}

/** 每个组件实例创建自己的共享外观，两个按钮读取同一份样式且不污染其他实例。 */
const createButtonStyle = (): RecordPaginationButtonStyle => ({
  fontFamily: '',
  fontSize: 24,
  color: '#063b37',
  italic: false,
  bold: false,
  backgroundColor: '#ffd18f',
  pressedColor: '#063b37',
  pressedBackgroundColor: '#e9b66f',
})

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 420, h: 72, zIndex: -1 }
  public info = { ...VRecordPaginationInfo }
  public option: RecordPaginationOption = {
    label: '逐条翻页',
    interactive: true,
    gap: 20,
    borderRadius: 10,
    previous: { text: '上一条' },
    next: { text: '下一条' },
    buttonStyle: createButtonStyle(),
    // 参数和响应路径由数据面板明确选择，不猜测业务接口的字段名称。
    pagination: {
      requestId: 'request-1',
      pageParameter: '',
      sizeParameter: '',
      listPath: '',
      totalPath: '',
      firstPage: 1,
      pageSize: 10,
    },
  }
}
