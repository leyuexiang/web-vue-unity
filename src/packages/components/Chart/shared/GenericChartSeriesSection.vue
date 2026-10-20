<template>
  <template v-if="active">
    <!--
      全部二维图表的系列定制都经过本共享组件。属性面板紧凑布局会隐藏 SettingItem 的旧名称，
      因此输入框和下拉框必须显示常驻语义前缀；只补充说明文字和无障碍名称，不改变原有配置绑定。
    -->
    <template v-if="schema.family === 'line'">
      <div v-for="(seriesItem, index) in lineSeries" :key="`line-${index}`" class="series-card">
        <div class="series-card__title">{{ seriesTitle(seriesItem, index) }}</div>
        <setting-item-box name="线条">
          <setting-item name="宽度">
            <ScenePropertyNumberInput
              v-model="seriesItem.lineStyle.width"
              prefix="线宽"
              aria-label="折线宽度"
              :min="1"
              :controls="false"
            />
          </setting-item>
          <setting-item name="类型">
            <ScenePropertySelect v-model="seriesItem.lineStyle.type" aria-label="折线类型">
              <template #prefix><span aria-hidden="true">类型</span></template>
              <el-option label="实线" value="solid" />
              <el-option label="虚线" value="dashed" />
              <el-option label="点线" value="dotted" />
            </ScenePropertySelect>
          </setting-item>
          <setting-item name="平滑">
            <ScenePropertySwitch v-model="seriesItem.smooth" />
          </setting-item>
          <setting-item name="颜色" v-if="isColorEditable(seriesItem.lineStyle.color)">
            <ScenePropertyColorPicker v-model="seriesItem.lineStyle.color" label="颜色" />
          </setting-item>
        </setting-item-box>
        <setting-item-box name="节点/标签">
          <setting-item name="节点大小">
            <ScenePropertyNumberInput
              v-model="seriesItem.symbolSize"
              prefix="节点"
              aria-label="折线节点大小"
              :min="0"
              :controls="false"
            />
          </setting-item>
          <setting-item name="显示标签">
            <ScenePropertySwitch v-model="seriesItem.label.show" />
          </setting-item>
          <setting-item name="标签字号">
            <ScenePropertyNumberInput
              v-model="seriesItem.label.fontSize"
              prefix="字号"
              aria-label="折线标签字号"
              :min="1"
              :controls="false"
            />
          </setting-item>
          <setting-item name="标签颜色">
            <ScenePropertyColorPicker v-model="seriesItem.label.color" label="标签颜色" />
          </setting-item>
        </setting-item-box>
        <setting-item-box name="标签位置">
          <setting-item name="位置">
            <ScenePropertySelect v-model="seriesItem.label.position" aria-label="折线标签位置">
              <template #prefix><span aria-hidden="true">位置</span></template>
              <el-option label="上" value="top" />
              <el-option label="左" value="left" />
              <el-option label="右" value="right" />
              <el-option label="下" value="bottom" />
            </ScenePropertySelect>
          </setting-item>
          <setting-item name="节点颜色" v-if="isColorEditable(seriesItem.itemStyle.color)">
            <ScenePropertyColorPicker v-model="seriesItem.itemStyle.color" label="节点颜色" />
          </setting-item>
        </setting-item-box>
        <setting-item-box v-if="schema.flags.area" name="面积">
          <setting-item name="填充色" v-if="isColorEditable(seriesItem.areaStyle.color)">
            <ScenePropertyColorPicker v-model="seriesItem.areaStyle.color" label="填充色" />
          </setting-item>
          <setting-item name="透明度">
            <ScenePropertyNumberInput
              v-model="seriesItem.areaStyle.opacity"
              prefix="透明度"
              aria-label="面积填充透明度"
              :min="0"
              :max="1"
              :step="0.05"
              :controls="false"
            />
          </setting-item>
        </setting-item-box>
      </div>
    </template>

    <template v-else-if="schema.family === 'bar'">
      <div v-for="(seriesItem, index) in barSeries" :key="`bar-${index}`" class="series-card">
        <div class="series-card__title">{{ seriesTitle(seriesItem, index) }}</div>
        <setting-item-box name="柱体">
          <setting-item name="宽度">
            <ScenePropertyInput v-model="seriesItem.barWidth" aria-label="柱体宽度">
              <template #prefix><span aria-hidden="true">宽度</span></template>
            </ScenePropertyInput>
          </setting-item>
          <setting-item name="最大宽度">
            <ScenePropertyInput v-model="seriesItem.barMaxWidth" aria-label="柱体最大宽度">
              <template #prefix><span aria-hidden="true">最大宽</span></template>
            </ScenePropertyInput>
          </setting-item>
          <setting-item name="堆叠键">
            <ScenePropertyInput v-model="seriesItem.stack" aria-label="柱体堆叠键">
              <template #prefix><span aria-hidden="true">堆叠</span></template>
            </ScenePropertyInput>
          </setting-item>
          <setting-item name="颜色" v-if="isColorEditable(seriesItem.itemStyle.color)">
            <ScenePropertyColorPicker v-model="seriesItem.itemStyle.color" label="颜色" />
          </setting-item>
        </setting-item-box>
        <setting-item-box name="圆角/背景">
          <setting-item name="圆角">
            <!-- 圆角文本模型只接收逗号分隔字符串，数字输入也显式序列化后再解析。 -->
            <ScenePropertyInput
              :model-value="borderRadiusTextModel(seriesItem).value"
              aria-label="柱体圆角"
              @update:model-value="borderRadiusTextModel(seriesItem).value = String($event)"
            >
              <template #prefix><span aria-hidden="true">圆角</span></template>
            </ScenePropertyInput>
          </setting-item>
          <setting-item name="背景柱">
            <ScenePropertySwitch v-model="seriesItem.showBackground" />
          </setting-item>
          <setting-item name="背景色" v-if="isColorEditable(seriesItem.backgroundStyle.color)">
            <ScenePropertyColorPicker v-model="seriesItem.backgroundStyle.color" label="背景色" />
          </setting-item>
        </setting-item-box>
        <setting-item-box name="标签">
          <setting-item name="显示">
            <ScenePropertySwitch v-model="seriesItem.label.show" />
          </setting-item>
          <setting-item name="字号">
            <ScenePropertyNumberInput
              v-model="seriesItem.label.fontSize"
              prefix="字号"
              aria-label="柱体标签字号"
              :min="1"
              :controls="false"
            />
          </setting-item>
          <setting-item name="颜色">
            <ScenePropertyColorPicker v-model="seriesItem.label.color" label="颜色" />
          </setting-item>
          <setting-item name="位置">
            <ScenePropertySelect v-model="seriesItem.label.position" aria-label="柱体标签位置">
              <template #prefix><span aria-hidden="true">位置</span></template>
              <el-option label="上" value="top" />
              <el-option label="左" value="left" />
              <el-option label="右" value="right" />
              <el-option label="下" value="bottom" />
              <el-option label="内部" value="inside" />
            </ScenePropertySelect>
          </setting-item>
        </setting-item-box>
      </div>
    </template>

    <template v-else-if="schema.family === 'pie'">
      <setting-item-box name="布局">
        <setting-item name="内半径">
          <ScenePropertyInput
            :model-value="pieRadiusModel.inner.value"
            aria-label="饼图内半径"
            @update:model-value="pieRadiusModel.inner.value = $event"
          >
            <template #prefix><span aria-hidden="true">内径</span></template>
          </ScenePropertyInput>
        </setting-item>
        <setting-item name="外半径">
          <ScenePropertyInput
            :model-value="pieRadiusModel.outer.value"
            aria-label="饼图外半径"
            @update:model-value="pieRadiusModel.outer.value = $event"
          >
            <template #prefix><span aria-hidden="true">外径</span></template>
          </ScenePropertyInput>
        </setting-item>
        <setting-item name="中心X">
          <ScenePropertyInput
            :model-value="pieCenterModel.x.value"
            aria-label="饼图中心横坐标"
            @update:model-value="pieCenterModel.x.value = $event"
          >
            <template #prefix><span aria-hidden="true">中心X</span></template>
          </ScenePropertyInput>
        </setting-item>
        <setting-item name="中心Y">
          <ScenePropertyInput
            :model-value="pieCenterModel.y.value"
            aria-label="饼图中心纵坐标"
            @update:model-value="pieCenterModel.y.value = $event"
          >
            <template #prefix><span aria-hidden="true">中心Y</span></template>
          </ScenePropertyInput>
        </setting-item>
      </setting-item-box>
      <setting-item-box name="图形">
        <setting-item name="开始角度">
          <ScenePropertyNumberInput
            v-model="pieSeries.startAngle"
            prefix="起始角"
            aria-label="饼图开始角度"
            :controls="false"
          />
        </setting-item>
        <setting-item name="玫瑰图">
          <ScenePropertySelect v-model="pieSeries.roseType" aria-label="玫瑰图模式">
            <template #prefix><span aria-hidden="true">模式</span></template>
            <el-option label="关闭" :value="false" />
            <el-option label="半径" value="radius" />
            <el-option label="面积" value="area" />
          </ScenePropertySelect>
        </setting-item>
      </setting-item-box>
      <setting-item-box name="标签">
        <setting-item name="显示">
          <ScenePropertySwitch v-model="pieSeries.label.show" />
        </setting-item>
        <setting-item name="字号">
          <ScenePropertyNumberInput
            v-model="pieSeries.label.fontSize"
            prefix="字号"
            aria-label="饼图标签字号"
            :min="1"
            :controls="false"
          />
        </setting-item>
        <setting-item name="颜色">
          <ScenePropertyColorPicker v-model="pieSeries.label.color" label="颜色" />
        </setting-item>
        <setting-item name="位置">
          <ScenePropertySelect v-model="pieSeries.label.position" aria-label="饼图标签位置">
            <template #prefix><span aria-hidden="true">位置</span></template>
            <el-option label="外侧" value="outside" />
            <el-option label="内部" value="inside" />
            <el-option label="中心" value="center" />
          </ScenePropertySelect>
        </setting-item>
      </setting-item-box>
      <setting-item-box name="标签线">
        <setting-item name="显示">
          <ScenePropertySwitch v-model="pieSeries.labelLine.show" />
        </setting-item>
        <setting-item name="长度1">
          <ScenePropertyNumberInput
            v-model="pieSeries.labelLine.length"
            prefix="一段"
            aria-label="饼图标签线第一段长度"
            :min="0"
            :controls="false"
          />
        </setting-item>
        <setting-item name="长度2">
          <ScenePropertyNumberInput
            v-model="pieSeries.labelLine.length2"
            prefix="二段"
            aria-label="饼图标签线第二段长度"
            :min="0"
            :controls="false"
          />
        </setting-item>
      </setting-item-box>
    </template>

    <template v-else-if="schema.family === 'gauge'">
      <setting-item-box name="范围">
        <setting-item name="最小值"
          ><ScenePropertyNumberInput
            v-model="gaugeSeries.min"
            prefix="最小"
            aria-label="仪表盘最小值"
            :controls="false"
        /></setting-item>
        <setting-item name="最大值"
          ><ScenePropertyNumberInput
            v-model="gaugeSeries.max"
            prefix="最大"
            aria-label="仪表盘最大值"
            :controls="false"
        /></setting-item>
        <setting-item name="开始角度"
          ><ScenePropertyNumberInput
            v-model="gaugeSeries.startAngle"
            prefix="起始角"
            aria-label="仪表盘开始角度"
            :controls="false"
        /></setting-item>
        <setting-item name="结束角度"
          ><ScenePropertyNumberInput
            v-model="gaugeSeries.endAngle"
            prefix="结束角"
            aria-label="仪表盘结束角度"
            :controls="false"
        /></setting-item>
      </setting-item-box>
      <setting-item-box name="轴线">
        <setting-item name="半径">
          <ScenePropertyInput
            :model-value="gaugeRadius"
            aria-label="仪表盘半径"
            @update:model-value="setGaugeRadius($event)"
          >
            <template #prefix><span aria-hidden="true">半径</span></template>
          </ScenePropertyInput>
        </setting-item>
        <setting-item name="线宽"
          ><ScenePropertyNumberInput
            v-model="gaugeSeries.axisLine.lineStyle.width"
            prefix="线宽"
            aria-label="仪表盘轴线宽度"
            :min="1"
            :controls="false"
        /></setting-item>
        <setting-item name="刻度分段"
          ><ScenePropertyNumberInput
            v-model="gaugeSeries.splitNumber"
            prefix="分段"
            aria-label="仪表盘刻度分段数"
            :min="1"
            :controls="false"
        /></setting-item>
      </setting-item-box>
      <setting-item-box name="进度/指针">
        <setting-item name="进度显示"
          ><ScenePropertySwitch v-model="gaugeSeries.progress.show"
        /></setting-item>
        <setting-item name="进度宽度"
          ><ScenePropertyNumberInput
            v-model="gaugeSeries.progress.width"
            prefix="进度宽"
            aria-label="仪表盘进度宽度"
            :min="1"
            :controls="false"
        /></setting-item>
        <setting-item name="进度色" v-if="isColorEditable(gaugeSeries.progress.itemStyle.color)"
          ><ScenePropertyColorPicker v-model="gaugeSeries.progress.itemStyle.color" label="进度色"
        /></setting-item>
        <setting-item name="指针宽度"
          ><ScenePropertyNumberInput
            v-model="gaugeSeries.pointer.width"
            prefix="指针宽"
            aria-label="仪表盘指针宽度"
            :min="1"
            :controls="false"
        /></setting-item>
        <setting-item name="指针长度"
          ><ScenePropertyInput v-model="gaugeSeries.pointer.length" aria-label="仪表盘指针长度">
            <template #prefix><span aria-hidden="true">指针长</span></template>
          </ScenePropertyInput></setting-item
        >
        <setting-item name="指针色" v-if="isColorEditable(gaugeSeries.pointer.itemStyle.color)"
          ><ScenePropertyColorPicker v-model="gaugeSeries.pointer.itemStyle.color" label="指针色"
        /></setting-item>
      </setting-item-box>
      <setting-item-box name="锚点/详情">
        <setting-item name="锚点显示"
          ><ScenePropertySwitch v-model="gaugeSeries.anchor.show"
        /></setting-item>
        <setting-item name="锚点大小"
          ><ScenePropertyNumberInput
            v-model="gaugeSeries.anchor.size"
            prefix="锚点"
            aria-label="仪表盘锚点大小"
            :min="1"
            :controls="false"
        /></setting-item>
        <setting-item name="锚点色" v-if="isColorEditable(gaugeSeries.anchor.itemStyle.color)"
          ><ScenePropertyColorPicker v-model="gaugeSeries.anchor.itemStyle.color" label="锚点色"
        /></setting-item>
        <setting-item name="数值字号"
          ><ScenePropertyNumberInput
            v-model="gaugeSeries.detail.fontSize"
            prefix="字号"
            aria-label="仪表盘数值字号"
            :min="1"
            :controls="false"
        /></setting-item>
        <setting-item name="数值颜色"
          ><ScenePropertyColorPicker v-model="gaugeSeries.detail.color" label="数值颜色"
        /></setting-item>
      </setting-item-box>
    </template>

    <template v-else-if="schema.family === 'radar'">
      <!-- 雷达图真实系列数据由数据面板维护，这里只编辑公共视觉样式，避免展开折叠面板时覆盖 series.data。 -->
      <setting-item-box name="公共样式">
        <setting-item name="线宽"
          ><ScenePropertyNumberInput
            v-model="radarSeries.lineStyle.width"
            prefix="线宽"
            aria-label="雷达系列线宽"
            :min="1"
            :controls="false"
        /></setting-item>
        <setting-item name="节点大小"
          ><ScenePropertyNumberInput
            v-model="radarSeries.symbolSize"
            prefix="节点"
            aria-label="雷达系列节点大小"
            :min="0"
            :controls="false"
        /></setting-item>
        <setting-item name="线色" v-if="isColorEditable(radarSeries.lineStyle.color)"
          ><ScenePropertyColorPicker v-model="radarSeries.lineStyle.color" label="线色"
        /></setting-item>
        <setting-item name="节点色" v-if="isColorEditable(radarSeries.itemStyle.color)"
          ><ScenePropertyColorPicker v-model="radarSeries.itemStyle.color" label="节点色"
        /></setting-item>
        <setting-item name="区域色" v-if="isColorEditable(radarSeries.areaStyle.color)"
          ><ScenePropertyColorPicker v-model="radarSeries.areaStyle.color" label="区域色"
        /></setting-item>
      </setting-item-box>
    </template>

    <template v-else-if="schema.family === 'sankey'">
      <setting-item-box name="节点">
        <setting-item name="宽度"
          ><ScenePropertyNumberInput
            v-model="sankeySeries.nodeWidth"
            prefix="宽度"
            aria-label="桑基图节点宽度"
            :min="1"
            :controls="false"
        /></setting-item>
        <setting-item name="间距"
          ><ScenePropertyNumberInput
            v-model="sankeySeries.nodeGap"
            prefix="间距"
            aria-label="桑基图节点间距"
            :min="1"
            :controls="false"
        /></setting-item>
        <setting-item name="标签色"
          ><ScenePropertyColorPicker v-model="sankeySeries.label.color" label="标签色"
        /></setting-item>
        <setting-item name="标签字号"
          ><ScenePropertyNumberInput
            v-model="sankeySeries.label.fontSize"
            prefix="字号"
            aria-label="桑基图标签字号"
            :min="1"
            :controls="false"
        /></setting-item>
      </setting-item-box>
      <setting-item-box name="连线">
        <setting-item name="透明度"
          ><ScenePropertyNumberInput
            v-model="sankeySeries.lineStyle.opacity"
            prefix="透明度"
            aria-label="桑基图连线透明度"
            :min="0"
            :max="1"
            :step="0.05"
            :controls="false"
        /></setting-item>
        <setting-item name="曲率"
          ><ScenePropertyNumberInput
            v-model="sankeySeries.lineStyle.curveness"
            prefix="曲率"
            aria-label="桑基图连线曲率"
            :min="0"
            :max="1"
            :step="0.05"
            :controls="false"
        /></setting-item>
      </setting-item-box>
      <setting-item-box name="布局">
        <setting-item name="左">
          <ScenePropertyInput v-model="sankeySeries.left" aria-label="桑基图左侧位置">
            <template #prefix><span aria-hidden="true">左</span></template>
          </ScenePropertyInput>
        </setting-item>
        <setting-item name="上">
          <ScenePropertyInput v-model="sankeySeries.top" aria-label="桑基图顶部位置">
            <template #prefix><span aria-hidden="true">上</span></template>
          </ScenePropertyInput>
        </setting-item>
        <setting-item name="右">
          <ScenePropertyInput v-model="sankeySeries.right" aria-label="桑基图右侧位置">
            <template #prefix><span aria-hidden="true">右</span></template>
          </ScenePropertyInput>
        </setting-item>
        <setting-item name="下">
          <ScenePropertyInput v-model="sankeySeries.bottom" aria-label="桑基图底部位置">
            <template #prefix><span aria-hidden="true">下</span></template>
          </ScenePropertyInput>
        </setting-item>
      </setting-item-box>
    </template>

    <template v-else-if="schema.family === 'treemap'">
      <!-- 数据节点由数据面板维护；这里只编辑系列级样式，避免属性面板覆盖 series.data。 -->
      <setting-item-box name="标签">
        <setting-item name="显示">
          <ScenePropertySwitch v-model="treemapSeries.label.show" />
        </setting-item>
        <setting-item name="字号">
          <ScenePropertyNumberInput
            v-model="treemapSeries.label.fontSize"
            prefix="字号"
            aria-label="矩形树图标签字号"
            :min="1"
            :controls="false"
          />
        </setting-item>
        <setting-item name="颜色">
          <ScenePropertyColorPicker v-model="treemapLabelColorModel" label="标签颜色" />
        </setting-item>
        <setting-item name="数值单位">
          <ScenePropertyInput v-model="treemapValueUnitModel" aria-label="矩形树图数值单位">
            <template #prefix><span aria-hidden="true">单位</span></template>
          </ScenePropertyInput>
        </setting-item>
      </setting-item-box>
      <setting-item-box name="块间距">
        <setting-item name="间距">
          <ScenePropertyNumberInput
            v-model="treemapSeries.itemStyle.gapWidth"
            prefix="间距"
            aria-label="矩形树图块间距"
            :min="0"
            :controls="false"
          />
        </setting-item>
        <setting-item name="间隙色">
          <ScenePropertyColorPicker v-model="treemapGapColorModel" label="间隙颜色" />
        </setting-item>
        <setting-item name="最小面积">
          <ScenePropertyNumberInput
            v-model="treemapSeries.visibleMin"
            prefix="最小面积"
            aria-label="矩形树图最小可见面积"
            :min="0"
            :controls="false"
          />
        </setting-item>
      </setting-item-box>
      <setting-item-box name="交互">
        <setting-item name="缩放拖动">
          <ScenePropertySwitch v-model="treemapSeries.roam" />
        </setting-item>
        <setting-item name="面包屑">
          <ScenePropertySwitch v-model="treemapSeries.breadcrumb.show" />
        </setting-item>
      </setting-item-box>
      <setting-item-box name="布局">
        <setting-item name="左">
          <ScenePropertyInput v-model="treemapSeries.left" aria-label="矩形树图左侧位置">
            <template #prefix><span aria-hidden="true">左</span></template>
          </ScenePropertyInput>
        </setting-item>
        <setting-item name="上">
          <ScenePropertyInput v-model="treemapSeries.top" aria-label="矩形树图顶部位置">
            <template #prefix><span aria-hidden="true">上</span></template>
          </ScenePropertyInput>
        </setting-item>
        <setting-item name="右">
          <ScenePropertyInput v-model="treemapSeries.right" aria-label="矩形树图右侧位置">
            <template #prefix><span aria-hidden="true">右</span></template>
          </ScenePropertyInput>
        </setting-item>
        <setting-item name="下">
          <ScenePropertyInput v-model="treemapSeries.bottom" aria-label="矩形树图底部位置">
            <template #prefix><span aria-hidden="true">下</span></template>
          </ScenePropertyInput>
        </setting-item>
      </setting-item-box>
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import SettingItem from '@/components/SettingItem/index.vue'
import SettingItemBox from '@/components/SettingItemBox/index.vue'
import ScenePropertyColorPicker from
  '@/views/sceneEdit/SceneRightPanel/components/PropertyControls/ScenePropertyColorPicker/index.vue'
