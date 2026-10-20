<template>
  <ManageGridLayout
    ref="gridLayoutRef"
    :list="list"
    :total="total"
    :current-page="currentPage"
    :page-size="pageSize"
    :cover-fallback="CoverModel"
    card-class="manage-grid-card--resource"
    :variant="variant"
    :selectable="selectable"
    min-card-width="260px"
    :cover-height="coverHeight"
    :cover-fit="coverFit"
    :media-padding="mediaPadding"
    :media-interactive="mediaInteractive"
    :empty-description="emptyDescription"
    @paginationChange="emit('paginationChange', $event)"
    @selectedChange="emit('selectedChange', $event)"
    @mediaClick="emit('mediaClick', $event)"
  >
    <template #operate="slotProps">
      <slot name="operate" v-bind="slotProps" />
    </template>

    <template #media-extra="slotProps">
      <slot name="media-extra" v-bind="slotProps" />
    </template>

    <template #content="slotProps">
      <slot name="content" v-bind="slotProps" />
    </template>
  </ManageGridLayout>
</template>

<script setup lang="ts" generic="T extends ResourceItem">
import { ref } from 'vue'
import CoverModel from '@/assets/images/cover/model.png'
import ManageGridLayout, {
  type ManageGridVariant,
  type ResourceItem,
} from '@/views/manageShared/ManageGridLayout.vue'

defineOptions({ name: 'ResourceLayout' })

withDefaults(
  defineProps<{
    list: T[]
    total: number
    /** 模型页与图标页使用受控分页；未传入时保留资源布局的内部回退状态。 */
    currentPage?: number
    pageSize?: number
    /** 模型、图片、模板页分别传入显式固定变体，公共布局不承载任何资源业务字段。 */
    variant?: ManageGridVariant
    /** Figma 资源卡片媒体区固定为 200px；保留属性以便模板页注入同一几何。 */
    coverHeight?: number
    coverFit?: 'cover' | 'contain'
    mediaPadding?: string
    /** 模型、图标页显式开启封面预览；默认关闭以兼容其他资源布局调用方。 */
    mediaInteractive?: boolean
    /** 页面可传入接口失败原因，网格空态会同时保留固定几何与可读错误文案。 */
    emptyDescription?: string
    /**
     * 是否允许整卡多选。默认保留图标页的批量操作能力；模型页可显式关闭，
     * 避免卡片空白区点击改变状态或生成不再使用的选择数据。
     */
    selectable?: boolean
  }>(),
  {
    currentPage: undefined,
    pageSize: undefined,
    variant: 'default',
    coverHeight: 200,
    coverFit: 'cover',
    mediaPadding: '0px',
    mediaInteractive: false,
    emptyDescription: '没有匹配的数据',
    selectable: true,
  },
)

const emit = defineEmits<{
  paginationChange: [value: { page: number; size: number }]
  selectedChange: [value: (string | number)[]]
  /** 透传完整资源记录，业务页继续复用自己的预览路径转换和弹窗状态。 */
  mediaClick: [record: T]
}>()

const gridLayoutRef = ref<{ clearSelected: () => void } | null>(null)

defineExpose({
  clearSelected: () => gridLayoutRef.value?.clearSelected(),
})
</script>
