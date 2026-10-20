import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VInputsPaginationInfo = {
  name: '分页器',
  keyName: 'VInputsPagination',
  packageName: 'Widget',
  icon: new URL(`../assets/images/inputs-pagination.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 320, h: 32, zIndex: -1 }
  public info = clone(VInputsPaginationInfo)
  public option = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    fontFamily: '',
    navFontFamily: '',
    value: 1,
    total: 100,
    pageSize: 10,
    label: '分页器',
  }
}
