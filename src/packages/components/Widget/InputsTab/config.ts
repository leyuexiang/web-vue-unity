import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VInputsTabInfo = {
  name: '标签选择器',
  keyName: 'VInputsTab',
  packageName: 'Widget',
  icon: new URL(`../assets/images/inputs-tab.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 460, h: 40, zIndex: -1 }
  public info = clone(VInputsTabInfo)
  public option = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    fontFamily: '',
    value: '1',
    tabType: 'segment',
    options: [
      { label: '选项1', value: '1' },
      { label: '选项2', value: '2' },
      { label: '选项3', value: '3' },
    ],
    label: '标签选择器',
  }
}
