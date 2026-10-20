import type { ImplConfig, WidgetAttr } from './type'
import type { ComponentDataConfig } from '@/types/data-config'
import type { InteractionEvent } from '@/types/threeScene'

class BaseWidgetConfig implements ImplConfig {
  /**
   * 二维部件基础布局。
   * l/t/w/h 始终表示当前发布舞台中的逻辑坐标和尺寸。
   * 预览和发布只缩放整个舞台，不再为单个部件维护额外锚点。
   */
  public attr: WidgetAttr = { l: 0, t: 0, w: 0, h: 0, zIndex: 0 }
  public info = { name: '', keyName: '', packageName: '', icon: '' }
  public option = {}
  /**
   * 公共样式层当前只承载外层动画。
   * 这份状态属于组件持久化配置，会跟随场景保存、回显与预览一起恢复。
   */
  public styles: ImplConfig['styles'] = {
    animations: [],
  }
  public dataConfig?: ComponentDataConfig
  /**
   * 图表组件和三维对象一样，都需要支持状态规则配置。
   * 这里把状态列表提升为组件级持久化字段，避免状态面板只能写入 mesh.userData。
   */
  public statusList: InteractionEvent[] = []
  /**
   * 交互事件与状态列表共用同一套编辑面板。
   * 保持字段常驻在组件配置顶层，后续序列化 widgets 时可以直接带上这部分配置。
   */
  public interactiveEvent: InteractionEvent[] = []
}

export default BaseWidgetConfig
