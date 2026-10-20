import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VTextCommonInfo = {
  name: '文字',
  keyName: 'VTextCommon',
  packageName: 'Widget',
  icon: new URL(`../assets/images/text-common.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 260, h: 80, zIndex: -1 }
  public info = clone(VTextCommonInfo)
  public option = {
    // 各文字区域独立保存字体；空值沿用原有继承字体，兼容历史场景。
    fontFamily: '',
    value: '我是普通文本',
    fontSize: 20,
    // 0 沿用页面行高；场景还原可按设计稿为单个文字部件指定像素行高。
    lineHeight: 0,
    fontColor: '#ffffff',
    paddingX: 10,
    paddingY: 10,
    textAlign: 'center',
    fontWeight: 'normal',
    borderWidth: 0,
    borderColor: '#4a9ef8',
    borderRadius: 5,
    letterSpacing: 2,
    writingMode: 'horizontal-tb',
    whiteSpace: 'pre-wrap' as 'pre-wrap' | 'nowrap',
    backgroundColor: '#00000000',
    label: '文字',
  }
}
