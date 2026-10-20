<template>
  <div ref="chartContainerRef" class="w-full h-full"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'

const props = defineProps({
  option: { type: Object, required: true },
})

const chartContainerRef = ref<HTMLElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)
let resizeFrame = 0

/**
 * 图表只允许在容器具备有效布局尺寸后初始化。
 *
 * 发布预览会把初始隐藏的二维组件保留在内存分片缓存中；历史场景或显隐切换仍可能让
 * 图表节点短暂处于 `display:none`。若在宽高为零时调用 ECharts 初始化，不仅会产生警告，
 * 还会固化错误画布尺寸。这里通过观察器拿到真实尺寸后再创建实例，并使用单个动画帧
 * 合并连续尺寸变化，避免拖拽缩放期间频繁同步重排。
 */
const syncChartSize = (width: number, height: number) => {
  if (width <= 0 || height <= 0) return
  if (resizeFrame) cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0
    const container = chartContainerRef.value
    if (!container) return
    if (!chart.value) {
      chart.value = echarts.init(container)
      setOption(props.option)
      return
    }
    chart.value.resize({ width, height })
  })
}

const setOption = (option: echarts.EChartsCoreOption) => {
  /**
   * 这里显式使用“非合并更新”。
   * 原因是当前编辑器会频繁在运行时重建图表结构：
   * 1. 系列数量会增减
   * 2. dataset 维度会变化
   * 3. 特殊图表会在不同数据结构之间切换
   *
   * 如果继续使用 ECharts 默认 merge，旧的 series / dataset / encode 很容易残留，
   * 最终表现为“新增数据组不显示”或“仍然沿用旧结构渲染”。
   * 这里优先保证结构更新正确，再考虑后续按需优化动画表现。
   */
  chart.value?.setOption(option, { notMerge: true })
}

watch(
  () => props.option,
  (newVal) => {
    setOption(newVal)
  },
  { deep: true },
)

const resizeObserver = new ResizeObserver(([entry]) => {
  if (!entry) return
  syncChartSize(entry.contentRect.width, entry.contentRect.height)
})

onMounted(() => {
  const container = chartContainerRef.value
  if (!container) return
  resizeObserver.observe(container)
  const rect = container.getBoundingClientRect()
  syncChartSize(rect.width, rect.height)
})

onUnmounted(() => {
  if (resizeFrame) cancelAnimationFrame(resizeFrame)
  resizeFrame = 0
  chart.value?.dispose()
  chart.value = null
  resizeObserver.disconnect()
})
</script>

<style scoped></style>
