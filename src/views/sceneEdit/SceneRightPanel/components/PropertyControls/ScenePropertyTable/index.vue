<template>
  <!--
    右侧属性配置表格的共享外壳。
    列定义、分页和行操作仍由业务面板维护；这里仅统一表格根节点、可变宽度和插槽透传，
    避免不同数据模型被错误合并，同时确保面板收窄时表格不会把父容器撑破。
  -->
  <el-table v-bind="attrs" class="scene-edit-property-table" :data="data" :row-key="rowKey">
    <!-- el-table-column 位于默认插槽，必须原样保留，否则共享外壳会吞掉业务列。 -->
    <slot />
    <template v-for="(_, slotName) in namedSlots" :key="slotName" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps" />
    </template>
  </el-table>
</template>

<script setup lang="ts">
import type { TableProps } from 'element-plus'
import { computed, useAttrs, useSlots } from 'vue'

defineOptions({
  name: 'ScenePropertyTable',
  /** 关闭根节点属性继承，使 class 和其余 Element Plus 属性只落在表格实例上。 */
  inheritAttrs: false,
})

const attrs = useAttrs()
const slots = useSlots()
/** 过滤默认插槽，避免它既作为列容器渲染又被错误注册为表格具名插槽。 */
const namedSlots = computed(() => {
  const entries = Object.entries(slots).filter(([slotName]) => slotName !== 'default')
  return Object.fromEntries(entries)
})

/**
 * 直接复用调用方数组，避免共享壳层复制数据造成额外的表格刷新。
 * 行结构由调用方的列插槽决定，外壳只需保持未知行数据的透传能力。
 */
type PropertyTableRow = Record<PropertyKey, unknown>
type PropertyTableProps = {
  /** 复用 Element Plus 的默认行记录类型，使不同业务表格无需复制数据或丢失插槽推断。 */
  data?: TableProps<PropertyTableRow>['data']
  rowKey?: TableProps<PropertyTableRow>['rowKey']
}

withDefaults(defineProps<PropertyTableProps>(), {
  data: () => [],
  rowKey: undefined,
})
</script>
