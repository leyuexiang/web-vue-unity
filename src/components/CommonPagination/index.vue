<script setup lang="ts">
defineProps({
  total: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  pageSizes: { type: Array as () => number[], default: () => [10, 20, 50, 100] },
  /**
   * Element Plus 要求可见页码数量为 5 到 21 之间的奇数。
   * 默认值保持原有行为，管理端按 Figma 显式传入 9，不影响其他调用方。
   */
  pagerCount: { type: Number, default: 7 },
  /**
   * 下拉浮层类由具体业务包装组件提供；默认留空，避免通用分页隐式依赖管理端主题。
   */
  popperClass: { type: String, default: '' },
})

const emit = defineEmits(['update:currentPage', 'update:pageSize'])

function onCurrentChange(val: number) {
  emit('update:currentPage', val)
}

function onSizeChange(val: number) {
  emit('update:pageSize', val)
}
</script>

<template>
  <div class="common-pagination">
    <el-pagination
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      :pager-count="pagerCount"
      layout="prev, pager, next, sizes, jumper"
      :page-sizes="pageSizes"
      :popper-class="popperClass"
      @current-change="onCurrentChange"
      @size-change="onSizeChange"
    />
  </div>
</template>
