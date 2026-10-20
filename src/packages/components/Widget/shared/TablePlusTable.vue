<template>
  <section
    class="widget-table-plus"
    :class="[
      `is-${variant}`,
      {
        'has-border': style.bordered,
        'has-h-line': style.hLine,
        'has-v-line': style.vLine,
        'has-stripe': style.stripe,
      },
    ]"
    :style="tableStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @wheel="handleWheel"
  >
    <div
      v-if="style.colHeaders"
      class="widget-table-plus__viewport widget-table-plus__viewport--header"
    >
      <table class="widget-table-plus__table">
        <colgroup>
          <col
            v-for="column in columns"
            :key="`header-${column.key}`"
            :style="getColumnStyle(column)"
          />
        </colgroup>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key">{{ column.title }}</th>
          </tr>
        </thead>
      </table>
    </div>

    <div
      ref="bodyViewport"
      class="widget-table-plus__viewport widget-table-plus__viewport--body"
      :class="{ 'is-scrollable': variant === 'scroll', 'is-dragging': isDragging }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
    >
      <table class="widget-table-plus__table">
        <colgroup>
          <col
            v-for="column in columns"
            :key="`body-${column.key}`"
            :style="getColumnStyle(column)"
          />
        </colgroup>
        <tbody>
          <tr
            v-for="(renderedRow, rowIndex) in renderedTableRows"
            :key="`${String(renderedRow.row.key)}-${rowIndex}-${scrollRenderKey}`"
            :class="{ 'is-striped': isStripedRow(rowIndex) }"
          >
            <td
              v-for="cell in renderedRow.cells"
              :key="`${String(renderedRow.row.key)}-${cell.column.key}`"
              :style="{ color: getCellTextColor(cell.column, cell.value) }"
            >
              <a
                v-if="cell.link"
                class="widget-table-plus__link"
                :href="cell.link"
                :target="cell.column.link?.target || '_self'"
                :rel="cell.column.link?.target === '_blank' ? 'noopener noreferrer' : undefined"
                @click="handleLinkClick"
              >
                {{ cell.column.link?.text || toCellText(cell.value) }}
              </a>
              <template v-else>{{ toCellText(cell.value) }}</template>
            </td>
          </tr>
          <tr v-if="renderedTableRows.length === 0">
            <td class="widget-table-plus__empty" :colspan="Math.max(columns.length, 1)">
              暂无数据
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer
      v-if="variant === 'pagination'"
      class="widget-table-plus__pagination"
      aria-label="表格分页"
    >
      <span class="widget-table-plus__total">共 {{ totalItems }} 条</span>
      <button
        type="button"
        :disabled="currentPage <= 1"
        aria-label="上一页"
        @click="setPage(currentPage - 1)"
      >
        ‹
      </button>
      <button
        v-for="item in pageItems"
        :key="item.key"
        type="button"
        :disabled="item.type === 'ellipsis'"
        :class="{ 'is-active': item.type === 'page' && item.value === currentPage }"
        @click="item.type === 'page' && setPage(item.value)"
      >
        {{ item.type === 'ellipsis' ? '…' : item.value }}
      </button>
      <button
        type="button"
        :disabled="currentPage >= pageCount"
        aria-label="下一页"
        @click="setPage(currentPage + 1)"
      >
        ›
      </button>
      <select v-model.number="selectedPageSize" aria-label="每页数量">
        <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} 条/页</option>
      </select>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  TablePlusColumn,
  TablePlusOption,
  TablePlusStyle,
  TablePlusVariant,
} from './tableTypes'
import { resolveTableCellLink, toCellText, toFiniteNumber } from './tableRuntime'
import { getWidgetRuntimePort } from '@/integrations/scene/widgetRuntime'

interface PageItem {
  key: string
  type: 'page' | 'ellipsis'
  value: number
}

const props = defineProps<{
  option: TablePlusOption
  variant: TablePlusVariant
}>()

const scrollStart = ref(0)
const isPaused = ref(false)
const isPointerInside = ref(false)
const isDragging = ref(false)
const hasDragged = ref(false)
const currentPageState = ref(
  Math.max(1, Math.floor(toFiniteNumber(props.option?.pagination?.page, 1))),
)
const selectedPageSize = ref(
  Math.max(1, Math.floor(toFiniteNumber(props.option?.pagination?.pageSize, 10))),
)
const scrollRenderKey = ref(0)
const bodyViewport = ref<HTMLElement | null>(null)
let scrollTimer: number | undefined

const dragState = {
  active: false,
  pointerId: -1,
  startY: 0,
  startScrollTop: 0,
  startScrollIndex: 0,
}

