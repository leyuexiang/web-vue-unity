<template>
  <div ref="containerRef" class="widget-table-scroll-board">
    <div
      v-if="displayHeader.length"
      class="widget-table-scroll-board__header"
      :style="{ backgroundColor: option.headerBGC, height: `${safeHeaderHeight}px` }"
    >
      <div
        v-for="(headerItem, index) in displayHeader"
        :key="`${headerItem}-${index}`"
        class="widget-table-scroll-board__header-cell"
        :style="{
          width: `${columnWidths[index] ?? autoColumnWidth}px`,
          lineHeight: `${safeHeaderHeight}px`,
          textAlign: columnAligns[index],
        }"
      >
        {{ headerItem }}
      </div>
    </div>

    <div class="widget-table-scroll-board__rows" :style="{ height: `${rowsHeight}px` }">
      <div
        v-for="(row, rowIndex) in visibleRows"
        :key="`${row.scroll}-${row.rowIndex}`"
        class="widget-table-scroll-board__row"
        :style="{
          height: `${rowHeights[rowIndex] ?? averageRowHeight}px`,
          lineHeight: `${rowHeights[rowIndex] ?? averageRowHeight}px`,
          backgroundColor: row.rowIndex % 2 === 0 ? option.evenRowBGC : option.oddRowBGC,
        }"
      >
        <div
          v-for="(cell, cellIndex) in row.cells"
          :key="`${row.scroll}-${cellIndex}`"
          class="widget-table-scroll-board__cell"
          :class="{ 'is-index': option.index && cellIndex === 0 }"
          :style="{
            width: `${columnWidths[cellIndex] ?? autoColumnWidth}px`,
            textAlign: columnAligns[cellIndex],
          }"
        >
          <span
            v-if="option.index && cellIndex === 0"
            class="widget-table-scroll-board__index"
            :style="{ backgroundColor: option.headerBGC }"
          >
            {{ cell }}
          </span>
          <span v-else>{{ cell }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Config from './config'
import { toCellText, toFiniteNumber } from '../shared/tableRuntime'
import type { TableAlign, TableCellValue } from '../shared/tableTypes'

defineOptions({ name: 'VTableScrollBoard' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()

interface ScrollBoardRow {
  cells: string[]
  rowIndex: number
  scroll: number
}

const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const containerHeight = ref(0)
const visibleRows = ref<ScrollBoardRow[]>([])
const rowHeights = ref<number[]>([])
const animationIndex = ref(0)
let animationTimer = 0
let resizeObserver: ResizeObserver | null = null
let updateToken = 0

const safeRowNum = computed(() => Math.max(1, Math.floor(toFiniteNumber(props.option.rowNum, 5))))
const safeHeaderHeight = computed(() => Math.max(0, toFiniteNumber(props.option.headerHeight, 35)))
const waitTimeMs = computed(() => Math.max(500, toFiniteNumber(props.option.waitTime, 2) * 1000))
const displayHeader = computed(() =>
  props.option.index ? ['#', ...props.option.header] : props.option.header,
)
const rowsHeight = computed(() =>
  Math.max((containerHeight.value || 0) - safeHeaderHeight.value, 0),
)
const averageRowHeight = computed(() => {
  const height = rowsHeight.value
  return height > 0 ? height / safeRowNum.value : 0
})

const columnCount = computed(() => {
  const dataColumnCount = props.option.dataset.reduce(
    (maxCount, row) => Math.max(maxCount, Array.isArray(row) ? row.length : 0),
    0,
  )
  return Math.max(displayHeader.value.length, dataColumnCount + (props.option.index ? 1 : 0))
})

const autoColumnWidth = computed(() => {
  const fixedWidth = props.option.columnWidth
    .slice(0, columnCount.value)
    .reduce((total, width) => total + Math.max(toFiniteNumber(width), 0), 0)
  const autoCount = Math.max(columnCount.value - props.option.columnWidth.length, 1)
  return Math.max(((containerWidth.value || 0) - fixedWidth) / autoCount, 0)
})

const columnWidths = computed(() =>
  Array.from({ length: columnCount.value }, (_, index) => {
    const fixedWidth = props.option.columnWidth[index]
    return fixedWidth !== undefined
      ? Math.max(toFiniteNumber(fixedWidth), 0)
      : autoColumnWidth.value
  }),
)

const columnAligns = computed<TableAlign[]>(() =>
  Array.from({ length: columnCount.value }, (_, index) => props.option.align[index] || 'left'),
)

const stopAnimation = () => {
  updateToken += 1
  if (animationTimer) {
    window.clearTimeout(animationTimer)
    animationTimer = 0
  }
}

const createRows = () => {
  const rows = props.option.dataset.map<ScrollBoardRow>((row, index) => {
    const cells = (Array.isArray(row) ? row : ([] as TableCellValue[])).map(toCellText)
    return {
      cells: props.option.index ? [String(index + 1), ...cells] : cells,
      rowIndex: index,
      scroll: index,
    }
  })

  /**
   * 数据量略高于可视行时复制一轮，避免滚动到底部出现断档。
   * 只复制一次，能满足视觉连续性，也不会在大数据场景下放大内存。
   */
  const rowLength = rows.length
  const loopRows =
    rowLength > safeRowNum.value && rowLength < safeRowNum.value * 2 ? [...rows, ...rows] : rows
  return loopRows.map((item, index) => ({
    ...item,
    scroll: index,
  }))
}

const applyInitialRows = (rows: ScrollBoardRow[]) => {
  visibleRows.value = rows.slice(0, safeRowNum.value)
  rowHeights.value = new Array(Math.max(rows.length, safeRowNum.value)).fill(averageRowHeight.value)
}

const scheduleAnimation = (rows: ScrollBoardRow[], token: number) => {
  if (rows.length <= safeRowNum.value || token !== updateToken) return

  animationTimer = window.setTimeout(async () => {
    if (token !== updateToken) return

    const animationNum = props.option.carousel === 'page' ? safeRowNum.value : 1
    const startIndex = animationIndex.value
    const rotatedRows = [...rows.slice(startIndex), ...rows.slice(0, startIndex)]
    visibleRows.value = rotatedRows.slice(
      0,
      props.option.carousel === 'page' ? safeRowNum.value * 2 : safeRowNum.value + 1,
    )
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
  const rows = createRows()
  applyInitialRows(rows)
  scheduleAnimation(rows, updateToken)
}

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    containerWidth.value = rect?.width || 0
    containerHeight.value = rect?.height || 0
    restart()
  })
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
    containerWidth.value = containerRef.value.clientWidth
    containerHeight.value = containerRef.value.clientHeight
  }
  restart()
})

