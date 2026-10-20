<template>
  <nav class="page-pagination" :style="paginationStyle" aria-label="页面分页器">
    <button
      type="button"
      class="page-pagination__arrow page-pagination__arrow--previous"
      :disabled="pageIndex <= 0"
      aria-label="上一组页签"
      @click.stop="movePage(-1)"
    >
      <img
        v-if="previousArrowImage"
        class="page-pagination__arrow-image"
        :src="previousArrowImage"
        alt=""
        aria-hidden="true"
        :draggable="false"
      />
      <span v-else aria-hidden="true"></span>
    </button>

    <div class="page-pagination__viewport">
      <button
        v-for="{ item, image, labelStyle } in visibleButtons"
        :key="item.id"
        type="button"
        class="page-pagination__item"
        :class="{ 'is-active': activeValue === item.eventValue }"
        :aria-current="activeValue === item.eventValue ? 'page' : undefined"
        :title="item.label"
        @click="selectItem(item)"
      >
        <!-- 素材按原比例完整展示；无图片时保留图文对齐空间，不自动补字体图标或装饰底座。 -->
        <span class="page-pagination__image-frame" aria-hidden="true">
          <img
            v-if="image"
            :key="image"
            class="page-pagination__image"
            :src="image"
            alt=""
            :draggable="false"
          />
        </span>
        <span class="page-pagination__label" :style="labelStyle">{{ item.label }}</span>
      </button>
    </div>

    <button
      type="button"
      class="page-pagination__arrow page-pagination__arrow--next"
      :disabled="pageIndex >= pageCount - 1"
      aria-label="下一组页签"
      @click.stop="movePage(1)"
    >
      <img
        v-if="nextArrowImage"
        class="page-pagination__arrow-image"
        :src="nextArrowImage"
        alt=""
        aria-hidden="true"
        :draggable="false"
      />
      <span v-else aria-hidden="true"></span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWidgetRuntimeValueContext } from '@/packages/components/widgetRuntimeValueContext'
import type { PagePaginationItem, PagePaginationOption } from './config'
import {
  getPagePaginationArrowImage,
  getPagePaginationImage,
  getPagePaginationLabelStyle,
  normalizePagePaginationItems,
  normalizePagePaginationPageSize,
} from './model'
import { PAGE_PAGINATION_APPEARANCE_DEFAULTS, normalizePagePaginationSize } from './appearance'

defineOptions({ name: 'VPagePagination' })

const props = defineProps<{ option: PagePaginationOption; widgetId?: string }>()
const runtimeValueContext = useWidgetRuntimeValueContext()
const activeValue = ref('')
const pageIndex = ref(0)
const items = computed(() => normalizePagePaginationItems(props.option.items))
const pageSize = computed(() => normalizePagePaginationPageSize(props.option.pageSize))
const pageCount = computed(() => Math.max(Math.ceil(items.value.length / pageSize.value), 1))
const previousArrowImage = computed(() =>
  getPagePaginationArrowImage(props.option, 'previous'),
)
const nextArrowImage = computed(() => getPagePaginationArrowImage(props.option, 'next'))
const visibleButtons = computed(() => {
  const start = pageIndex.value * pageSize.value
  return items.value.slice(start, start + pageSize.value).map((item) => {
    const isActive = item.eventValue === activeValue.value
    return {
      item,
      image: getPagePaginationImage(item, isActive),
      labelStyle: getPagePaginationLabelStyle(
        item,
        {
          fontFamily:
            props.option.labelFontFamily || PAGE_PAGINATION_APPEARANCE_DEFAULTS.labelFontFamily,
          fontSize: normalizePagePaginationSize('labelFontSize', props.option.labelFontSize),
          fontColor: isActive
            ? props.option.activeTextColor || PAGE_PAGINATION_APPEARANCE_DEFAULTS.activeTextColor
            : props.option.labelFontColor ||
              props.option.textColor ||
              PAGE_PAGINATION_APPEARANCE_DEFAULTS.labelFontColor,
          fontWeight:
            props.option.labelFontWeight || PAGE_PAGINATION_APPEARANCE_DEFAULTS.labelFontWeight,
        },
        isActive,
      ),
    }
  })
})

