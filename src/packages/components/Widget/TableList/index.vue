<template>
  <div ref="containerRef" class="widget-table-list" :style="{ color: option.textColor }">
    <div
      v-for="(item, index) in visibleRows"
      :key="`${item.scroll}-${item.name}`"
      class="widget-table-list__row"
      :style="{ height: `${rowHeights[index] ?? averageRowHeight}px` }"
    >
      <div class="widget-table-list__info">
        <span
          class="widget-table-list__rank"
          :style="{ color: option.color, fontSize: `${option.indexFontSize}px` }"
        >
          No.{{ item.ranking }}
        </span>
        <span class="widget-table-list__name" :style="{ fontSize: `${option.leftFontSize}px` }">
          {{ item.name }}
        </span>
        <span
          class="widget-table-list__value"
          :style="{ color: option.textColor, fontSize: `${option.rightFontSize}px` }"
        >
          {{ item.valueText }}{{ option.unit }}
        </span>
      </div>
      <div class="widget-table-list__bar-track" :style="{ borderColor: option.borderColor }">
        <div
          class="widget-table-list__bar"
          :style="{ width: `${item.percent}%`, backgroundColor: option.color }"
        >
          <span class="widget-table-list__shine"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Config from './config'
import { toCellText, toFiniteNumber } from '../shared/tableRuntime'

defineOptions({ name: 'VTableList' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()

interface RankRow {
  scroll: number
  ranking: number
  name: string
  value: number
  valueText: string
  percent: number
}

const containerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(0)
const visibleRows = ref<RankRow[]>([])
const rowHeights = ref<number[]>([])
const animationIndex = ref(0)
let animationTimer = 0
let resizeObserver: ResizeObserver | null = null
let updateToken = 0

const safeRowNum = computed(() => Math.max(1, Math.floor(toFiniteNumber(props.option.rowNum, 5))))
const waitTimeMs = computed(() => Math.max(500, toFiniteNumber(props.option.waitTime, 2) * 1000))
const averageRowHeight = computed(() => {
  const height = containerHeight.value || containerRef.value?.clientHeight || 0
  return height > 0 ? height / safeRowNum.value : 0
})

const stopAnimation = () => {
  updateToken += 1
  if (animationTimer) {
    window.clearTimeout(animationTimer)
    animationTimer = 0
  }
}

const createRankRows = () => {
  const source = Array.isArray(props.option.dataset) ? props.option.dataset : []
  const sortedRows = source
    .map((item, index) => ({
      name: toCellText(item.name || `第${index + 1}项`),
      value: toFiniteNumber(item.value),
      valueText: toCellText(item.value),
    }))
    .sort((left, right) => (props.option.sort ? right.value - left.value : 0))

  const values = sortedRows.map((item) => item.value)
  const minValue = Math.min(...values, 0)
  const maxValue = Math.max(...values, 0)
  const minAbs = Math.abs(minValue)
  const total = maxValue + minAbs

  const rows = sortedRows.map<RankRow>((item, index) => ({
    ...item,
    ranking: index + 1,
    percent: total <= 0 ? 0 : Math.min(Math.max(((item.value + minAbs) / total) * 100, 0), 100),
    scroll: index,
  }))

  /**
   * 当数据条数只比可视行数略多时补一份数据。
   * 这样滚动到末尾不会突然出现空白，同时仍避免无限复制导致内存膨胀。
   */
  const rowLength = rows.length
  const loopRows =
    rowLength > safeRowNum.value && rowLength < safeRowNum.value * 2 ? [...rows, ...rows] : rows
  return loopRows.map((item, index) => ({ ...item, scroll: index }))
}

const applyInitialRows = (rows: RankRow[]) => {
  visibleRows.value = rows.slice(0, safeRowNum.value)
  rowHeights.value = new Array(Math.max(rows.length, safeRowNum.value)).fill(averageRowHeight.value)
}

const scheduleAnimation = (rows: RankRow[], token: number) => {
  if (rows.length <= safeRowNum.value || token !== updateToken) return

  animationTimer = window.setTimeout(async () => {
    if (token !== updateToken) return

    const animationNum = props.option.carousel === 'page' ? safeRowNum.value : 1
    const startIndex = animationIndex.value
    const rotatedRows = [...rows.slice(startIndex), ...rows.slice(0, startIndex)]
    visibleRows.value = rotatedRows.slice(0, safeRowNum.value + animationNum)
    rowHeights.value = new Array(rows.length).fill(averageRowHeight.value)

    await nextTick()
    if (token !== updateToken) return

    window.setTimeout(() => {
      if (token !== updateToken) return
      rowHeights.value.splice(0, animationNum, ...new Array(animationNum).fill(0))
      animationIndex.value = (startIndex + animationNum) % rows.length
      scheduleAnimation(rows, token)
    }, 300)
  }, waitTimeMs.value)
}

const restart = () => {
  stopAnimation()
  animationIndex.value = 0
  const rows = createRankRows()
  applyInitialRows(rows)
  scheduleAnimation(rows, updateToken)
}

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    containerHeight.value = entries[0]?.contentRect.height || 0
    restart()
  })
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
    containerHeight.value = containerRef.value.clientHeight
  }
  restart()
})

watch(
  () => [
    props.option.dataset,
    props.option.rowNum,
    props.option.waitTime,
    props.option.sort,
    props.option.carousel,
  ],
  restart,
  { deep: true },
)

onBeforeUnmount(() => {
  stopAnimation()
  resizeObserver?.disconnect()
})
</script>

<style scoped lang="scss">
.widget-table-list {
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
}
.widget-table-list__row {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  transition: height 0.3s ease;
}
.widget-table-list__info {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}
.widget-table-list__rank {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-index-font-family: v-bind("props.option.indexFontFamily || 'initial'");

  flex: 0 0 auto;
  margin-right: 5px;
  font-family: var(--widget-index-font-family, inherit);
  white-space: nowrap;
}
.widget-table-list__name {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-left-font-family: v-bind("props.option.leftFontFamily || 'initial'");

  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--widget-left-font-family, inherit);
  white-space: nowrap;
}
.widget-table-list__value {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-right-font-family: v-bind("props.option.rightFontFamily || 'initial'");

  flex: 0 0 auto;
  margin-left: 8px;
  font-family: var(--widget-right-font-family, inherit);
  white-space: nowrap;
}
.widget-table-list__bar-track {
  margin-top: 5px;
  border-bottom: 2px solid;
}
.widget-table-list__bar {
  position: relative;
  height: 6px;
  margin-bottom: 2px;
  overflow: hidden;
  border-radius: 1px;
  transition: width 0.2s ease-out;
}
.widget-table-list__shine {
  position: absolute;
  top: 2px;
  left: 0;
  width: 50px;
  height: 2px;
  background: radial-gradient(rgb(40 248 255) 5%, transparent 80%);
  animation: table-list-shine 3s ease-in-out infinite alternate;
}

@keyframes table-list-shine {
  80% {
    left: 0;
    transform: translateX(-100%);
  }
  100% {
    left: 100%;
    transform: translateX(0);
  }
}
</style>
