<template>
  <div class="widget-inputs-pagination">
    <button
      type="button"
      class="widget-inputs-pagination__nav"
      :disabled="currentPageState <= 1"
      @click="setCurrentPage(currentPageState - 1)"
    >
      ‹
    </button>

    <button
      v-for="page in visiblePages"
      :key="page"
      type="button"
      class="widget-inputs-pagination__page"
      :class="{ 'is-active': page === currentPageState }"
      @click="setCurrentPage(page)"
    >
      {{ page }}
    </button>

    <button
      type="button"
      class="widget-inputs-pagination__nav"
      :disabled="currentPageState >= pageCount"
      @click="setCurrentPage(currentPageState + 1)"
    >
      ›
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import Config from './config'

defineOptions({ name: 'VInputsPagination' })

const props = defineProps<{ option: Config['option']; widgetId?: string }>()
const widgetRuntimeValueContext = useWidgetRuntimeValueContext()

/**
 * 分页器在画布态只负责把“当前页 / 总页数”稳定展示出来，
 * 不承担完整的业务翻页交互。
 *
 * 这里不用 Element Plus 的 el-pagination，原因有两个：
 * 1. 画布层只是一个绝对定位的 DOM 容器，el-pagination 在这里出现了空白渲染；
 * 2. 用户当前诉求是“拖拽后能正常看到实例”，自绘分页条更稳定、可控。
 *
 * 数据映射仍然沿用当前约定：
 * - option.value    -> 当前页
 * - option.total    -> 总条数
 * - option.pageSize -> 每页条数
 */
const currentPageState = ref(1)

watch(
  () => props.option.value,
  (newValue) => {
    currentPageState.value = Math.max(Number(newValue) || 1, 1)
  },
  {
    immediate: true,
  },
)

const pageSize = computed(() => Math.max(Number(props.option.pageSize) || 10, 1))

const pageCount = computed(() => {
  const total = Math.max(Number(props.option.total) || 0, 0)
  return Math.max(Math.ceil(total / pageSize.value), 1)
})

const visiblePages = computed(() => {
  /**
   * 画布里的分页器宽度有限，默认只展示一个居中的 5 页窗口：
   * - 页数较少时直接全部显示
   * - 页数较多时围绕当前页滑动
   */
  const maxVisiblePages = 5
  if (pageCount.value <= maxVisiblePages) {
    return Array.from({ length: pageCount.value }, (_, index) => index + 1)
  }

  let startPage = Math.max(currentPageState.value - 2, 1)
  let endPage = startPage + maxVisiblePages - 1

  if (endPage > pageCount.value) {
    endPage = pageCount.value
    startPage = endPage - maxVisiblePages + 1
  }

  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index)
})

const setCurrentPage = (page: number) => {
  /**
   * 预览态分页器只维护当前实例的本地页码。
   * 这样用户能直接点击查看翻页效果，同时不会把预览动作写回编辑配置。
   */
  currentPageState.value = Math.min(Math.max(page, 1), pageCount.value)
}

watch(
  currentPageState,
  (newValue) => {
    /**
     * 分页器对规则暴露当前页码。
     * 这样点击分页按钮后，就能在状态 / 交互规则里直接按页码做条件判断。
     * 写入入口通过上下文注入，后续可直接接入统一二维运行时。
     */
    widgetRuntimeValueContext.setRuntimeValue(props.widgetId, 'value', newValue)
  },
  {
    immediate: true,
  },
)
</script>

<style scoped lang="scss">
.widget-inputs-pagination {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.widget-inputs-pagination__nav,
.widget-inputs-pagination__page {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-font-family: v-bind("props.option.fontFamily || 'initial'");

  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  font-family: var(--widget-font-family, inherit);
  font-size: 12px;
  line-height: 1;
  color: #d8e7ff;
  background: rgb(9 20 35 / 92%);
  border: 1px solid rgb(74 158 248 / 28%);
  border-radius: 4px;
}
.widget-inputs-pagination__page.is-active {
  color: #ffffff;
  background: rgb(74 158 248 / 85%);
  border-color: rgb(90 227 255 / 75%);
}
.widget-inputs-pagination__nav:disabled {
  opacity: 0.45;
}

/* 字体只影响对应文字区域；缺省时继承旧样式，不参与计时或数据刷新。 */
.widget-inputs-pagination__nav {
  /* 动态值经自定义变量传递；缺省使用初始空值，使字体回退到继承。 */
  --widget-nav-font-family: v-bind("props.option.navFontFamily || 'initial'");

  font-family: var(--widget-nav-font-family, inherit);
}
</style>