/** 空背景保持透明；图片和字号采用画布像素，由编辑器外层统一缩放。 */
const paginationStyle = computed(() => ({
  '--page-pagination-item-gap': `${normalizePagePaginationSize('itemGap', props.option.itemGap)}px`,
  '--page-pagination-image-width': `${normalizePagePaginationSize('imageWidth', props.option.imageWidth)}px`,
  '--page-pagination-image-height': `${normalizePagePaginationSize('imageHeight', props.option.imageHeight)}px`,
  '--page-pagination-image-text-gap': `${normalizePagePaginationSize('imageTextGap', props.option.imageTextGap)}px`,
  '--page-pagination-font-size': `${normalizePagePaginationSize('fontSize', props.option.fontSize)}px`,
  '--page-pagination-text-color':
    props.option.textColor || PAGE_PAGINATION_APPEARANCE_DEFAULTS.textColor,
  '--page-pagination-active-text-color':
    props.option.activeTextColor || PAGE_PAGINATION_APPEARANCE_DEFAULTS.activeTextColor,
  '--page-pagination-columns': pageSize.value,
  backgroundImage: props.option.backgroundImage?.trim()
    ? `url(${JSON.stringify(props.option.backgroundImage.trim())})`
    : 'none',
}))

/** 同步写入保证同一次点击冒泡到外层事件规则时，读取的是刚点击按钮的值。 */
const setActiveValue = (value: string) => {
  activeValue.value = value
  runtimeValueContext.setRuntimeValue(props.widgetId, 'value', value)
}

/** 仅默认值或按钮结构变化时调整选中页，换图、改文字不会重置用户当前翻页位置。 */
watch(
  [
    () => props.option.value,
    pageSize,
    () => JSON.stringify(items.value.map((item) => [item.id, item.eventValue])),
    () => props.widgetId,
  ],
  ([configured], previous) => {
    const preferred = configured !== previous?.[0] ? configured : activeValue.value
    const selected =
      items.value.find((item) => item.eventValue === preferred) ||
      items.value.find((item) => item.eventValue === configured) ||
      items.value[0]
    setActiveValue(selected?.eventValue || '')
    const index = selected ? items.value.indexOf(selected) : 0
    pageIndex.value = Math.floor(index / pageSize.value)
  },
  { immediate: true },
)

/** 组件只管理按钮选择，不写回默认配置；跳转继续由现有交互事件处理。 */
const selectItem = (item: PagePaginationItem) => setActiveValue(item.eventValue)

/** 翻页不改变选中按钮，不冒泡触发按钮绑定的跳转动作。 */
const movePage = (offset: number) => {
  pageIndex.value = Math.min(Math.max(pageIndex.value + offset, 0), pageCount.value - 1)
}
</script>

<style scoped lang="scss">
.page-pagination {
  box-sizing: border-box;
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 4px 12px;
  overflow: hidden;
  background-color: transparent;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
}
.page-pagination__viewport {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(var(--page-pagination-columns), minmax(0, 1fr));
  gap: var(--page-pagination-item-gap);
  min-width: 0;
  height: 100%;
}
.page-pagination__item {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--page-pagination-image-text-gap);
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 4px;
  color: var(--page-pagination-text-color);
  cursor: pointer;
  background: transparent;
  border: 0;
}
.page-pagination__item.is-active {
  color: var(--page-pagination-active-text-color);
}
.page-pagination__item:focus-visible,
.page-pagination__arrow:focus-visible {
  outline: 1px solid var(--page-pagination-active-text-color);
  outline-offset: -2px;
}
.page-pagination__image-frame {
  display: flex;
  flex: 0 1 var(--page-pagination-image-height);
  align-items: center;
  justify-content: center;
  width: var(--page-pagination-image-width);
  max-width: 100%;
  min-height: 0;
}
.page-pagination__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.page-pagination__label {
  flex: 0 0 auto;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(
    --page-pagination-label-font-family,
    'Microsoft YaHei',
    'PingFang SC',
    sans-serif
  );
  font-size: var(--page-pagination-font-size);
  font-weight: 400;
  line-height: 1.3;
  white-space: nowrap;
}
.page-pagination__arrow {
  display: flex;
  flex: 0 0 28px;
  align-items: center;
  align-self: stretch;
  justify-content: center;
  padding: 0;
  color: var(--page-pagination-active-text-color);
  cursor: pointer;
  background: transparent;
  border: 0;
}
.page-pagination__arrow:disabled {
  cursor: default;
  opacity: 0.25;
}
.page-pagination__arrow span {
  display: block;
  width: 12px;
  height: 12px;
  border-top: 2px solid currentcolor;
  border-right: 2px solid currentcolor;
}
.page-pagination__arrow-image {
  display: block;
  width: 100%;
  max-width: 28px;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
}
.page-pagination__arrow--previous span {
  transform: rotate(-135deg);
}
.page-pagination__arrow--next span {
  transform: rotate(45deg);
}
</style>
