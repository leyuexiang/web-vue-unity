<template>
  <div class="widget-tables-basic" :style="{ fontSize: `${safeFontSize}px` }">
    <input
      v-if="option.inputShow !== 'none'"
      v-model.trim="searchText"
      class="widget-tables-basic__search"
      placeholder="请输入信息"
      type="text"
    />

    <div
      class="widget-tables-basic__table-wrap"
      :style="{
        borderWidth: option.style.border === 'on' ? `${option.style.borderWidth}px` : '0',
        borderColor: option.style.borderColor,
        borderStyle: option.style.borderStyle,
      }"
    >
      <table class="widget-tables-basic__table" :class="tableClass">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" :style="{ textAlign: option.align }">
              {{ column.title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pagedRows" :key="row.key">
            <td
              v-for="column in columns"
              :key="`${row.key}-${column.key}`"
              :style="{ textAlign: option.align }"
            >
              {{ row[column.key] }}
            </td>
          </tr>
          <tr v-if="pagedRows.length === 0">
            <td class="widget-tables-basic__empty" :colspan="columns.length || 1">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="widget-tables-basic__pagination">
      <button type="button" :disabled="currentPage <= 1" @click="setPage(currentPage - 1)">
        ‹
      </button>
      <span>{{ currentPage }} / {{ pageCount }}</span>
      <button type="button" :disabled="currentPage >= pageCount" @click="setPage(currentPage + 1)">
        ›
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Config from './config'
import { toCellText, toFiniteNumber } from '../shared/tableRuntime'

defineOptions({ name: 'VTablesBasic' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()

const searchText = ref('')
const currentPage = ref(1)

const columns = computed(() => props.option.dataset.dimensions || [])
const safeFontSize = computed(() => Math.max(10, toFiniteNumber(props.option.style.fontSize, 16)))
const safePageSize = computed(() =>
  Math.max(1, Math.floor(toFiniteNumber(props.option.pagination.pageSize, 5))),
)

const filteredRows = computed(() => {
  const rows = props.option.dataset.source || []
  if (!searchText.value) return rows

  const keyword = searchText.value.toLowerCase()
  return rows.filter((row) =>
    Object.values(row).some((value) => toCellText(value).toLowerCase().includes(keyword)),
  )
})

const pageCount = computed(() =>
  Math.max(Math.ceil(filteredRows.value.length / safePageSize.value), 1),
)
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * safePageSize.value
  return filteredRows.value.slice(start, start + safePageSize.value)
})

const tableClass = computed(() => ({
  'is-striped': props.option.style.striped === 'on',
  'is-column-bordered': props.option.style.singleLine === 'off',
  'is-row-bordered': props.option.style.singleColumn === 'off',
  'is-bottom-bordered': props.option.style.bottomBordered === 'on',
}))

const setPage = (page: number) => {
  /**
   * 分页操作只修改当前部件实例的本地页码。
   * 这样预览点击不会反写配置，也不会影响编辑态保存的默认页码。
   */
  currentPage.value = Math.min(Math.max(page, 1), pageCount.value)
}

watch(
  () => props.option.pagination.page,
  (page) => {
    currentPage.value = Math.min(Math.max(Math.floor(toFiniteNumber(page, 1)), 1), pageCount.value)
  },
  { immediate: true },
)

watch([filteredRows, safePageSize], () => {
  setPage(currentPage.value)
})
</script>

<style scoped lang="scss">
.widget-tables-basic {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: #d8e7ff;
  user-select: none;
}
.widget-tables-basic__search {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-search-font-family: v-bind("props.option.searchFontFamily || 'initial'");

  box-sizing: border-box;
  align-self: flex-end;
  width: min(240px, 100%);
  height: 28px;
  padding: 0 10px;
  font-family: var(--widget-search-font-family, inherit);
  color: #d8e7ff;
  outline: none;
  background: rgb(9 20 35 / 92%);
  border: 1px solid rgb(74 158 248 / 28%);
  border-radius: 4px;
}
.widget-tables-basic__table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.widget-tables-basic__table {
  width: 100%;
  min-width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.widget-tables-basic__table th,
.widget-tables-basic__table td {
  box-sizing: border-box;
  padding: 6px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  white-space: nowrap;
}
.widget-tables-basic__table th {
  color: #ffffff;
  background: rgb(0 186 255 / 76%);
}
.widget-tables-basic__table.is-striped tbody tr:nth-child(even) {
  background: rgb(74 158 248 / 10%);
}
.widget-tables-basic__table.is-row-bordered tr {
  border-bottom: 1px solid rgb(216 231 255 / 18%);
}
.widget-tables-basic__table.is-column-bordered th,
.widget-tables-basic__table.is-column-bordered td {
  border-right: 1px solid rgb(216 231 255 / 14%);
}
.widget-tables-basic__table:not(.is-bottom-bordered) tbody tr:last-child {
  border-bottom: none;
}
.widget-tables-basic__empty {
  color: rgb(216 231 255 / 58%);
  text-align: center;
}
.widget-tables-basic__pagination {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  height: 26px;
  font-size: 12px;
}
.widget-tables-basic__pagination button {
  min-width: 24px;
  height: 24px;
  color: #d8e7ff;
  background: rgb(9 20 35 / 92%);
  border: 1px solid rgb(74 158 248 / 28%);
  border-radius: 4px;
}
.widget-tables-basic__pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

/* 字体只影响对应文字区域；缺省时继承旧样式，不参与计时或数据刷新。 */
.widget-tables-basic__table thead {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-header-font-family: v-bind("props.option.headerFontFamily || 'initial'");

  font-family: var(--widget-header-font-family, inherit);
}
.widget-tables-basic__table tbody {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-body-font-family: v-bind("props.option.bodyFontFamily || 'initial'");

  font-family: var(--widget-body-font-family, inherit);
}
.widget-tables-basic__pagination,
.widget-tables-basic__pagination button {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-pagination-font-family: v-bind("props.option.paginationFontFamily || 'initial'");

  font-family: var(--widget-pagination-font-family, inherit);
}
</style>
