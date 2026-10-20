<template>
  <main class="planting-dashboard">
    <img
      class="planting-dashboard__reference"
      src="/images/dashboard/planting-management-reference.png"
      alt="设计参考图层"
      aria-hidden="true"
    />
    <aside class="left-column">
      <section class="panel overview-panel">
        <PanelTitle title="种植总览" />
        <div class="metric-grid">
          <Metric label="地块总数" value="68" unit="块" />
          <Metric label="种植面积" value="4,200" unit="亩" />
        </div>
        <div class="overview-row">
          <span>种植中</span><b>3,580<small>亩</small></b
          ><span>闲置休耕</span><b>620<small>亩</small></b>
        </div>
        <div class="chart-title">种植面积 <small>(单位：亩)</small></div>
        <div ref="areaChartRef" class="chart chart--area" />
      </section>

      <section class="panel plan-panel">
        <PanelTitle title="种植计划" />
        <div class="metric-grid metric-grid--three">
          <Metric label="计划总量" value="24" unit="项" />
          <Metric label="运行中" value="4" unit="项" />
          <Metric label="预计总产量" value="1,280" unit="吨" />
        </div>
        <div class="plan-heading">
          <span>计划明细与进度</span><span><i class="legend-dot" />进度占比</span>
        </div>
        <div class="plan-table">
          <div class="plan-table__head">
            <span>计划名称</span><span>时间范围</span><span>进度</span><span>预计产量</span>
          </div>
          <PlanRow name="2026春兰种植计划" time="03.15-09.30" progress="95%" amount="280t" />
          <PlanRow name="2026党参育苗计划" time="04.01-10.15" progress="85%" amount="120t" />
          <PlanRow name="2026黄芪扩种计划" time="06.10-12.20" progress="42%" amount="95t" />
          <PlanRow name="2026人参轮作计划" time="07.01-12.31" progress="15%" amount="60t" />
        </div>
      </section>
    </aside>

    <aside class="right-column">
      <section class="panel harvest-panel">
        <PanelTitle title="采收产量总览" />
        <div class="metric-grid">
          <Metric label="已采收批次" value="36" unit="批" />
          <Metric label="总采收产量" value="680.5" unit="吨" />
        </div>
        <div class="chart-title">月度产量趋势 <small>(单位：t)</small></div>
        <div ref="harvestChartRef" class="chart chart--harvest" />
      </section>

      <section class="panel records-panel">
        <PanelTitle title="最近农事记录" />
        <table>
          <thead>
            <tr>
              <th>操作时间</th>
              <th>操作人</th>
              <th>地块</th>
              <th>种植品类</th>
              <th>农事类型</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>07-09 13:45</td>
              <td>张师傅</td>
              <td>DG-012</td>
              <td>当归</td>
              <td><em>灌溉</em></td>
            </tr>
            <tr>
              <td>07-09 10:22</td>
              <td>李师傅</td>
              <td>DS-008</td>
              <td>党参</td>
              <td><em>施肥</em></td>
            </tr>
            <tr>
              <td>07-09 09:36</td>
              <td>王师傅</td>
              <td>HQ-003</td>
              <td>黄芪</td>
              <td><em>病虫害防治</em></td>
            </tr>
            <tr>
              <td>07-09 09:11</td>
              <td>赵师傅</td>
              <td>DG-015</td>
              <td>当归</td>
              <td><em>播种/补种</em></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel statistics-panel">
        <PanelTitle title="农事统计记录" />
        <div class="metric-grid">
          <Metric label="农事总记录" value="1,280" unit="批" />
          <Metric label="已归档" value="1,000" unit="条" />
        </div>
        <div class="chart-title">农事类型分布 <small>(单位：条)</small></div>
        <div ref="taskChartRef" class="chart chart--task" />
      </section>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts/core'
import type { ECharts } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const areaChartRef = ref<HTMLElement>()
const harvestChartRef = ref<HTMLElement>()
const taskChartRef = ref<HTMLElement>()
const chartInstances: ECharts[] = []

