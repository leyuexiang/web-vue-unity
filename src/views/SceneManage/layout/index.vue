<template>
  <!-- 场景卡片采用模型、图标共用的 Figma 资源卡片基类，业务差异交给场景页插槽呈现。 -->
  <ManageGridLayout
    :list="list"
    :total="total"
    :current-page="currentPage"
    :page-size="pageSize"
    :cover-fallback="CoverScene"
    card-class="manage-grid-card--resource"
    variant="scene"
    min-card-width="260px"
    :cover-height="200"
    cover-fit="cover"
    media-interactive
    @mediaClick="emit('mediaClick', $event)"
    @paginationChange="emit('paginationChange', $event)"
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
import CoverScene from '@/assets/images/cover/scene.png'
import ManageGridLayout, { type ResourceItem } from '@/views/manageShared/ManageGridLayout.vue'

defineOptions({ name: 'ResourceLayout' })

withDefaults(
  defineProps<{
    list: T[]
    total: number
    /** 与场景页筛选复位状态保持同步，避免共享分页栏仍显示旧页码或旧页长。 */
    currentPage?: number
    pageSize?: number
  }>(),
  {
    list: () => [],
    total: 0,
    currentPage: undefined,
    pageSize: undefined,
  },
)

const emit = defineEmits<{
  paginationChange: [value: { page: number; size: number }]
  /** 只透传封面点击意图，场景页根据发布状态决定提示或打开场景预览。 */
  mediaClick: [record: T]
}>()
</script>
