import { VAreaBasicLineInfo } from './VAreaBasicLine/config'
import { VAreaDualLineInfo } from './VAreaDualLine/config'
import { VAreaGradientLineInfo } from './VAreaGradientLine/config'
import { VAreaSmoothLineInfo } from './VAreaSmoothLine/config'
import { VAreaStackedLineInfo } from './VAreaStackedLine/config'
import { VBarInfo } from './VBar/config'
import { VGradientBarInfo } from './VGradientBar/config'
import { VGroupedBarInfo } from './VGroupedBar/config'
import { VBarSampleInfo } from './VBarSample/config'
import { VBasicCurveLineInfo } from './VBasicCurveLine/config'
import { VBasicTreemapInfo } from './VBasicTreemap/config'
import { VCurveTrendLineInfo } from './VCurveTrendLine/config'
import { VDoubleYAxisLineInfo } from './VDoubleYAxisLine/config'
import { VGradientCurveLineInfo } from './VGradientCurveLine/config'
import { VGaugeClassicInfo } from './VGaugeClassic/config'
import { VGaugeCyanInfo } from './VGaugeCyan/config'
import { VGaugeDarkInfo } from './VGaugeDark/config'
import { VGaugeHaloInfo } from './VGaugeHalo/config'
import { VGaugeNeonInfo } from './VGaugeNeon/config'
import { VGaugeSegmentedInfo } from './VGaugeSegmented/config'
import { VHorizontalBarInfo } from './VHorizontalBar/config'
import { VHorizontalGroupedBarInfo } from './VHorizontalGroupedBar/config'
import { VHorizontalNegativeBarInfo } from './VHorizontalNegativeBar/config'
import { VHorizontalStackedBarInfo } from './VHorizontalStackedBar/config'
import { VLineInfo } from './VLine/config'
import { VLineTrendInfo } from './VLineTrend/config'
import { VLineSampleInfo } from './VLineSample/config'
import { VMultiCurveLineInfo } from './VMultiCurveLine/config'
import { VMultiLineInfo } from './VMultiLine/config'
import { VRadarCircleInfo } from './VRadarCircle/config'
import { VRadarHexagonInfo } from './VRadarHexagon/config'
import { VDonutSegmentedInfo } from './VDonutSegmented/config'
import { VDonutSmoothInfo } from './VDonutSmooth/config'
import { VPieRoseRingInfo } from './VPieRoseRing/config'
import { VPieSampleInfo } from './VPieSample/config'
import { VPieSolidInfo } from './VPieSolid/config'
import { VStackedBarInfo } from './VStackedBar/config'
import { VStepLineInfo } from './VStepLine/config'
import { VSankeyBasicInfo } from './VSankeyBasic/config'
import { VSankeyBiDirectionalInfo } from './VSankeyBiDirectional/config'
import { VSankeyEnergyInfo } from './VSankeyEnergy/config'
import { VSankeyGradientInfo } from './VSankeyGradient/config'
import { VSankeyMultiStageInfo } from './VSankeyMultiStage/config'
import { applyFigmaChartPreviewIcon } from './figmaPreviewIcons'

/**
 * 编辑器图表资源清单。
 *
 * 图表的业务配置继续从各自模块导出；仅在清单装配时覆盖为 Figma 对应缩略图，
 * 从而不会影响图表运行参数、场景持久化数据或外部直接导入配置的行为。
 */
export default [
  VBarInfo,
  VGroupedBarInfo,
  VStackedBarInfo,
  VGradientBarInfo,
  VBarSampleInfo,
  VHorizontalBarInfo,
  VHorizontalGroupedBarInfo,
  VHorizontalStackedBarInfo,
  VHorizontalNegativeBarInfo,
  VGaugeNeonInfo,
  VGaugeClassicInfo,
  VGaugeHaloInfo,
  VGaugeSegmentedInfo,
  VGaugeCyanInfo,
  VGaugeDarkInfo,
  VAreaBasicLineInfo,
  VAreaSmoothLineInfo,
  VAreaGradientLineInfo,
  VAreaDualLineInfo,
  VAreaStackedLineInfo,
  VSankeyBasicInfo,
  VSankeyGradientInfo,
  VSankeyMultiStageInfo,
  VSankeyBiDirectionalInfo,
  VSankeyEnergyInfo,
  VBasicTreemapInfo,
  VLineInfo,
  VLineSampleInfo,
  VPieSampleInfo,
  VPieSolidInfo,
  VDonutSmoothInfo,
  VDonutSegmentedInfo,
  VPieRoseRingInfo,
  VMultiLineInfo,
  VLineTrendInfo,
  VBasicCurveLineInfo,
  VMultiCurveLineInfo,
  VCurveTrendLineInfo,
  VGradientCurveLineInfo,
  VStepLineInfo,
  VDoubleYAxisLineInfo,
  VRadarHexagonInfo,
  VRadarCircleInfo,
].map(applyFigmaChartPreviewIcon)
