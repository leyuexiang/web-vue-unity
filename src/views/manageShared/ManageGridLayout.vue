<template>
  <div
    class="manage-grid-layout"
    :class="{
      'manage-grid-layout--fixed': variant !== 'default',
      [`manage-grid-layout--${variant}`]: variant !== 'default',
    }"
  >
    <div class="manage-grid-layout__scroll">
      <div
        class="manage-grid-layout__grid"
        :style="
          variant !== 'default'
            ? undefined
            : { gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}, 1fr))` }
        "
      >
        <article
          v-for="item in list"
          :key="item.id"
          class="manage-grid-card"
          :data-resource-id="String(item.id)"
          :aria-selected="selectable ? selectedIdSet.has(item.id) : undefined"
          :class="{
            'is-selected': selectedIdSet.has(item.id),
            'is-selectable': selectable,
            [cardClass]: Boolean(cardClass),
          }"
          @click="handleSelect(item)"
        >
          <div class="manage-grid-card__media" :style="{ height: `${coverHeight}px` }">
            <div
              class="manage-grid-card__media-inner"
              :class="{ 'is-interactive': mediaInteractive }"
              :style="{ padding: mediaPadding }"
              :role="mediaInteractive ? 'button' : undefined"
              :tabindex="mediaInteractive ? 0 : undefined"
              :aria-label="mediaInteractive ? `预览${item.name}` : undefined"
              @click="handleMediaClick($event, item)"
              @keydown="handleMediaKeydown($event, item)"
            >
              <img
                :src="item.imgPath || coverFallback"
                :alt="item.name"
                class="manage-grid-card__image"
                :style="{ objectFit: coverFit }"
                @load="handleImageLoad"
                @error="handleImageError"
              />
            </div>

            <div class="manage-grid-card__media-overlay"></div>

            <!-- 没有页面级媒体操作时不生成空覆盖层，避免留下不可见点击层。 -->
            <div v-if="$slots.operate" class="manage-grid-card__actions">
              <slot name="operate" :record="item" :selected="selectedIdSet.has(item.id)" />
            </div>

            <slot name="media-extra" :record="item" :selected="selectedIdSet.has(item.id)" />
          </div>

          <div class="manage-grid-card__body">
            <slot name="content" :record="item" :selected="selectedIdSet.has(item.id)">
              <div class="manage-grid-card__title text-ellipsis" :title="item.name">
                {{ item.name }}
              </div>
              <div class="manage-grid-card__meta">
                <span class="manage-grid-card__tag">{{ item.category }}</span>
                <span class="mono-text">{{ formatTime(item.updateTime) }}</span>
              </div>
            </slot>
          </div>
        </article>

        <div v-if="list.length === 0" class="manage-grid-layout__empty">
          <el-empty :description="emptyDescription" />
        </div>
      </div>
    </div>

    <!--
      模型、图标、场景列表以及后续获准接入的模板页统一从此处进入共享分页栏。
      分页栏位于独立滚动容器之外，因此卡片滚动不会改变其视口坐标。
    -->
    <ManagePaginationBar
      :total="total"
      :current-page="page"
      :page-size="internalPageSize"
      @update:currentPage="goToPage"
      @update:pageSize="setPageSize"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends ResourceItem">
import { computed, ref, watch } from 'vue'
import ManagePaginationBar from './ManagePaginationBar.vue'

export interface ResourceItem {
  id: string | number
  name: string
  imgPath: string
  category: string
  updateTime: string
}

/**
 * 网格变体只表达页面的几何选择，不携带任何业务字段。
 * “模型、图标、场景、模板”均使用 Figma 的固定卡片规格；default 仅为历史调用方保留弹性列宽。
 */
export type ManageGridVariant = 'default' | 'model' | 'icon' | 'scene' | 'template'

const props = withDefaults(
  defineProps<{
    list: T[]
    total: number
    /** 可选的受控页码；未传入时退回组件内部状态，兼容其他潜在调用方。 */
    currentPage?: number
    /** 可选的受控页长；未传入时退回组件内部状态，兼容其他潜在调用方。 */
    pageSize?: number
    coverFallback: string
    /** 除 default 外的页面变体均使用固定卡片列宽；template 已由模板管理列表页正式使用。 */
    variant?: ManageGridVariant
    selectable?: boolean
    minCardWidth?: string
    coverHeight?: number
    coverFit?: 'cover' | 'contain'
    mediaPadding?: string
    /** 开启后封面成为独立操作入口，点击与键盘激活均不再冒泡到卡片多选。 */
    mediaInteractive?: boolean
    emptyDescription?: string
    cardClass?: string
  }>(),
  {
    variant: 'default',
    selectable: false,
    currentPage: undefined,
    pageSize: undefined,
    minCardWidth: '220px',
    coverHeight: 140,
    coverFit: 'cover',
    mediaPadding: '0px',
    mediaInteractive: false,
    cardClass: '',
    emptyDescription: '没有匹配的数据',
  },
)

const emit = defineEmits<{
  paginationChange: [value: { page: number; size: number }]
  selectedChange: [value: (string | number)[]]
  /** 只报告封面激活意图；模型、图标等业务页自行决定使用哪种预览实现。 */
  mediaClick: [record: T]
}>()

const page = ref(1)
// 内部页长与受控属性同名会触发 Vue 代码检查器的重复键规则，因此使用明确的内部状态名。
const internalPageSize = ref(10)
const selectedList = ref<(string | number)[]>([])

/**
 * 选中项在一张卡片内会被多个插槽读取。缓存为 Set 后，每次渲染只做常量时间查询，
 * 同时把稳定业务标识写入 aria-selected 与 data-resource-id，验收和辅助技术不再依赖卡片序号。
 */
const selectedIdSet = computed(() => new Set(selectedList.value))

/**
 * 受控分页只同步外部状态，不在同步过程中发出事件；接口请求仍由页面监听用户操作后统一触发，
 * 从而避免“父组件更新 -> 子组件再次请求”的重复调用。
 */
watch(
  () => props.currentPage,
  (nextPage) => {
    if (nextPage === undefined || nextPage === page.value) return
    page.value = Math.max(1, nextPage)
  },
  { immediate: true },
)
watch(
  () => props.pageSize,
  (nextSize) => {
    if (nextSize === undefined || nextSize === internalPageSize.value) return
    internalPageSize.value = Math.max(1, nextSize)
  },
  { immediate: true },
)

watch(
  () => props.list,
  (nextList) => {
    if (!props.selectable) return
    const validIds = new Set(nextList.map((item) => item.id))
    const nextSelected = selectedList.value.filter((id) => validIds.has(id))
    if (nextSelected.length !== selectedList.value.length) {
      selectedList.value = nextSelected
      emit('selectedChange', nextSelected)
    }
  },
)

const formatTime = (value: string) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

/**
 * 记录已经从原图切换到占位图的图片节点。
 * 使用 WeakSet 只持有仍在 DOM 生命周期中的元素，既避免失败回退循环，也不会因为
 * 列表长时间切换而积累节点引用；图片成功加载后会在 handleImageLoad 中清理记录。
 */
const fallbackImages = new WeakSet<HTMLImageElement>()

/** 图片节点复用并加载新地址时，允许新地址重新执行一次失败回退。 */
const handleImageLoad = (event: Event) => {
  const image = event.currentTarget as HTMLImageElement | null
  if (image) fallbackImages.delete(image)
}

/**
 * 原图失败时最多替换一次占位图；如果占位图本身也失败，移除 src 终止浏览器重试。
 * 缺失原图会在模板中直接使用占位地址，因此第二种情况同样通过当前 src 判断，避免
 * 空地址再次指向当前页面或触发无意义的重复请求。
 */
const handleImageError = (event: Event) => {
  const image = event.currentTarget as HTMLImageElement | null
  if (!image) return

  const currentSource = image.getAttribute('src') || ''
  const fallbackSource = props.coverFallback || ''
  const alreadyFallback = fallbackImages.has(image) || currentSource === fallbackSource

  if (alreadyFallback || !fallbackSource) {
    image.removeAttribute('src')
    return
  }

  fallbackImages.add(image)
  image.src = fallbackSource
}

/**
 * 封面启用独立交互后立即终止冒泡，避免同一次点击先打开预览又切换批量选择状态。
 * 未启用时不拦截事件，场景页和其他历史调用方仍沿用原有整卡点击行为。
 */
const handleMediaClick = (event: MouseEvent, item: T) => {
  if (!props.mediaInteractive) return
  event.stopPropagation()
  emit('mediaClick', item)
}

/**
 * 可聚焦封面同时支持回车和空格；只在命中标准激活键时阻止默认滚动与事件冒泡，
 * 从而让键盘预览与鼠标预览保持同一条事件链，不额外维护第二套业务逻辑。
 */
const handleMediaKeydown = (event: KeyboardEvent, item: T) => {
  if (!props.mediaInteractive || (event.key !== 'Enter' && event.key !== ' ')) return
  event.preventDefault()
  event.stopPropagation()
  emit('mediaClick', item)
}

const handleSelect = (item: T) => {
  if (!props.selectable) return

  if (selectedList.value.includes(item.id)) {
    selectedList.value = selectedList.value.filter((id) => id !== item.id)
  } else {
    selectedList.value = [...selectedList.value, item.id]
  }

  emit('selectedChange', selectedList.value)
}

const clearSelected = () => {
  selectedList.value = []
  emit('selectedChange', selectedList.value)
}

const goToPage = (nextPage: number) => {
  page.value = nextPage
  emit('paginationChange', { page: nextPage, size: internalPageSize.value })
}

const setPageSize = (nextSize: number) => {
  internalPageSize.value = nextSize
  page.value = 1
  emit('paginationChange', { page: 1, size: nextSize })
}

defineExpose({ clearSelected })
</script>
