import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'

export const VIputInfo = {
  /**
   * 名称继续保持“输入框”。
   * 这样左侧资源面板、右侧配置面板和旧项目里的控件语义保持一致。
   */
  name: '输入框',
  keyName: 'VInput',
  packageName: 'Control',
  /**
   * 与 Figma「组件板块 icon」中的输入框节点一一对应的透明 PNG。
   * 该地址同时供独立配置实例使用，避免绕过资源面板装配时重新加载已淘汰的 SVG 缩略图。
   */
  icon: new URL(`../../../../assets/images/figma-components/input.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  public attr = { l: 0, t: 0, w: 260, h: 32, zIndex: -1 }
  public info = clone(VIputInfo)
  public option = {
    /** 文字字体默认继承，保持旧场景外观；用户选择后随组件配置持久化。 */
    fontFamily: '',
    value: '',
    /**
     * 该文案仅用于编辑器内展示当前控件类型，
     * 不参与运行时输入值绑定，也不作为接口字段名。
     */
    label: '输入框',
  }

  constructor() {
    super()
  }
}