watch(
  () => [
    props.option.header,
    props.option.dataset,
    props.option.index,
    props.option.columnWidth,
    props.option.align,
    props.option.rowNum,
    props.option.waitTime,
    props.option.headerHeight,
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
.widget-table-scroll-board {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: #ffffff;
  user-select: none;
}
.widget-table-scroll-board__header,
.widget-table-scroll-board__row {
  display: flex;
  width: 100%;
  overflow: hidden;
}
.widget-table-scroll-board__header {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-header-font-family: v-bind("props.option.headerFontFamily || 'initial'");

  font-family: var(--widget-header-font-family, inherit);
  font-size: 15px;
  font-weight: 600;
}
.widget-table-scroll-board__header-cell,
.widget-table-scroll-board__cell {
  box-sizing: border-box;
  flex: 0 0 auto;
  min-width: 0;
  padding: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: width 0.3s ease;
}
.widget-table-scroll-board__rows {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-body-font-family: v-bind("props.option.bodyFontFamily || 'initial'");

  overflow: hidden;
  font-family: var(--widget-body-font-family, inherit);
}
.widget-table-scroll-board__row {
  font-size: 14px;
  transition: height 0.3s ease;
}
.widget-table-scroll-board__index {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-index-font-family: v-bind("props.option.indexFontFamily || 'initial'");

  display: inline-block;
  min-width: 18px;
  padding: 0 4px;
  font-family: var(--widget-index-font-family, inherit);
  line-height: 18px;
  border-radius: 3px;
}
</style>
