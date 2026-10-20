<template>
  <div class="generic-chart-config-panel">
    <!--
      名称统一由二维基础面板“通用”分组编辑。
      旧版本在图表专属配置中再次绑定 option.label，会让同一字段出现两次并破坏 Figma 的分组层级；
      删除此重复入口不改变 label 的存储字段和更新链路。
    -->
    <ScenePropertyCollapse v-model="activeSections" class="generic-chart-config-panel__collapse">
      <!-- 统一字体分组覆盖多标题、多系列及富文本，不改变各图表原有默认样式。 -->
      <ScenePropertyCollapseItem name="fonts" title="文字字体">
        <ChartFontSection
          v-if="isSectionActive('fonts')"
          :option="option.chartOption ?? {}"
          :schema="schema"
          @update:option="updateChartFonts"
        />
      </ScenePropertyCollapseItem>
      <ScenePropertyCollapseItem v-if="schema.supports.title" name="title" title="标题">
        <template v-if="isSectionActive('title')">
          <!-- Figma 将启用、位置和文本字段各自放在独立属性行，避免位置下拉框挤在标题栏同一行。 -->
          <ScenePropertyRow label="启用" control-fill>
            <ScenePropertySwitch v-model="title.show" />
          </ScenePropertyRow>
          <ScenePropertyRow label="位置" control-fill>
            <!-- 图表标题位置是 Figma 中的窄变体；高度仍由共享下拉框统一为 32px。 -->
            <ScenePropertySelect v-model="title.left" width="136px" placeholder="位置">
              <el-option label="左侧" value="left" />
              <el-option label="居中" value="center" />
              <el-option label="右侧" value="right" />
            </ScenePropertySelect>
          </ScenePropertyRow>
          <ScenePropertyRow label="标题" control-fill>
            <ScenePropertyInput v-model="title.text" placeholder="请输入标题" />
          </ScenePropertyRow>
          <ScenePropertyRow label="副标题" control-fill>
            <ScenePropertyInput v-model="title.subtext" placeholder="请输入副标题" />
          </ScenePropertyRow>
          <setting-item-box name="标题样式">
            <setting-item name="颜色">
              <ScenePropertyColorPicker v-model="title.textStyle.color" label="颜色" />
            </setting-item>
            <setting-item name="大小">
              <ScenePropertyNumberInput
                v-model="title.textStyle.fontSize"
                prefix="大小"
                :min="1"
                :step="1"
                :error-message="titleFontSizeError"
              />
            </setting-item>
          </setting-item-box>
          <setting-item-box name="副标题样式">
            <setting-item name="颜色">
              <ScenePropertyColorPicker v-model="title.subtextStyle.color" label="颜色" />
            </setting-item>
            <setting-item name="大小">
              <ScenePropertyNumberInput
                v-model="title.subtextStyle.fontSize"
                prefix="大小"
                :min="1"
                :step="1"
                :error-message="subTitleFontSizeError"
              />
            </setting-item>
          </setting-item-box>
        </template>
      </ScenePropertyCollapseItem>

      <ScenePropertyCollapseItem v-if="schema.supports.grid" name="grid" title="容器">
        <template v-if="isSectionActive('grid')">
          <!--
            所有支持 ECharts grid 的二维图表都经过本共享面板配置容器边距。
            右侧面板的紧凑布局会隐藏 SettingItem 的旧下方标题，因此把方向作为输入框常驻前缀；
            即使字段已有数值，用户仍能明确识别上、右、下、左，原有 grid 数据绑定保持不变。
          -->
          <setting-item-box name="边距">
            <setting-item name="上">
              <ScenePropertyInput
                v-model="grid.top"
                class="generic-chart-config-panel__edge-input"
                aria-label="上边距"
              >
                <template #prefix><span aria-hidden="true">上</span></template>
              </ScenePropertyInput>
            </setting-item>
            <setting-item name="右">
              <ScenePropertyInput
                v-model="grid.right"
                class="generic-chart-config-panel__edge-input"
                aria-label="右边距"
              >
                <template #prefix><span aria-hidden="true">右</span></template>
              </ScenePropertyInput>
            </setting-item>
            <setting-item name="下">
              <ScenePropertyInput
                v-model="grid.bottom"
                class="generic-chart-config-panel__edge-input"
                aria-label="下边距"
              >
                <template #prefix><span aria-hidden="true">下</span></template>
              </ScenePropertyInput>
            </setting-item>
            <setting-item name="左">
              <ScenePropertyInput
                v-model="grid.left"
                class="generic-chart-config-panel__edge-input"
                aria-label="左边距"
              >
                <template #prefix><span aria-hidden="true">左</span></template>
              </ScenePropertyInput>
            </setting-item>
          </setting-item-box>
          <setting-item-box name="附加">
            <setting-item name="含标签">
              <ScenePropertySwitch v-model="grid.containLabel" />
            </setting-item>
          </setting-item-box>
        </template>
      </ScenePropertyCollapseItem>

      <ScenePropertyCollapseItem v-if="schema.supports.xAxis" name="xAxis" title="X轴">
        <template v-if="isSectionActive('xAxis')">
          <!--
            X、Y 轴均由本共享面板渲染。紧凑布局隐藏 SettingItem 的旧字段标题后，
            数值和选中项必须在控件内部保留名称、字号、旋转、范围等语义，避免用户只能看到孤立值。
          -->
          <template v-for="(axisItem, index) in xAxes" :key="`x-${index}`">
            <div class="axis-group-title" v-if="xAxes.length > 1">X轴 {{ index + 1 }}</div>
            <setting-item-box name="基础">
              <setting-item name="显示">
                <ScenePropertySwitch v-model="axisItem.show" />
              </setting-item>
              <setting-item name="名称">
                <ScenePropertyInput v-model="axisItem.name" aria-label="X轴名称">
                  <template #prefix><span aria-hidden="true">名称</span></template>
                </ScenePropertyInput>
              </setting-item>
            </setting-item-box>
            <setting-item-box name="名称样式">
              <setting-item name="颜色">
                <ScenePropertyColorPicker v-model="axisItem.nameTextStyle.color" label="颜色" />
              </setting-item>
              <setting-item name="字号">
                <ScenePropertyNumberInput
                  v-model="axisItem.nameTextStyle.fontSize"
                  prefix="字号"
                  aria-label="X轴名称字号"
                  :min="1"
                  :controls="false"
                />
              </setting-item>
            </setting-item-box>
            <setting-item-box name="标签">
              <setting-item name="显示">
                <ScenePropertySwitch v-model="axisItem.axisLabel.show" />
              </setting-item>
              <setting-item name="颜色">
                <ScenePropertyColorPicker v-model="axisItem.axisLabel.color" label="颜色" />
              </setting-item>
              <setting-item name="字号">
                <ScenePropertyNumberInput
                  v-model="axisItem.axisLabel.fontSize"
                  prefix="字号"
                  aria-label="X轴标签字号"
                  :min="1"
                  :controls="false"
                />
              </setting-item>
              <setting-item name="旋转">
                <ScenePropertyNumberInput
                  v-model="axisItem.axisLabel.rotate"
                  prefix="旋转"
                  aria-label="X轴标签旋转角度"
                  :min="-90"
                  :max="90"
                  :controls="false"
                />
              </setting-item>
            </setting-item-box>
            <setting-item-box name="轴线">
              <setting-item name="显示">
                <ScenePropertySwitch v-model="axisItem.axisLine.show" />
              </setting-item>
              <setting-item name="颜色">
                <ScenePropertyColorPicker
                  v-model="axisItem.axisLine.lineStyle.color"
                  label="颜色"
                />
              </setting-item>
              <setting-item name="线宽">
                <ScenePropertyNumberInput
                  v-model="axisItem.axisLine.lineStyle.width"
                  prefix="线宽"
                  aria-label="X轴轴线宽度"
                  :min="1"
                  :controls="false"
                />
              </setting-item>
              <setting-item name="位置">
                <ScenePropertySelect v-model="axisItem.position" aria-label="X轴位置">
                  <template #prefix><span aria-hidden="true">位置</span></template>
                  <el-option label="左/下" value="left" />
                  <el-option label="右/上" value="right" />
                  <el-option label="顶部" value="top" />
                  <el-option label="底部" value="bottom" />
                </ScenePropertySelect>
              </setting-item>
            </setting-item-box>
            <setting-item-box name="刻度/范围">
              <setting-item name="刻度">
                <ScenePropertySwitch v-model="axisItem.axisTick.show" />
              </setting-item>
              <setting-item name="最小值">
                <!-- 坐标轴范围必须通过数字控件写回，避免文本输入把数值序列化为字符串。 -->
                <ScenePropertyNumberInput
                  v-model="axisItem.min"
                  prefix="最小"
                  aria-label="X轴最小值"
                  :controls="false"
                />
              </setting-item>
              <setting-item name="最大值">
                <ScenePropertyNumberInput
                  v-model="axisItem.max"
                  prefix="最大"
                  aria-label="X轴最大值"
                  :controls="false"
                />
              </setting-item>
              <setting-item name="间隔">
                <ScenePropertyNumberInput
                  v-model="axisItem.interval"
                  prefix="间隔"
                  aria-label="X轴刻度间隔"
                  :min="0"
                  :controls="false"
                />
              </setting-item>
            </setting-item-box>
            <setting-item-box name="分割线">
              <setting-item name="显示">
                <ScenePropertySwitch v-model="axisItem.splitLine.show" />
              </setting-item>
              <setting-item name="颜色">
                <ScenePropertyColorPicker
                  v-model="axisItem.splitLine.lineStyle.color"
                  label="颜色"
                />
              </setting-item>
              <setting-item name="线宽">
                <ScenePropertyNumberInput
                  v-model="axisItem.splitLine.lineStyle.width"
                  prefix="线宽"
                  aria-label="X轴分割线宽度"
                  :min="1"
                  :controls="false"
                />
              </setting-item>
              <setting-item name="类型">
                <ScenePropertySelect
                  v-model="axisItem.splitLine.lineStyle.type"
                  aria-label="X轴分割线类型"
                >
                  <template #prefix><span aria-hidden="true">类型</span></template>
                  <el-option label="实线" value="solid" />
                  <el-option label="虚线" value="dashed" />
                  <el-option label="点线" value="dotted" />
                </ScenePropertySelect>
              </setting-item>
            </setting-item-box>
          </template>
        </template>
      </ScenePropertyCollapseItem>

      <ScenePropertyCollapseItem v-if="schema.supports.yAxis" name="yAxis" title="Y轴">
        <template v-if="isSectionActive('yAxis')">
          <template v-for="(axisItem, index) in yAxes" :key="`y-${index}`">
            <div class="axis-group-title" v-if="yAxes.length > 1">Y轴 {{ index + 1 }}</div>
            <setting-item-box name="基础">
              <setting-item name="显示">
                <ScenePropertySwitch v-model="axisItem.show" />
              </setting-item>
              <setting-item name="名称">
                <ScenePropertyInput v-model="axisItem.name" aria-label="Y轴名称">
                  <template #prefix><span aria-hidden="true">名称</span></template>
                </ScenePropertyInput>
              </setting-item>
            </setting-item-box>
            <setting-item-box name="名称样式">
              <setting-item name="颜色">
                <ScenePropertyColorPicker v-model="axisItem.nameTextStyle.color" label="颜色" />
              </setting-item>
              <setting-item name="字号">
                <ScenePropertyNumberInput
                  v-model="axisItem.nameTextStyle.fontSize"
                  prefix="字号"
                  aria-label="Y轴名称字号"
                  :min="1"
                  :controls="false"
                />
              </setting-item>
            </setting-item-box>
            <setting-item-box name="标签">
              <setting-item name="显示">
                <ScenePropertySwitch v-model="axisItem.axisLabel.show" />
              </setting-item>
              <setting-item name="颜色">
                <ScenePropertyColorPicker v-model="axisItem.axisLabel.color" label="颜色" />
              </setting-item>
              <setting-item name="字号">
                <ScenePropertyNumberInput
                  v-model="axisItem.axisLabel.fontSize"
                  prefix="字号"
                  aria-label="Y轴标签字号"
                  :min="1"
                  :controls="false"
                />
              </setting-item>
              <setting-item name="旋转">
                <ScenePropertyNumberInput
                  v-model="axisItem.axisLabel.rotate"
                  prefix="旋转"
                  aria-label="Y轴标签旋转角度"
                  :min="-90"
                  :max="90"
                  :controls="false"
                />
              </setting-item>
            </setting-item-box>
            <setting-item-box name="轴线">
              <setting-item name="显示">
                <ScenePropertySwitch v-model="axisItem.axisLine.show" />
              </setting-item>
              <setting-item name="颜色">
                <ScenePropertyColorPicker
                  v-model="axisItem.axisLine.lineStyle.color"
                  label="颜色"
                />
              </setting-item>
              <setting-item name="线宽">
                <ScenePropertyNumberInput
                  v-model="axisItem.axisLine.lineStyle.width"
                  prefix="线宽"
                  aria-label="Y轴轴线宽度"
                  :min="1"
                  :controls="false"
                />
              </setting-item>
              <setting-item name="位置">
                <ScenePropertySelect v-model="axisItem.position" aria-label="Y轴位置">
                  <template #prefix><span aria-hidden="true">位置</span></template>
                  <el-option label="左侧" value="left" />
                  <el-option label="右侧" value="right" />
                  <el-option label="顶部" value="top" />
                  <el-option label="底部" value="bottom" />
                </ScenePropertySelect>
              </setting-item>
            </setting-item-box>
            <setting-item-box name="刻度/范围">
              <setting-item name="刻度">
                <ScenePropertySwitch v-model="axisItem.axisTick.show" />
              </setting-item>
              <setting-item name="最小值">
                <!-- 与 X 轴保持同一数值边界，双 Y 轴等数组配置也会逐项写回 number。 -->
                <ScenePropertyNumberInput
                  v-model="axisItem.min"
                  prefix="最小"
                  aria-label="Y轴最小值"
                  :controls="false"
                />
              </setting-item>
              <setting-item name="最大值">
                <ScenePropertyNumberInput
                  v-model="axisItem.max"
                  prefix="最大"
                  aria-label="Y轴最大值"
                  :controls="false"
                />
              </setting-item>
              <setting-item name="间隔">
                <ScenePropertyNumberInput
                  v-model="axisItem.interval"
                  prefix="间隔"
                  aria-label="Y轴刻度间隔"
                  :min="0"
                  :controls="false"
                />
              </setting-item>
            </setting-item-box>
            <setting-item-box name="分割线">
              <setting-item name="显示">
                <ScenePropertySwitch v-model="axisItem.splitLine.show" />
              </setting-item>
              <setting-item name="颜色">
                <ScenePropertyColorPicker
                  v-model="axisItem.splitLine.lineStyle.color"
                  label="颜色"
                />
              </setting-item>
              <setting-item name="线宽">
                <ScenePropertyNumberInput
                  v-model="axisItem.splitLine.lineStyle.width"
                  prefix="线宽"
                  aria-label="Y轴分割线宽度"
                  :min="1"
                  :controls="false"
                />
              </setting-item>
              <setting-item name="类型">
                <ScenePropertySelect
                  v-model="axisItem.splitLine.lineStyle.type"
                  aria-label="Y轴分割线类型"
                >
                  <template #prefix><span aria-hidden="true">类型</span></template>
                  <el-option label="实线" value="solid" />
                  <el-option label="虚线" value="dashed" />
                  <el-option label="点线" value="dotted" />
                </ScenePropertySelect>
              </setting-item>
            </setting-item-box>
          </template>
        </template>
      </ScenePropertyCollapseItem>

      <ScenePropertyCollapseItem v-if="schema.supports.legend" name="legend" title="图例">
        <template v-if="isSectionActive('legend')">
          <setting-item-box name="显示">
            <setting-item name="启用">
              <ScenePropertySwitch v-model="legend.show" />
            </setting-item>
            <setting-item name="方向">
              <ScenePropertySelect v-model="legend.orient" aria-label="图例排列方向">
                <template #prefix><span aria-hidden="true">方向</span></template>
                <el-option label="横向" value="horizontal" />
                <el-option label="纵向" value="vertical" />
              </ScenePropertySelect>
            </setting-item>
          </setting-item-box>
          <setting-item-box name="位置">
            <setting-item name="左">
              <ScenePropertyInput v-model="legend.left" aria-label="图例左侧位置">
                <template #prefix><span aria-hidden="true">左</span></template>
              </ScenePropertyInput>
            </setting-item>
            <setting-item name="上">
              <ScenePropertyInput v-model="legend.top" aria-label="图例顶部位置">
                <template #prefix><span aria-hidden="true">上</span></template>
              </ScenePropertyInput>
            </setting-item>
          </setting-item-box>
          <setting-item-box name="文字">
            <setting-item name="颜色">
              <ScenePropertyColorPicker v-model="legend.textStyle.color" label="颜色" />
            </setting-item>
            <setting-item name="字号">
              <ScenePropertyNumberInput
                v-model="legend.textStyle.fontSize"
                prefix="字号"
                aria-label="图例文字字号"
                :min="1"
                :controls="false"
              />
            </setting-item>
            <setting-item name="图标">
              <ScenePropertySelect v-model="legend.icon" aria-label="图例图标形状">
                <template #prefix><span aria-hidden="true">图标</span></template>
                <el-option label="圆形" value="circle" />
                <el-option label="矩形" value="rect" />
                <el-option label="圆角矩形" value="roundRect" />
                <el-option label="三角形" value="triangle" />
              </ScenePropertySelect>
            </setting-item>
            <setting-item name="宽度">
              <ScenePropertyNumberInput
                v-model="legend.itemWidth"
                prefix="宽度"
                aria-label="图例图标宽度"
                :min="1"
                :controls="false"
              />
            </setting-item>
          </setting-item-box>
        </template>
      </ScenePropertyCollapseItem>

      <ScenePropertyCollapseItem v-if="schema.supports.radar" name="radar" title="雷达">
        <template v-if="isSectionActive('radar')">
          <setting-item-box name="布局">
            <setting-item name="形状">
              <ScenePropertySelect v-model="radar.shape" aria-label="雷达图形状">
                <template #prefix><span aria-hidden="true">形状</span></template>
                <el-option label="圆形" value="circle" />
                <el-option label="多边形" value="polygon" />
              </ScenePropertySelect>
            </setting-item>
            <setting-item name="半径">
              <ScenePropertyInput v-model="radar.radius" aria-label="雷达图半径">
                <template #prefix><span aria-hidden="true">半径</span></template>
              </ScenePropertyInput>
            </setting-item>
            <setting-item name="中心X">
              <ScenePropertyInput v-model="radar.center[0]" aria-label="雷达图中心横坐标">
                <template #prefix><span aria-hidden="true">中心X</span></template>
              </ScenePropertyInput>
            </setting-item>
            <setting-item name="中心Y">
              <ScenePropertyInput v-model="radar.center[1]" aria-label="雷达图中心纵坐标">
                <template #prefix><span aria-hidden="true">中心Y</span></template>
              </ScenePropertyInput>
            </setting-item>
          </setting-item-box>
          <setting-item-box name="分割">
            <setting-item name="层数">
              <ScenePropertyNumberInput
                v-model="radar.splitNumber"
                prefix="层数"
                aria-label="雷达图分割层数"
                :min="1"
                :controls="false"
              />
            </setting-item>
            <setting-item name="标签色">
              <ScenePropertyColorPicker v-model="radar.axisName.color" label="标签色" />
            </setting-item>
            <setting-item name="标签字号">
              <ScenePropertyNumberInput
                v-model="radar.axisName.fontSize"
                prefix="字号"
                aria-label="雷达图标签字号"
                :min="1"
                :controls="false"
              />
            </setting-item>
          </setting-item-box>
          <setting-item-box name="线条">
            <setting-item name="轴线色">
              <ScenePropertyColorPicker v-model="radar.axisLine.lineStyle.color" label="轴线色" />
            </setting-item>
            <setting-item name="分割线色">
              <ScenePropertyColorPicker
                v-model="radar.splitLine.lineStyle.color"
                label="分割线色"
              />
            </setting-item>
            <setting-item name="分割线宽">
              <ScenePropertyNumberInput
                v-model="radar.splitLine.lineStyle.width"
                prefix="线宽"
                aria-label="雷达图分割线宽度"
                :min="1"
                :controls="false"
              />
            </setting-item>
          </setting-item-box>
        </template>
      </ScenePropertyCollapseItem>

      <ScenePropertyCollapseItem :name="seriesSectionName" :title="`${schema.seriesLabel}定制`">
        <GenericChartSeriesSection
          :active="isSectionActive(seriesSectionName)"
          :schema="schema"
          :line-series="lineSeries"
          :bar-series="barSeries"
          :pie-series="pieSeries"
          :gauge-series="gaugeSeries"
          :radar-series="radarSeries"
          :sankey-series="sankeySeries"
          :treemap-series="treemapSeries"
          :series-title="seriesTitle"
          :is-color-editable="isColorEditable"
          :border-radius-text-model="borderRadiusTextModel"
          :pie-radius-model="pieRadiusModel"
          :pie-center-model="pieCenterModel"
          :gauge-radius="gaugeRadiusValue"
          :set-gauge-radius="setGaugeRadius"
        />
      </ScenePropertyCollapseItem>

      <ScenePropertyCollapseItem name="advanced" title="样式 JSON">
        <template v-if="isSectionActive('advanced')">
          <setting-item-box name="样式配置(JSON)" :alone="true">
            <setting-item>
              <ChartJsonEditor v-model="chartOptionModel" />
            </setting-item>
          </setting-item-box>
        </template>
      </ScenePropertyCollapseItem>
    </ScenePropertyCollapse>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import SettingItem from '@/components/SettingItem/index.vue'
