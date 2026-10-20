<template>
  <footer class="manage-pagination-bar" aria-label="列表分页">
    <!-- Figma 底部左侧是独立总数文案，不能混入右侧分页控件，否则无法保持两端锚定。 -->
    <span class="manage-pagination-bar__total" aria-live="polite">共 {{ total }} 条记录</span>

    <!--
      版权节点按整页视口居中，不随右侧分页宽度移动；具体锚点由共享主题样式统一控制。
      原文保留设计稿既有拼写，避免在视觉还原任务中擅自修改产品文案。
    -->
    <span class="manage-pagination-bar__copyright">
      © 2026 ZonSU Platfrom.All rights reseved.
    </span>

    <!--
      局部配置只把管理端跳页文案从“前往”改为 Figma 的“跳至”，不会污染编辑器和其他业务页。
      配置对象只在组件实例初始化时创建，翻页过程中不会重复构造或产生额外响应式开销。
    -->
    <el-config-provider :locale="managePaginationLocale">
      <CommonPagination
        :total="total"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="pageSizes"
        :pager-count="9"
        popper-class="manage-dropdown-popper manage-select-popper"
        @update:currentPage="emit('update:currentPage', $event)"
        @update:pageSize="emit('update:pageSize', $event)"
      />
    </el-config-provider>
  </footer>
</template>

<script setup lang="ts">
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { CommonPagination } from '@/components/index'

withDefaults(
  defineProps<{
    total: number
    currentPage: number
    pageSize: number
    pageSizes?: number[]
  }>(),
  {
    pageSizes: () => [10, 20, 50, 100],
  },
)

const emit = defineEmits<{
  'update:currentPage': [value: number]
  'update:pageSize': [value: number]
}>()

/**
 * 通过不可变浅拷贝覆盖单个分页词条，保留 Element Plus 其余中文无障碍文案。
 * 该对象位于组件实例初始化路径，不依赖任何列表状态，分页交互不会触发重建。
 */
const managePaginationLocale = {
  ...zhCn,
  el: {
    ...zhCn.el,
    pagination: {
      ...zhCn.el.pagination,
      goto: '跳至',
    },
  },
}
</script>
