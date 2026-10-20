import { VCountDownInfo } from './CountDown/config'
import { VFlipperNumberInfo } from './FlipperNumber/config'
import { VIconInfo } from './Icon/config'
import { VIframeInfo } from './Iframe/config'
import { VImageCarouselInfo } from './ImageCarousel/config'
import { VImageInfo } from './Image/config'
import { VInputsDateInfo } from './InputsDate/config'
import { VInputsPaginationInfo } from './InputsPagination/config'
import { VInputsTabInfo } from './InputsTab/config'
import { VNumberInfo } from './Number/config'
import { VPageMenuInfo } from './VPageMenu/config'
import { VPagePaginationInfo } from './PagePagination/config'
import { VProgressBarInfo } from './VProgressBar/config'
import { VQuizInfo } from './Quiz/config'
import { VTableListInfo } from './TableList/config'
import { VTableScrollBoardInfo } from './TableScrollBoard/config'
import { VTablesBasicInfo } from './TablesBasic/config'
import { VTableZebraInfo } from './TableZebra/config'
import { VTableScrollInfo } from './TableScroll/config'
import { VTablePaginationInfo } from './TablePagination/config'
import { VTextBarrageInfo } from './TextBarrage/config'
import { VTextCommonInfo } from './TextCommon/config'
import { VTextGradientInfo } from './TextGradient/config'
import { VVideoInfo } from './Video/config'

/**
 * “部件”包只保留当前项目真实需要落到编辑器里的信息类组件。
 * 部分组件可能有独立左侧页签，例如 `VIcon` 放在“图标”页签，
 * 但仍然通过 Widget 包复用画布渲染、动画、数据、状态和交互链路。
 * 页面菜单属于用于切换页面的交互控件，因此由 Widget 包统一注册；
 * 保持 `VPageMenu` 组件键不变，可确保已有场景继续按原配置加载。
 * 用户已明确排除“词云”，这里不再导出，避免：
 * 1. 左侧继续出现无效卡片；
 * 2. 动态加载器继续尝试注册已废弃目录；
 * 3. 后续清理资源时留下悬空引用。
 */
export default [
  VTextCommonInfo,
  VTextGradientInfo,
  VTextBarrageInfo,
  VInputsDateInfo,
  VInputsTabInfo,
  VInputsPaginationInfo,
  VProgressBarInfo,
  // 测验使用独立二维部件配置与答题运行态，保留在普通 Widget 注册表。
  VQuizInfo,
  VPagePaginationInfo,
  VPageMenuInfo,
  VIconInfo,
  VImageInfo,
  VImageCarouselInfo,
  VIframeInfo,
  VVideoInfo,
  VNumberInfo,
  VFlipperNumberInfo,
  VCountDownInfo,
  VTableListInfo,
  VTableScrollBoardInfo,
  VTablesBasicInfo,
  VTableZebraInfo,
  VTableScrollInfo,
  VTablePaginationInfo,
]