import SettingItemBox from '@/components/SettingItemBox/index.vue'
import ScenePropertyCollapse from '@/components/ScenePropertyCollapse/index.vue'
import ScenePropertyCollapseItem from '@/components/ScenePropertyCollapseItem/index.vue'
import ChartJsonEditor from './ChartJsonEditor.vue'
import GenericChartSeriesSection from './GenericChartSeriesSection.vue'
import ChartFontSection from './ChartFontSection.vue'
import type { PanelChartOption } from './chartConfigTypes'
import ScenePropertyColorPicker from
  '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyColorPicker/index.vue'
import ScenePropertyRow from '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyRow/index.vue'
import ScenePropertySwitch from
  '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertySwitch/index.vue'
import { type PanelOptionModel, useGenericChartConfigPanel } from './useGenericChartConfigPanel'

defineOptions({ name: 'GenericChartConfigPanel' })

const props = defineProps({
  option: { type: Object as PropType<PanelOptionModel>, required: true },
  chartKey: { type: String, required: true },
})

const emit = defineEmits<{
  (e: 'update:option', value: PanelOptionModel): void
}>()
/** 保持标准 update:option 协议，字体与其他图表样式一同持久化，不额外创建渲染实例。 */
const updateChartFonts = (chartOption: PanelChartOption) => {
  emit('update:option', { ...props.option, chartOption })
}
const {
  schema,
  seriesSectionName,
  activeSections,
  isSectionActive,
  chartOptionModel,
  title,
  grid,
  legend,
  radar,
  xAxes,
  yAxes,
  lineSeries,
  barSeries,
  pieSeries,
  gaugeSeries,
  radarSeries,
  sankeySeries,
  treemapSeries,
  isColorEditable,
  seriesTitle,
  borderRadiusTextModel,
  pieRadiusModel,
  pieCenterModel,
  gaugeRadiusValue,
  setGaugeRadius,
} = useGenericChartConfigPanel(props, emit)

