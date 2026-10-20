// 边框组件
// 这里使用的是当前仓库内已同步好的本地缩略图资源，不再直接依赖旧项目路径。
import { VBorder01Info } from './Border01/config'
import { VBorder02Info } from './Border02/config'
import { VBorder03Info } from './Border03/config'
import { VBorder04Info } from './Border04/config'
import { VBorder05Info } from './Border05/config'
import { VBorder06Info } from './Border06/config'
import { VBorder07Info } from './Border07/config'
import { VBorder08Info } from './Border08/config'
import { VBorder09Info } from './Border09/config'
import { VBorder10Info } from './Border10/config'
import { VBorder11Info } from './Border11/config'
import { VBorder12Info } from './Border12/config'
import { VBorder13Info } from './Border13/config'
// 使用既有边框键名前缀，让渐变背景自动归入系统资源的边框分类。
import { VBorderGradientInfo } from './BorderGradient/config'
// 四角发光边框只配置绿色描边，固定背景由组件内部维护。
import { VBorderCornerGlowInfo } from './BorderCornerGlow/config'
// 图片颜色用于毛玻璃叠加，四角和分割线采用独立固定节点避免拉伸变形。
import { VBorderDividerGlassInfo } from './BorderDividerGlass/config'
// 中医馆边框使用原图九宫格切片，顶部和底部固定区域不会随组件高度变形。
import { VBorderSolidDeepGreenInfo } from './BorderSolidDeepGreen/config'
import { VBorderSolidBlurredGoldInfo } from './BorderSolidBlurredGold/config'
import { VBorderTranslucentBlurredGoldInfo } from './BorderTranslucentBlurredGold/config'
import { VBorderTranslucentBlurredGoldCapsuleInfo } from './BorderTranslucentBlurredGoldCapsule/config'

// 装饰组件
import { VDecorate01Info } from './Decorate01/config'
import { VDecorate02Info } from './Decorate02/config'
import { VDecorate03Info } from './Decorate03/config'
import { VDecorate04Info } from './Decorate04/config'
import { VDecorate05Info } from './Decorate05/config'
import { VDecorate06Info } from './Decorate06/config'
// 使用既有装饰键名前缀，让原始绿色色块自动归入装饰分类。
import { VDecorateGreenBarInfo } from './DecorateGreenBar/config'
// 渐变斜角线复用纯色色块的颜色配置，并按既有键名前缀进入装饰分类。
import { VDecorateSlantedLineInfo } from './DecorateSlantedLine/config'
// 标题分隔线还原亮色短段与半透明延伸线，并按装饰前缀自动归类。
import { VDecorateTitleDividerInfo } from './DecorateTitleDivider/config'
// 圆形色块沿用装饰分类及公共颜色配置链路。
import { VDecorateCircleInfo } from './DecorateCircle/config'

// 更多组件
// 关闭图标沿用更多分类规则，支持通过编辑器事件配置交互。
import { VCloseIconInfo } from './CloseIcon/config'
import { VClockInfo } from './Clock/config'
import { VFullScreenInfo } from './FullScreen/config'
import { VPipelineHInfo } from './PipelineH/config'
import { VPipelineVInfo } from './PipelineV/config'
import { VTimeCommonInfo } from './TimeCommon/config'

export default [
  VBorder01Info,
  VBorder02Info,
  VBorder03Info,
  VBorder04Info,
  VBorder05Info,
  VBorder06Info,
  VBorder07Info,
  VBorder08Info,
  VBorder09Info,
  VBorder10Info,
  VBorder11Info,
  VBorder12Info,
  VBorder13Info,
  VBorderGradientInfo,
  VBorderCornerGlowInfo,
  VBorderDividerGlassInfo,
  VBorderSolidDeepGreenInfo,
  VBorderSolidBlurredGoldInfo,
  VBorderTranslucentBlurredGoldInfo,
  VBorderTranslucentBlurredGoldCapsuleInfo,
  VDecorate01Info,
  VDecorate02Info,
  VDecorate03Info,
  VDecorate04Info,
  VDecorate05Info,
  VDecorate06Info,
  VDecorateGreenBarInfo,
  VDecorateSlantedLineInfo,
  VDecorateTitleDividerInfo,
  VDecorateCircleInfo,
  VClockInfo,
  VCloseIconInfo,
  VFullScreenInfo,
  VPipelineHInfo,
  VPipelineVInfo,
  VTimeCommonInfo,
]
