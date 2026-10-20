/**
 * 图表资源面板的 Figma 预览图映射。
 *
 * 每个资源都对应 Figma「图表板块 icon」（节点 2194:3019）中的图表节点。
 * 需要位图缩略图的节点统一使用从 Figma 节点本身直接导出的透明 PNG，不再保留或后处理截图；
 * 各图表配置也直接指向同一组 PNG，因此旧 SVG 资源移除后，组件配置在独立使用时仍有完整预览。
 * 所有图表预览均不携带画布底色，通用资源卡片的 `#121b26` 背景会继续作为唯一底色。
 * 此处保留按 `keyName` 的显式映射，构建工具可在编译期收集所有静态资源，运行时只进行一次常量查表。
 */
const figmaChartPreviewIcons: Record<string, string> = {
  // 柱状图与条形图：方向、分组、堆叠和正负值各自保持独立预览。
  VBar: new URL('./assets/images/figma/bar-column.png', import.meta.url).href,
  // 红框中的分组、堆叠柱状图改为使用对应 Figma 节点直接导出的透明 PNG，避免旧矢量预览的
  // 图层裁切或比例偏差；PNG 仍保留透明通道，不会覆盖资源卡片自身的主题背景。
  VGroupedBar: new URL('./assets/images/figma/bar-column-grouped.png', import.meta.url).href,
  VStackedBar: new URL('./assets/images/figma/bar-column-stacked.png', import.meta.url).href,
  VGradientBar: new URL('./assets/images/figma/bar-gradient-glow.png', import.meta.url).href,
  VBarSample: new URL('./assets/images/figma/bar-column-negative.png', import.meta.url).href,
  VHorizontalBar: new URL('./assets/images/figma/bar.png', import.meta.url).href,
  VHorizontalGroupedBar: new URL('./assets/images/figma/bar-grouped.png', import.meta.url).href,
  VHorizontalStackedBar: new URL('./assets/images/figma/bar-stacked.png', import.meta.url).href,
  VHorizontalNegativeBar: new URL('./assets/images/figma/bar-negative.png', import.meta.url).href,

  // 仪表盘：名称与配置组件一一对应，避免将深盘、环形等视觉差异折叠成同一缩略图。
  // 霓虹仪表盘包含嵌套刻度和指针，使用 Figma 节点直接导出的透明 PNG 避免图层丢失或携带底色。
  VGaugeNeon: new URL('./assets/images/figma/gauge-neon.png', import.meta.url).href,
  VGaugeClassic: new URL('./assets/images/figma/gauge-classic.png', import.meta.url).href,
  VGaugeHalo: new URL('./assets/images/figma/gauge-halo.png', import.meta.url).href,
  VGaugeSegmented: new URL('./assets/images/figma/gauge-segmented.png', import.meta.url).href,
  VGaugeCyan: new URL('./assets/images/figma/gauge-cyan.png', import.meta.url).href,
  VGaugeDark: new URL('./assets/images/figma/gauge-dark.png', import.meta.url).href,

  // 面积图与桑基图：保持其独立系列结构，便于用户在资源面板中快速区分。
  VAreaBasicLine: new URL('./assets/images/figma/line-area-basic.png', import.meta.url).href,
  VAreaSmoothLine: new URL('./assets/images/figma/line-area-smooth.png', import.meta.url).href,
  VAreaGradientLine: new URL('./assets/images/figma/line-area-gradient.png', import.meta.url).href,
  VAreaDualLine: new URL('./assets/images/figma/line-area-dual.png', import.meta.url).href,
  VAreaStackedLine: new URL('./assets/images/figma/line-area-stacked.png', import.meta.url).href,
  VSankeyBasic: new URL('./assets/images/figma/sankey-basic.png', import.meta.url).href,
  VSankeyGradient: new URL('./assets/images/figma/sankey-gradient.png', import.meta.url).href,
  VSankeyMultiStage: new URL('./assets/images/figma/sankey-multi-stage.png', import.meta.url).href,
  VSankeyBiDirectional: new URL('./assets/images/figma/sankey-bidirectional.png', import.meta.url).href,
  VSankeyEnergy: new URL('./assets/images/figma/sankey-energy.png', import.meta.url).href,

  // 折线图：基础、曲线、趋势、渐变、阶梯与双轴使用设计稿中的各自轮廓。
  VLine: new URL('./assets/images/figma/line-basic.png', import.meta.url).href,
  VLineSample: new URL('./assets/images/figma/line-smooth.png', import.meta.url).href,
  VMultiLine: new URL('./assets/images/figma/line-multi.png', import.meta.url).href,
  VLineTrend: new URL('./assets/images/figma/line-trend.png', import.meta.url).href,
  VBasicCurveLine: new URL('./assets/images/figma/line-basic-curve.png', import.meta.url).href,
  VMultiCurveLine: new URL('./assets/images/figma/line-multi-curve.png', import.meta.url).href,
  VCurveTrendLine: new URL('./assets/images/figma/line-curve-trend.png', import.meta.url).href,
  VGradientCurveLine: new URL('./assets/images/figma/line-gradient.png', import.meta.url).href,
  VStepLine: new URL('./assets/images/figma/line-step.png', import.meta.url).href,
  VDoubleYAxisLine: new URL('./assets/images/figma/line-double-y.png', import.meta.url).href,

  // 饼环图和雷达图：为不同环形切分与雷达网格保留清晰、可辨识的预览。
  VPieSample: new URL('./assets/images/figma/pie.png', import.meta.url).href,
  VPieSolid: new URL('./assets/images/figma/pie-solid.png', import.meta.url).href,
  VDonutSmooth: new URL('./assets/images/figma/pie-donut-smooth.png', import.meta.url).href,
  VDonutSegmented: new URL('./assets/images/figma/pie-donut-segmented.png', import.meta.url).href,
  VPieRoseRing: new URL('./assets/images/figma/pie-rose-ring.png', import.meta.url).href,
  VRadarHexagon: new URL('./assets/images/figma/radar-hexagon.png', import.meta.url).href,
  VRadarCircle: new URL('./assets/images/figma/radar-circle.png', import.meta.url).href,
}

/**
 * 只在资源清单装配阶段覆盖缩略图地址。
 *
 * 返回新对象以避免改写各图表配置导出的共享常量；未收录的后续图表继续使用自身默认图标，
 * 因此新增组件不会因预览映射滞后而失去资源面板入口。
 */
export const applyFigmaChartPreviewIcon = <T extends { keyName: string; icon: string }>(chart: T): T => ({
  ...chart,
  icon: figmaChartPreviewIcons[chart.keyName] ?? chart.icon,
})