const option = computed(() => props.option || ({} as TablePlusOption))
const variant = computed(() => props.variant)
const columns = computed<TablePlusColumn[]>(() => option.value.dataset?.dimensions || [])
const rows = computed(() => option.value.dataset?.source || [])
const defaultStyle: TablePlusStyle = {
  colHeaders: true,
  bordered: false,
  hLine: false,
  vLine: false,
  stripe: false,
  stripeColor: '#407FFF1F',
  background: 'transparent',
  headerBackground: '#303746',
  textColor: '#E3E8F4',
  headerTextColor: '#FFFFFF',
  borderColor: '#407FFF66',
  fontSize: 14,
}
const style = computed<TablePlusStyle>(() =>
  Object.assign({}, defaultStyle, option.value.style || {}),
)

const tableStyle = computed(() => ({
  '--table-plus-row-height': `${Math.max(20, toFiniteNumber(option.value.rowHeight, 32))}px`,
  '--table-plus-col-width': `${Math.max(40, toFiniteNumber(option.value.colWidth, 90))}px`,
  '--table-plus-font-size': `${Math.max(10, toFiniteNumber(style.value.fontSize, 14))}px`,
  '--table-plus-text-color': style.value.textColor,
  '--table-plus-header-text-color': style.value.headerTextColor,
  '--table-plus-header-background': style.value.headerBackground,
  '--table-plus-background': style.value.background,
  '--table-plus-border-color': style.value.borderColor,
  '--table-plus-stripe-color': style.value.stripeColor,
  textAlign: option.value.align || 'center',
}))

const safeMaxNum = computed(() => {
  const configured = Math.floor(toFiniteNumber(option.value.maxNum, 0))
  return configured > 0 ? configured : Math.max(1, rows.value.length)
})

const pageSizeOptions = computed(() => {
  const configured = option.value.pagination?.pageSizeOptions || [5, 10, 20, 30]
  const values = configured
    .map((item) => Math.max(1, Math.floor(toFiniteNumber(item))))
    .filter(Boolean)
  const pageSize = Math.max(1, Math.floor(toFiniteNumber(option.value.pagination?.pageSize, 10)))
  return [...new Set([pageSize, ...values])].sort((left, right) => left - right)
})

const normalizePageSize = (value: unknown) => Math.max(1, Math.floor(toFiniteNumber(value, 10)))

const totalItems = computed(() => {
  const configured = toFiniteNumber(option.value.pagination?.total, 0)
  return Math.max(0, configured || rows.value.length)
})

const pageCount = computed(() => Math.max(1, Math.ceil(totalItems.value / selectedPageSize.value)))
const currentPage = computed(() => Math.min(Math.max(currentPageState.value, 1), pageCount.value))

const pageItems = computed<PageItem[]>(() => {
  const maxButtons = Math.max(
    5,
    Math.floor(toFiniteNumber(option.value.pagination?.maxPageBtn, 5)) | 1,
  )
  if (pageCount.value <= maxButtons) {
    return Array.from({ length: pageCount.value }, (_, index) => ({
      key: `page-${index + 1}`,
      type: 'page',
      value: index + 1,
    }))
  }

  const items: PageItem[] = [{ key: 'page-1', type: 'page', value: 1 }]
  const middleStart = Math.max(2, currentPage.value - Math.floor((maxButtons - 3) / 2))
  const middleEnd = Math.min(pageCount.value - 1, middleStart + maxButtons - 3)
  if (middleStart > 2) items.push({ key: 'ellipsis-left', type: 'ellipsis', value: 0 })
  for (let page = middleStart; page <= middleEnd; page += 1) {
    items.push({ key: `page-${page}`, type: 'page', value: page })
  }
  if (middleEnd < pageCount.value - 1)
    items.push({ key: 'ellipsis-right', type: 'ellipsis', value: 0 })
  items.push({ key: `page-${pageCount.value}`, type: 'page', value: pageCount.value })
  return items
})

const renderedRows = computed(() => {
  if (variant.value === 'pagination') {
    const start = (currentPage.value - 1) * selectedPageSize.value
    return rows.value.slice(start, start + selectedPageSize.value)
  }

  if (variant.value !== 'scroll') return rows.value.slice(0, safeMaxNum.value)
  if (!rows.value.length) return []

  const visibleCount = Math.min(safeMaxNum.value, rows.value.length)
  return Array.from(
    { length: visibleCount },
    (_, index) => rows.value[(scrollStart.value + index) % rows.value.length],
  )
})

/** 单元格链接随当前可见行统一派生，避免模板每次渲染重复创建 URL 对象。 */
const renderedTableRows = computed(() => {
  const currentUrl = typeof window === 'undefined' ? 'http://localhost/' : window.location.href
  return renderedRows.value.map((row) => ({
    row,
    cells: columns.value.map((column) => ({
      column,
      value: row[column.key],
      link: resolveTableCellLink(column, row, currentUrl),
    })),
  }))
})

