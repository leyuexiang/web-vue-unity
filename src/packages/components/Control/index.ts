import { VIputInfo } from './VInput/config'
import { VSelectInfo } from './VSelect/config'
import { VButtonInfo } from './VButton/config'
import { VRecordPaginationInfo } from './RecordPagination/config'

// 控件包统一进入“部件 → 控件”，按钮沿用输入与选择组件的拖拽创建和按需加载协议。
// 逐条翻页作为成对按钮整体注册，保持两类场景一致的保存和按需加载协议。
export default [VIputInfo, VSelectInfo, VButtonInfo, VRecordPaginationInfo]
