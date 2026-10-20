import { clone } from 'lodash-es'
import BaseConfig from '../../BaseWidgetConfig'
import { createDefaultPageFrameOption, type PageFrameOption } from './pageFrameTypes'

export const VPageMenuInfo = {
  name: '页面框架',
  keyName: 'VPageMenu',
  /**
   * 菜单在左侧“部件 -> 控件”分组展示，运行时归属普通二维部件。
   * 组件键和包名保持稳定，使历史场景继续复用原有持久化、交互和渲染链路。
   */
  packageName: 'Widget',
  // 复用同属二维导航控件的标签选择器缩略图，避免为纯菜单功能引入冗余二进制图片。
  icon: new URL(`../assets/images/inputs-tab.png`, import.meta.url).href,
}

export default class Config extends BaseConfig {
  /** 页面框架覆盖完整发布舞台；透明底图区域继续透出 Three/Cesium 场景。 */
  public attr = { l: 0, t: 0, w: 1920, h: 1080, zIndex: -1 }
  public info = clone(VPageMenuInfo)
  public option: PageFrameOption = createDefaultPageFrameOption()
}
