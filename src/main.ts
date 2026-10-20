import './assets/main.css'
// 二维迁移阶段只注册页面和组件样式，不加载浏览器三维引擎。
import 'element-plus/theme-chalk/src/index.scss'
import './views/manageShared/theme.scss'
import 'animate.css/animate.min.css'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import piniaStore from '@/stores/pinia'
import globalComponent from '@/utils/globalComponent'
import globalProperties from '@/utils/globalProperties'


import * as echarts from 'echarts/core'
import {
  BarChart,
  GaugeChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  TreemapChart,
} from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  RadarComponent,
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import '@/utils/monaco'

// 注册必须的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  RadarComponent,
  BarChart,
  GaugeChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  // 矩形树图按需注册，保持入口能力清单与资源面板实际图表类型一致。
  TreemapChart,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
])

const app = createApp(App)

app.use(piniaStore)
app.use(router)
app.use(globalComponent)
app.use(globalProperties)

// 由应用组合根在挂载业务路由前完成独立登录或宿主鉴权；不再调用旧地址发现接口。
app.mount('#app')
window['$vue'] = app