const getColumnStyle = (column: TablePlusColumn) => ({
  width: `${Math.max(40, toFiniteNumber(column.width, option.value.colWidth || 90))}px`,
})

const getCellTextColor = (column: TablePlusColumn, value: unknown) =>
  option.value.cellTextColors?.[column.key]?.[toCellText(value)] || style.value.textColor

/** 编辑态只保留超链接外观和语义，预览/发布态才执行跳转，避免配置时误离开场景。 */
const handleLinkClick = (event: MouseEvent) => {
  event.stopPropagation()
  if (!getWidgetRuntimePort().isPreview()) event.preventDefault()
}

const isStripedRow = (rowIndex: number) => {
  if (!style.value.stripe) return false
  const absoluteIndex =
    variant.value === 'pagination'
      ? (currentPage.value - 1) * selectedPageSize.value + rowIndex
      : variant.value === 'scroll'
        ? (scrollStart.value + rowIndex) % Math.max(rows.value.length, 1)
        : rowIndex
  return absoluteIndex % 2 === 1
}

const clearScrollTimer = () => {
  if (scrollTimer !== undefined) {
    window.clearInterval(scrollTimer)
    scrollTimer = undefined
  }
}

const normalizeScrollStart = (value: number) => {
  if (!rows.value.length) return 0
  return ((value % rows.value.length) + rows.value.length) % rows.value.length
}

const setScrollStart = (value: number) => {
  const nextStart = normalizeScrollStart(value)
  if (nextStart === scrollStart.value) return
  scrollStart.value = nextStart
  scrollRenderKey.value += 1
}

const resetBodyScroll = () => {
  if (variant.value !== 'scroll' && bodyViewport.value) {
    bodyViewport.value.scrollTop = 0
  }
}

const startScrollTimer = () => {
  clearScrollTimer()
  if (variant.value !== 'scroll' || !option.value.swiper || rows.value.length <= safeMaxNum.value)
    return
  const delay = Math.max(500, toFiniteNumber(option.value.waitTime, 2) * 1000)
  scrollTimer = window.setInterval(() => {
    if (isPaused.value) return
    const step = option.value.carousel === 'page' ? safeMaxNum.value : 1
    setScrollStart(scrollStart.value + step)
  }, delay)
}

const handleMouseEnter = () => {
  isPointerInside.value = true
  isPaused.value = true
}

const handleMouseLeave = () => {
  isPointerInside.value = false
  if (!dragState.active) isPaused.value = false
}

const handleWheel = (event: WheelEvent) => {
  if (variant.value !== 'scroll' || rows.value.length <= safeMaxNum.value || event.deltaY === 0) {
    return
  }
  event.preventDefault()
  const direction = event.deltaY > 0 ? 1 : -1
  setScrollStart(scrollStart.value + direction)
}

const handlePointerDown = (event: PointerEvent) => {
  if (event.button !== 0 || !bodyViewport.value) return

  const target = event.target as HTMLElement | null
  if (target?.closest('a,button,select,input,textarea')) return

  dragState.active = true
  dragState.pointerId = event.pointerId
  dragState.startY = event.clientY
  dragState.startScrollTop = bodyViewport.value.scrollTop
  dragState.startScrollIndex = scrollStart.value
  hasDragged.value = false
  isDragging.value = true
  isPaused.value = true
  bodyViewport.value.setPointerCapture(event.pointerId)
}

const handlePointerMove = (event: PointerEvent) => {
  if (!dragState.active || event.pointerId !== dragState.pointerId || !bodyViewport.value) return

  const deltaY = dragState.startY - event.clientY
  if (Math.abs(deltaY) >= 4) hasDragged.value = true

  if (variant.value === 'scroll') {
    const rowHeight = Math.max(20, toFiniteNumber(option.value.rowHeight, 32))
    const rowOffset = Math.round(deltaY / rowHeight)
    setScrollStart(dragState.startScrollIndex + rowOffset)
  } else {
    bodyViewport.value.scrollTop = Math.max(0, dragState.startScrollTop + deltaY)
  }

  if (hasDragged.value) event.preventDefault()
}

const handlePointerUp = (event: PointerEvent) => {
  if (!dragState.active || event.pointerId !== dragState.pointerId) return

  if (bodyViewport.value?.hasPointerCapture(event.pointerId)) {
    bodyViewport.value.releasePointerCapture(event.pointerId)
  }
  dragState.active = false
  dragState.pointerId = -1
  isDragging.value = false
  isPaused.value = isPointerInside.value
}