const axisColor = 'rgba(224, 244, 235, .48)'
const gridColor = 'rgba(224, 244, 235, .13)'
const baseGrid = { left: 30, right: 10, top: 14, bottom: 26 }
const makeChart = (element: HTMLElement | undefined, option: EChartsOption) => {
  if (!element) return
  const chart = echarts.init(element)
  chart.setOption(option)
  chartInstances.push(chart)
}

onMounted(() => {
  makeChart(areaChartRef.value, {
    grid: baseGrid,
    xAxis: {
      type: 'category',
      data: ['当归', '党参', '黄芪', '大黄', '姜'],
      axisLabel: { color: axisColor },
      axisLine: { lineStyle: { color: axisColor } },
    },
    yAxis: {
      type: 'value',
      max: 600,
      splitNumber: 4,
      axisLabel: { color: axisColor },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    tooltip: { trigger: 'axis' },
    series: [
      {
        type: 'bar',
        barWidth: 20,
        itemStyle: { color: '#4bc76c' },
        label: { show: true, color: '#f5fff7', position: 'top', formatter: '{c}亩' },
        data: [280, 154, 410, 585, 352],
      },
    ],
  })
  makeChart(harvestChartRef.value, {
    grid: baseGrid,
    xAxis: {
      type: 'category',
      data: ['2025-07', '2025-09', '2025-11', '2026-01', '2026-03', '2026-05'],
      axisLabel: { color: axisColor },
      axisLine: { lineStyle: { color: axisColor } },
    },
    yAxis: {
      type: 'value',
      max: 150,
      splitNumber: 5,
      axisLabel: { color: axisColor },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    tooltip: { trigger: 'axis' },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#50c879', width: 2 },
        areaStyle: { color: 'rgba(63,193,105,.42)' },
        data: [58, 49, 85, 63, 127, 108],
      },
    ],
  })
  makeChart(taskChartRef.value, {
    grid: { ...baseGrid, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['播种/补种', '施肥', '病虫害防治', '灌溉'],
      axisLabel: { color: axisColor, interval: 0 },
    },
    yAxis: {
      type: 'value',
      max: 500,
      splitNumber: 5,
      axisLabel: { color: axisColor },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    tooltip: { trigger: 'axis' },
    series: [
      {
        type: 'bar',
        barWidth: 20,
        itemStyle: { color: '#4bc76c' },
        label: { show: true, color: '#f5fff7', position: 'top', formatter: '{c}条' },
        data: [280, 302, 180, 320],
      },
    ],
  })
  window.addEventListener('resize', resizeCharts)
})
const resizeCharts = () => chartInstances.forEach((chart) => chart.resize())
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  chartInstances.forEach((chart) => chart.dispose())
})
</script>

<script lang="ts">
import { defineComponent, h } from 'vue'
const PanelTitle = defineComponent({
  props: { title: { type: String, required: true } },
  setup: (props) => () => h('h2', { class: 'panel-title' }, [h('i'), props.title]),
})
const Metric = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String, required: true },
  },
  setup: (props) => () =>
    h('div', { class: 'metric' }, [
      h('span', null, props.label),
      h('b', null, [props.value, h('small', null, props.unit)]),
    ]),
})
const PlanRow = defineComponent({
  props: { name: String, time: String, progress: String, amount: String },
  setup: (props) => () =>
    h('div', { class: 'plan-table__row' }, [
      h('span', null, props.name),
      h('span', null, props.time),
      h('span', { class: 'progress' }, [
        h('i', { style: { width: props.progress } }),
        props.progress,
      ]),
      h('span', null, props.amount),
    ]),
})
export default { components: { PanelTitle, Metric, PlanRow } }
</script>