/**
 * 标题字号共用 Figma 的错误态规则：非有限值或小于 1 时显示红色边框和辅助说明，
 * 有效值不渲染空错误占位，避免属性面板出现多余的垂直间距。
 */
const getFontSizeError = (value: unknown) => {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) && nextValue >= 1 ? '' : '字号必须为不小于 1 的数字'
}
const titleFontSizeError = computed(() => getFontSizeError(title.value.textStyle.fontSize))
const subTitleFontSizeError = computed(() => getFontSizeError(title.value.subtextStyle.fontSize))
</script>

<style scoped lang="scss">
.generic-chart-config-panel {
  :deep(.el-collapse-item__header) {
    /* 右侧属性折叠标题与 Figma 分组标题保持 14px；颜色、间距由共享属性样式统一维护。 */
    font-size: 14px;
    font-weight: 600;
  }
  :deep(.el-collapse-item__content) {
    padding-bottom: 6px;
  }
}

/**
 * 容器边距和轴配置的常驻语义前缀统一使用属性面板次级文字色，不与用户输入值争夺视觉层级。
 * 只匹配本面板显式添加的文本前缀，避免改变颜色选择器、搜索图标等其他共享控件的颜色。
 */
.generic-chart-config-panel :deep(.el-input__prefix-inner > span[aria-hidden='true']),
.generic-chart-config-panel :deep(.el-select__prefix > span[aria-hidden='true']) {
  color: rgb(255 255 255 / 45%);
}
.axis-group-title,
.series-card__title {
  margin: 8px 0 4px 10px;
  font-size: 12px;
  font-weight: 600;

  /* 深色属性面板中的三级标题沿用设计稿白色透明度，避免旧浅色主题导致文字几乎不可见。 */
  color: rgb(255 255 255 / 40%);
}
.series-card {
  padding-bottom: 4px;
}
</style>