const setPage = (page: number) => {
  if (variant.value !== 'pagination') return
  currentPageState.value = Math.min(Math.max(Math.floor(page), 1), pageCount.value)
}

watch(
  () => option.value.pagination?.page,
  (page) => {
    currentPageState.value = Math.max(1, Math.floor(toFiniteNumber(page, 1)))
  },
  { immediate: true },
)

watch(
  () => option.value.pagination?.pageSize,
  (pageSize) => {
    const nextPageSize = normalizePageSize(pageSize)
    if (selectedPageSize.value !== nextPageSize) selectedPageSize.value = nextPageSize
  },
  { immediate: true },
)

watch(
  pageSizeOptions,
  (sizes) => {
    if (!sizes.includes(selectedPageSize.value)) selectedPageSize.value = sizes[0] || 10
  },
  { immediate: true },
)

watch(selectedPageSize, (size) => {
  if (size > 0) setPage(currentPage.value)
})

watch(pageCount, () => setPage(currentPage.value))

watch(
  () => [
    option.value.dataset,
    option.value.maxNum,
    option.value.swiper,
    option.value.waitTime,
    option.value.carousel,
  ],
  () => {
    scrollStart.value = 0
    startScrollTimer()
    nextTick(resetBodyScroll)
  },
  { deep: true },
)

watch(currentPage, () => nextTick(resetBodyScroll))

onMounted(() => startScrollTimer())

onBeforeUnmount(() => {
  clearScrollTimer()
})
</script>

<style scoped lang="scss">
.widget-table-plus {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  font-size: var(--table-plus-font-size);
  color: var(--table-plus-text-color);
  user-select: none;
  background: var(--table-plus-background);
  border: 0 solid transparent;
}
.widget-table-plus.has-border {
  border-color: var(--table-plus-border-color);
  border-width: 1px;
}
.widget-table-plus__viewport {
  min-height: 0;
  overflow: auto;
}
.widget-table-plus__viewport--body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: none;
  cursor: grab;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.widget-table-plus__viewport--body::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.widget-table-plus__viewport--body.is-dragging {
  cursor: grabbing;
}
.widget-table-plus.is-zebra .widget-table-plus__viewport {
  overflow: auto;
}
.widget-table-plus__viewport--header {
  flex: 0 0 auto;
  overflow: hidden;
}
.is-scrollable {
  flex: 1 1 auto;
  overflow: hidden;
}
.widget-table-plus.is-scroll .widget-table-plus__viewport--body {
  overflow: hidden;
}
.widget-table-plus__table {
  width: 100%;
  min-width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.widget-table-plus__table th,
.widget-table-plus__table td {
  box-sizing: border-box;
  height: var(--table-plus-row-height);
  padding: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--table-plus-row-height);
  text-align: inherit;
  white-space: nowrap;
}
.widget-table-plus__table th {
  color: var(--table-plus-header-text-color);
  background: var(--table-plus-header-background);
}
.widget-table-plus__table tr.is-striped td {
  background: var(--table-plus-stripe-color);
}
.widget-table-plus.has-h-line .widget-table-plus__table tr:not(:last-child) td {
  border-bottom: 1px solid var(--table-plus-border-color);
}
.widget-table-plus.has-v-line .widget-table-plus__table th:not(:last-child),
.widget-table-plus.has-v-line .widget-table-plus__table td:not(:last-child) {
  border-right: 1px solid var(--table-plus-border-color);
}
.widget-table-plus.has-h-line .widget-table-plus__viewport--header th {
  border-bottom: 1px solid var(--table-plus-border-color);
}
.widget-table-plus__empty {
  color: rgb(227 232 244 / 58%);
  text-align: center;
}
.widget-table-plus__link {
  color: #4583ff;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.widget-table-plus__link:hover,
.widget-table-plus__link:focus-visible {
  color: #73a2ff;
}
.widget-table-plus__pagination {
  display: flex;
  flex: 0 0 auto;
  gap: 5px;
  align-items: center;
  justify-content: flex-end;
  min-height: 34px;
  padding: 4px 6px;
  font-size: 12px;
  color: var(--table-plus-text-color);
}
.widget-table-plus__pagination button,
.widget-table-plus__pagination select {
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--table-plus-border-color);
  border-radius: 3px;
}
.widget-table-plus__pagination button.is-active {
  color: #ffffff;
  background: #4583ff;
  border-color: #4583ff;
}
.widget-table-plus__pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.widget-table-plus__pagination select {
  max-width: 90px;
  color: var(--table-plus-text-color);
}
.widget-table-plus__total {
  margin-right: 4px;
  white-space: nowrap;
}
</style>