<style scoped lang="scss">
:global(body) {
  background: #071b13;
}
.planting-dashboard {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: 'Source Han Sans SC', 'Microsoft YaHei', sans-serif;
  color: #effff5;
  background: radial-gradient(circle at 50% 30%, #173a29 0%, #0d2419 50%, #08140e 100%);
}
.planting-dashboard__reference {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  object-fit: fill;
  opacity: 0.45;
}
.dashboard-header {
  position: absolute;
  inset: 0 0 auto;
  z-index: 5;
  display: flex;
  align-items: center;
  height: 72px;
  padding: 0 26px;
  color: #242d29;
  background: rgb(248 251 249 / 94%);
}
.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 225px;
  font-size: 22px;
  font-weight: 600;
  white-space: nowrap;
}
.brand img {
  width: 30px;
  height: 38px;
  object-fit: contain;
}
.main-nav {
  display: flex;
  gap: 36px;
  align-items: center;
  height: 100%;
}
.main-nav a {
  padding: 8px;
  font-size: 16px;
  color: #47514b;
  white-space: nowrap;
  text-decoration: none;
}
.main-nav a.active {
  font-weight: 700;
  color: #11552a;
  background: linear-gradient(180deg, transparent 40%, rgb(75 201 108 / 30%));
  border-bottom: 2px solid #3ec96c;
}
.main-nav--right {
  gap: 32px;
  margin-left: auto;
}
.dashboard-title {
  position: absolute;
  top: 0;
  left: 50%;
  display: grid;
  place-items: center;
  width: 500px;
  height: 80px;
  font-size: 30px;
  font-weight: 800;
  color: #0a361b;
  letter-spacing: 3px;
  /* 来源素材目录没有标题背景图，保留原本的透明显示，避免每次打开请求不存在的文件。 */
  background: transparent;
  transform: translateX(-50%);
}
.weather,
.clock,
.account {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: 22px;
  font-size: 14px;
  white-space: nowrap;
}
.weather {
  margin-left: 28px;
}
.weather small,
.clock small {
  display: block;
  font-size: 11px;
  opacity: 0.7;
}
.weather-icon {
  font-size: 22px;
}
.clock {
  flex-direction: column;
  gap: 0;
  align-items: flex-start;
}
.account {
  margin-left: 20px;
}
.account__avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: #11421e;
  background: #d4f9de;
  border-radius: 50%;
}
.panel {
  box-sizing: border-box;
  padding: 18px 16px;
  overflow: hidden;
  background: linear-gradient(135deg, rgb(26 30 25 / 94%), rgb(30 36 28 / 90%));
  border: 1px solid rgb(204 240 208 / 10%);
  box-shadow: 0 6px 24px rgb(0 0 0 / 12%);
  backdrop-filter: blur(2px);
}
.panel-title {
  display: flex;
  gap: 7px;
  align-items: center;
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 600;
}
.panel-title i {
  width: 3px;
  height: 18px;
  background: #4be37c;
}
.left-column,
.right-column {
  position: absolute;
  top: 94px;
  bottom: 18px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.left-column {
  left: 24px;
  width: 23%;
}
.right-column {
  right: 24px;
  width: 24%;
}
.overview-panel {
  flex: 1.55;
  min-height: 0;
}
.plan-panel {
  flex: 1;
  min-height: 0;
}
.harvest-panel {
  flex: 1;
  min-height: 0;
}
.records-panel {
  flex: 0.72;
  min-height: 0;
}
.statistics-panel {
  flex: 1.05;
  min-height: 0;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.metric-grid--three {
  grid-template-columns: repeat(3, 1fr);
}
.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 74px;
  padding: 7px;
  background: rgb(31 33 28 / 63%);
}
.metric span {
  font-size: 14px;
  color: rgb(240 255 245 / 80%);
}
.metric b {
  margin-top: 5px;
  font-size: 27px;
  font-weight: 500;
}
.metric small {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 400;
}
.overview-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  gap: 9px;
  align-items: center;
  padding: 9px 8px;
  margin-top: 8px;
  font-size: 13px;
  color: rgb(240 255 245 / 80%);
  background: rgb(31 33 28 / 48%);
}
.overview-row b {
  font-size: 18px;
  font-weight: 500;
  color: #f5fff7;
}
.overview-row small {
  margin-left: 3px;
  font-size: 11px;
  font-weight: 400;
}
.chart-title {
  padding-top: 10px;
  margin-top: 14px;
  font-size: 14px;
  color: #f2fff5;
  border-top: 1px solid rgb(222 255 230 / 15%);
}
.chart-title small {
  font-size: 11px;
  color: rgb(240 255 245 / 62%);
}
.chart {
  width: 100%;
}
.chart--area {
  height: 300px;
}
.chart--harvest {
  height: 168px;
}
.chart--task {
  height: 180px;
}
.plan-heading {
  display: flex;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 12px;
  font-size: 13px;
  color: rgb(240 255 245 / 84%);
  border-top: 1px solid rgb(222 255 230 / 15%);
}
.legend-dot {
  display: inline-block;
  width: 16px;
  height: 6px;
  margin-right: 4px;
  background: #4acb77;
  border-radius: 4px;
}
.plan-table {
  margin-top: 8px;
  font-size: 12px;
}
.plan-table__head,
.plan-table__row {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 0.65fr;
  gap: 8px;
  align-items: center;
  padding: 8px 3px;
  border-bottom: 1px solid rgb(222 255 230 / 12%);
}
.plan-table__head {
  color: rgb(240 255 245 / 62%);
}
.plan-table__row {
  color: #f0fff4;
}
.progress {
  display: flex;
  gap: 5px;
  align-items: center;
}
.progress i {
  display: block;
  width: 40px;
  max-width: 65px;
  height: 5px;
  background: #46c976;
  border-radius: 5px;
}
table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
}
th,
td {
  padding: 8px 4px;
  text-align: left;
  border-bottom: 1px solid rgb(222 255 230 / 13%);
}
th {
  font-weight: 400;
  color: rgb(240 255 245 / 60%);
  background: rgb(235 255 241 / 8%);
}
td {
  color: rgb(247 255 249 / 90%);
}
td em {
  padding: 2px 5px;
  font-style: normal;
  color: #51e487;
  background: rgb(23 191 95 / 16%);
}