import type {
  ChartGaugeSeriesOption,
  ChartPanelSchema,
  ChartPieSeriesOption,
  ChartSeriesOption,
  ChartTreemapSeriesOption,
} from './chartConfigTypes'
import {
  createTreemapLabelFormatter,
  extractTreemapValueUnit,
  getTreemapGapColor,
  getTreemapLabelColor,
  setTreemapGapColor,
  setTreemapLabelColor,
} from './treemapTheme'

const props = defineProps({
  active: { type: Boolean, required: true },
  schema: { type: Object as PropType<ChartPanelSchema>, required: true },
  lineSeries: { type: Array as PropType<ChartSeriesOption[]>, required: true },
  barSeries: { type: Array as PropType<ChartSeriesOption[]>, required: true },
  pieSeries: { type: Object as PropType<ChartPieSeriesOption>, required: true },
  gaugeSeries: { type: Object as PropType<ChartGaugeSeriesOption>, required: true },
  radarSeries: { type: Object as PropType<ChartSeriesOption>, required: true },
  sankeySeries: { type: Object as PropType<ChartSeriesOption>, required: true },
  treemapSeries: { type: Object as PropType<ChartTreemapSeriesOption>, required: true },
  seriesTitle: {
    type: Function as PropType<(seriesItem: ChartSeriesOption, index: number) => string>,
    required: true,
  },
  isColorEditable: {
    type: Function as PropType<(value: unknown) => boolean>,
    required: true,
  },
  borderRadiusTextModel: {
    type: Function as PropType<(seriesItem: ChartSeriesOption) => { value: string }>,
    required: true,
  },
  pieRadiusModel: {
    type: Object as PropType<{
      inner: { value: string | number }
      outer: { value: string | number }
    }>,
    required: true,
  },
  pieCenterModel: {
    type: Object as PropType<{ x: { value: string | number }; y: { value: string | number } }>,
    required: true,
  },
  gaugeRadius: { type: [String, Number] as PropType<string | number>, required: true },
  setGaugeRadius: { type: Function as PropType<(value: string | number) => void>, required: true },
})

/**
 * 单位通过标签格式化字符串持久化，避免向 ECharts 系列对象写入无效的自定义字段。
 * 计算模型只在用户编辑时重建字符串，不参与图表逐帧渲染。
 */
const treemapValueUnitModel = computed({
  get: () => extractTreemapValueUnit(props.treemapSeries.label.formatter),
  set: (value: string) => {
    props.treemapSeries.label.formatter = createTreemapLabelFormatter(value)
  },
})

/**
 * 矩形树图默认使用富文本标签，颜色必须同步到各分段，否则 label.color 会被覆盖。
 */
const treemapLabelColorModel = computed({
  get: () => getTreemapLabelColor(props.treemapSeries),
  set: (value: string) => setTreemapLabelColor(props.treemapSeries, value),
})

/**
 * 默认主题在 levels 中声明了间隙样式；同步系列级与层级样式，保证旧场景和新场景都立即生效。
 */
const treemapGapColorModel = computed({
  get: () => getTreemapGapColor(props.treemapSeries),
  set: (value: string) => setTreemapGapColor(props.treemapSeries, value),
})
</script>
