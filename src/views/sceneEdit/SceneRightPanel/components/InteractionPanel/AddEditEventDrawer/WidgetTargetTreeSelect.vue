<template>
  <el-tree-select
    v-model="treeSelection"
    class="scene-edit-property-select scene-edit-widget-target-tree-select"
    :data="treeData"
    multiple
    filterable
    clearable
    check-strictly
    show-checkbox
    collapse-tags
    collapse-tags-tooltip
    node-key="value"
    :props="treeProps"
    popper-class="scene-edit-widget-target-tree-select__popper"
    placeholder="请选择部件或分组"
    @update:model-value="handleSelectionChange"
  >
    <template #default="{ data }">
      <span class="scene-edit-widget-target-tree-select__node">
        <span>{{ data.label }}</span>
        <span v-if="data.kind === 'group'" class="scene-edit-widget-target-tree-select__kind">
          分组
        </span>
      </span>
    </template>
  </el-tree-select>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSceneWidgetStore } from '@/stores/sceneEditStore'
import type { SceneWidgetTargetItem } from '@/types/threeScene'
import {
  buildWidgetTargetTree,
  getWidgetTargetGroupValue,
  normalizeWidgetTargetSelectionValues,
  resolveWidgetTargetSelection,
} from './widgetTargetTree'

const props = defineProps<{
  modelValue?: string[]
  groupModelValue?: string[]
  options: SceneWidgetTargetItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:groupModelValue': [value: string[]]
}>()

const widgetStore = useSceneWidgetStore()
const treeProps = { label: 'label', value: 'value', children: 'children' }
const buildTreeSelection = (widgetIds?: string[], groupIds?: string[]) => [
  ...(widgetIds || []),
  ...(groupIds || []).map(getWidgetTargetGroupValue),
]
const treeSelection = ref<string[]>(
  buildTreeSelection(props.modelValue, props.groupModelValue),
)
const lastEmittedSelection = ref<{ widgetIds: string[]; groupIds: string[] } | null>(null)
const treeData = computed(() =>
  buildWidgetTargetTree(widgetStore.widgetLayerTree, widgetStore.totalWidgets || [], props.options),
)

const equalIds = (left: string[], right: string[]) =>
  left.length === right.length && left.every((id, index) => id === right[index])

watch(
  [() => props.modelValue, () => props.groupModelValue],
  ([widgetIds, groupIds]) => {
    const nextWidgetIds = [...(widgetIds || [])]
    const nextGroupIds = [...(groupIds || [])]
    const lastSelection = lastEmittedSelection.value
    if (
      lastSelection &&
      equalIds(nextWidgetIds, lastSelection.widgetIds) &&
      equalIds(nextGroupIds, lastSelection.groupIds)
    ) {
      lastEmittedSelection.value = null
      return
    }
    treeSelection.value = buildTreeSelection(nextWidgetIds, nextGroupIds)
  },
  { deep: true },
)

const handleSelectionChange = (value: string[]) => {
  const normalizedValues = normalizeWidgetTargetSelectionValues(value || [], treeData.value)
  // 同步收敛树控件自身的勾选态，否则组件内部仍会显示被分组隐式带上的子节点。
  treeSelection.value = normalizedValues
  const selection = resolveWidgetTargetSelection(normalizedValues, treeData.value)
  lastEmittedSelection.value = selection
  emit('update:modelValue', selection.widgetIds)
  emit('update:groupModelValue', selection.groupIds)
}
</script>

<style scoped lang="scss">
/*
 * el-tree-select 会把选择器的 class 同步到弹出层里的 el-tree。
 * 共享选择器样式中的 inline-flex/固定高度会让根节点横向排列并截断树内容，
 * 这里只对部件树的弹出层恢复树组件自身的块级布局。
 */
:global(.scene-edit-widget-target-tree-select__popper .el-tree.scene-edit-widget-target-tree-select) {
  display: block;
  width: 100%;
  min-width: 0;
  height: auto;
}
:global(.scene-edit-widget-target-tree-select__popper .el-tree.scene-edit-widget-target-tree-select > .el-tree-node) {
  display: block;
  width: 100%;
}
:global(
  .scene-edit-widget-target-tree-select__popper
    .el-tree.scene-edit-widget-target-tree-select
    > .el-tree-node
    > .el-tree-node__content
) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}
.scene-edit-widget-target-tree-select__node {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
}
.scene-edit-widget-target-tree-select__kind {
  flex: none;
  font-size: 11px;
  color: rgb(255 255 255 / 40%);
}
</style>
