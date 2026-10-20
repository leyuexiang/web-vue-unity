<template>
  <div class="kv-editor">
    <ScenePropertyTable :data="tableRows" row-key="id" table-layout="fixed">
      <el-table-column label="Key" min-width="190">
        <template #default="{ row }">
          <ScenePropertyInput
            v-model="row.key"
            :readonly="readonly"
            placeholder="请输入Key"
            @blur="handleBlur"
          />
        </template>
      </el-table-column>
      <el-table-column label="Value" min-width="190">
        <template #default="{ row }">
          <ScenePropertyInput
            v-model="row.value"
            :readonly="readonly"
            placeholder="请输入Value"
            @blur="handleBlur"
          >
            <template v-if="row.value?.startsWith('javascript:')" #suffix>
              <el-tooltip content="动态 JS 表达式" placement="top">
                <span class="kv-editor__js-hint">JS</span>
              </el-tooltip>
            </template>
          </ScenePropertyInput>
        </template>
      </el-table-column>
      <el-table-column label="结果" width="136">
        <template #default="{ row }">
          <span
            :class="[
              'kv-editor__result',
              row.error ? 'kv-editor__result--error' : 'kv-editor__result--ok',
            ]"
          >
            {{ row.error ? '格式不通过' : '格式通过' }}
            <img
              :src="row.error ? errorIcon : checkIcon"
              alt=""
              width="12"
              height="12"
              aria-hidden="true"
            />
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="88" align="center">
        <template #default="{ $index }">
          <div class="kv-editor__actions">
            <ScenePropertyButton
              text
              :disabled="readonly"
              aria-label="删除参数行"
              @click="removeRow($index)"
            >
              <el-icon><Minus /></el-icon>
            </ScenePropertyButton>
            <ScenePropertyButton
              text
              :disabled="readonly"
              aria-label="新增参数行"
              @click="addRow($index)"
            >
              <el-icon><Plus /></el-icon>
            </ScenePropertyButton>
          </div>
        </template>
      </el-table-column>
    </ScenePropertyTable>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Minus, Plus } from '@element-plus/icons-vue'
import checkIcon from '@/assets/icons/request-config-check.svg'
import errorIcon from '@/assets/icons/request-config-error.svg'
import ScenePropertyTable from '../../PropertyControls/ScenePropertyTable/index.vue'

type KvRow = { id: number; key: string; value: string; error: boolean }

const props = defineProps<{
  modelValue: Record<string, string>
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

let rowSeed = 0
/** 内部稳定编号只服务于表格节点复用，不写入请求参数，避免中间增删行时输入焦点错位。 */
const defaultItem = (): KvRow => ({ id: ++rowSeed, key: '', value: '', error: false })
const tableRows = reactive<KvRow[]>([])

watch(
  () => props.modelValue,
  (target) => {
    tableRows.length = 0
    const entries = Object.entries(target || {})
    if (entries.length === 0) {
      /** 空参数只提供一个初始编辑行；其余行由用户点击加号按需创建，避免无效空行占用弹窗高度。 */
      tableRows.push(defaultItem())
      return
    }
    entries.forEach(([key, value]) => {
      tableRows.push({ id: ++rowSeed, key, value, error: false })
    })
  },
  { immediate: true, deep: true },
)

function handleBlur() {
  let allValid = true
  const result: Record<string, string> = {}

  /** 单次遍历同时完成校验和结果构建，避免数据行较多时重复扫描。 */
  tableRows.forEach((item) => {
    item.error = (item.key !== '' && item.value === '') || (item.key === '' && item.value !== '')
    allValid = allValid && !item.error
    if (item.key && !item.error) result[item.key] = item.value
  })

  if (allValid) emit('update:modelValue', result)
}

function addRow(index: number) {
  if (props.readonly) return
  tableRows.splice(index + 1, 0, defaultItem())
}

function removeRow(index: number) {
  if (props.readonly) return
  if (tableRows.length > 1) tableRows.splice(index, 1)
  handleBlur()
}
</script>

<style scoped lang="scss">
.kv-editor {
  width: 100%;
  min-width: 0;
}
.kv-editor :deep(.scene-edit-property-table .el-table__header-wrapper th.el-table__cell) {
  height: 32px;

  /** Figma 的 32px 表头已包含文字行高，取消纵向内边距可避免 Element Plus 撑高到 36px。 */
  padding: 0 12px;
  background: #18222b;
}
.kv-editor :deep(.scene-edit-property-table .el-table__body-wrapper td.el-table__cell) {
  height: 56px;
  padding: 12px;
  background: #1d2a35;
}
.kv-editor :deep(.scene-edit-property-table .cell) {
  padding: 0;
}
.kv-editor__result {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}
.kv-editor__result--error {
  color: #e16e6e;
}
.kv-editor__result--ok {
  color: #53c797;
}
.kv-editor__actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
}
.kv-editor__actions :deep(.scene-edit-property-button.is-text) {
  width: 20px;
  min-width: 20px;
  height: 20px;
  min-height: 20px;
  padding: 0;
  color: rgb(255 255 255 / 40%);
  background: transparent;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 2px;
}
.kv-editor__actions :deep(.scene-edit-property-button.is-text:hover) {
  color: #5ab2a5;
  border-color: rgb(90 178 165 / 50%);
}
.kv-editor__js-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 700;
  color: #e6a23c;
  background: rgb(230 162 60 / 15%);
  border-radius: 2px;
}
</style>