@media (width <= 1280px) {
  .main-nav {
    gap: 14px;
  }
  .main-nav a {
    font-size: 13px;
  }
  .brand {
    width: 170px;
    font-size: 18px;
  }
  .dashboard-title {
    width: 380px;
    font-size: 24px;
  }
  .left-column {
    left: 14px;
    width: 25%;
  }
  .right-column {
    right: 14px;
    width: 26%;
  }
  .panel {
    padding: 12px;
  }
  .metric b {
    font-size: 21px;
  }
}

@media (height <= 900px) {
  .left-column,
  .right-column {
    top: 78px;
    bottom: 10px;
    gap: 10px;
  }
  .panel {
    padding: 11px 12px;
  }
  .panel-title {
    margin-bottom: 8px;
    font-size: 14px;
  }
  .panel-title i {
    height: 14px;
  }
  .metric {
    min-height: 54px;
    padding: 4px;
  }
  .metric span {
    font-size: 11px;
  }
  .metric b {
    margin-top: 2px;
    font-size: 18px;
  }
  .overview-row {
    padding: 6px;
    margin-top: 5px;
    font-size: 11px;
  }
  .overview-row b {
    font-size: 14px;
  }
  .chart-title {
    padding-top: 7px;
    margin-top: 8px;
    font-size: 11px;
  }
  .chart--area {
    height: 190px;
  }
  .chart--harvest {
    height: 100px;
  }
  .chart--task {
    height: 120px;
  }
  .plan-heading {
    padding-top: 7px;
    margin-top: 7px;
    font-size: 11px;
  }
  .plan-table,
  table {
    font-size: 10px;
  }
  .plan-table__head,
  .plan-table__row,
  th,
  td {
    padding: 5px 3px;
  }
}
</style>
