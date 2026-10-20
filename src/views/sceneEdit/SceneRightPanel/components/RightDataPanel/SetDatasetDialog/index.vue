<template>
  <ScenePropertyDialog
    v-model="dialogVisible"
    class="scene-edit-dialog--dataset"
    title="选择数据集属性"
    :width="850"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    align-center
    @close="handleClose"
  >
    <div class="scene-edit-dataset-panel">
      <span class="mr-[10px]">当前选择:</span>
      <el-tag
        v-if="currentRowText"
        closable
        class="scene-edit-dataset-panel__tag"
        @close="handleTagClose"
      >
        {{ currentRowText }}
      </el-tag>
      <span v-else>无</span>
    </div>
    <div class="h-[1px] bg-[#ffffff1a] my-4 w-full"></div>
    <div class="flex">
      <div class="border-r-[2px] border-[#ffffff14] pr-4">
        <span class="scene-edit-dataset-panel__section-title">数据集列表</span>
        <div class="mt-4">
          <div
            v-for="item in datasetList"
            :key="item.id"
            class="scene-edit-dataset-panel__dataset-item truncate w-[145px] h-[38px] cursor-pointer flex px-2 my-1 items-center"
            :class="{
              'scene-edit-dataset-panel__dataset-item--active': currentDatasetId === item.id,
            }"
            @click="switchDataset(item.id)"
          >
            {{ item.name }}
          </div>
        </div>
      </div>
      <div class="ml-4 flex-1">
        <div class="scene-edit-dataset-panel__section-title mb-2">属性列表</div>
        <ScenePropertyTable
          ref="tableRef"
          :data="tableData"
          style="width: 100%"
          max-height="280"
          v-loading="loading"
          :row-class-name="getRowClassName"
          @row-click="handleRowClick"
        >
          <el-table-column width="50">
            <template #default="scope">
              <ScenePropertyRadioGroup
                v-model="selectedBindProperty"
                @change="handleRowClick(asDatasetColumn(scope.row))"
              >
                <el-radio :value="scope.row.fieldname" @click.stop></el-radio>
              </ScenePropertyRadioGroup>
            </template>
          </el-table-column>
          <el-table-column prop="index" type="index" label="序号" width="70" />
          <el-table-column prop="fieldname" label="属性名" show-overflow-tooltip />
          <el-table-column prop="fieldtype" label="类型" width="120" show-overflow-tooltip />
          <el-table-column prop="tablename" label="表名" width="120" show-overflow-tooltip />
          <el-table-column prop="dbname" label="数据库" show-overflow-tooltip />
        </ScenePropertyTable>
        <div class="mt-4 flex justify-end">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="originalTableData.length"
            layout="prev, pager, next, jumper, total"
            small
          />
        </div>
      </div>
    </div>
    <template #footer>
      <ScenePropertyButton @click="handleClose">取消</ScenePropertyButton>
      <ScenePropertyButton type="primary" @click="handleConfirm">确定</ScenePropertyButton>
    </template>
  </ScenePropertyDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSceneDataStore } from '@/stores/sceneEditStore'
import { generateBindPropertyText, generateCurrentDataset, generateCurrentRowText } from '../utils'
import type { DatasetProperty } from '@/types/threeScene'
import { ElMessage } from 'element-plus'
import { appLogger } from '@/utils/logger'
import ScenePropertyDialog from '@/components/ScenePropertyDialog/index.vue'
import ScenePropertyTable from '../../PropertyControls/ScenePropertyTable/index.vue'

const emit = defineEmits(['onConfirm'])

const sceneDataStore = useSceneDataStore()

const dialogVisible = ref(false)
const loading = ref(false)
const tableRef = ref()

const getRowClassName = ({ row }: { row: Record<string, unknown> }) => {
  return selectedBindProperty.value === row.fieldname ? 'highlight-row' : ''
}

const datasetList = sceneDataStore.sceneDataset
const currentDatasetId = ref(datasetList[0]?.id || '')

const currentPage = ref(1)
const pageSize = ref(10)

const currentTableNames = computed(() => {
  return (
    datasetList
      .find((item) => item.id === currentDatasetId.value)
      ?.dataSourceList.map((item) => item.tableName) || []
  )
})

const originalTableData = ref<DataMiddlewareApi.MetadataGetColumns2['data']['columns']>([])
type DatasetColumn = DataMiddlewareApi.MetadataGetColumns2['data']['columns'][0]
const asDatasetColumn = (row: unknown) => row as DatasetColumn

const tableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return originalTableData.value.slice(start, end)
})

const selectedRows = ref<DataMiddlewareApi.MetadataGetColumns2['data']['columns'][0]>()
const selectedBindProperty = ref<number | string>('')
const currentRowText = ref<string>('')

const showDialog = async (datasetProperty: DatasetProperty | null = null) => {
  dialogVisible.value = true
  currentPage.value = 1
  try {
    loading.value = true
    originalTableData.value = await generateCurrentDataset(datasetList, currentTableNames.value)
    if (datasetProperty) {
      selectedBindProperty.value = datasetProperty.bindProperty
      currentRowText.value = generateBindPropertyText(datasetProperty)
      selectedRows.value = originalTableData.value.find(
        (item) => item.fieldname === datasetProperty.bindProperty,
      )
    }
  } catch (error) {
    // 弹窗初次加载失败时保留数据集 id，便于定位数据集中缺失的表或字段。
    appLogger.error('SetDatasetDialog', '获取表格数据失败', currentDatasetId.value, error)
  } finally {
    loading.value = false
  }
}

const switchDataset = async (id: string) => {
  currentDatasetId.value = id
  currentPage.value = 1
  try {
    loading.value = true
    originalTableData.value = await generateCurrentDataset(datasetList, currentTableNames.value)
  } catch (error) {
    appLogger.error('SetDatasetDialog', '切换数据集后获取表格数据失败', id, error)
  } finally {
    loading.value = false
  }
}

const handleRowClick = (row: DataMiddlewareApi.MetadataGetColumns2['data']['columns'][0]) => {
  selectedBindProperty.value = row.fieldname
  selectedRows.value = row
  const datasetName = datasetList.find((item) => item.id === currentDatasetId.value)?.name || ''
  currentRowText.value = generateCurrentRowText(datasetName, row)
}

const handleTagClose = () => {
  selectedBindProperty.value = ''
  selectedRows.value = {} as DataMiddlewareApi.MetadataGetColumns2['data']['columns'][0]
  currentRowText.value = ''

  if (tableRef.value) {
    tableRef.value.clearSelection()
  }
}

const handleConfirm = () => {
  const find = datasetList.find((item) => item.id === currentDatasetId.value)
  const { fieldname, tablename, dbname } = selectedRows.value || {}
  let datasetProperty: DatasetProperty | null = null

  if (find) {
    const findDataSource = find.dataSourceList.find((item) => item.tableName === tablename)
    if (findDataSource) {
      datasetProperty = {
        datasetName: find.name,
        bindProperty: fieldname || '',
        databaseName: dbname || '',
        tableName: tablename || '',
        dataSourceId: findDataSource.dataSourceId || '',
      }
    }
  }

  if (!datasetProperty) {
    ElMessage.error('属性内容缺失，请重新选择')
    return
  }

  emit('onConfirm', datasetProperty)
  handleClose()
}

const handleClose = () => {
  dialogVisible.value = false
  currentPage.value = 1
  originalTableData.value = []
  selectedBindProperty.value = ''
  selectedRows.value = {} as DataMiddlewareApi.MetadataGetColumns2['data']['columns'][0]
  currentDatasetId.value = datasetList[0]?.id || ''
  currentRowText.value = ''
}

defineExpose({
  showDialog,
})
</script>

<style scoped>
.dataset-dialog {
  .el-dialog__body {
    padding: 20px;
  }
}
.scene-edit-dataset-panel,
.scene-edit-dataset-panel :deep(*) {
  color: var(--scene-edit-text-2);
}
.scene-edit-dataset-panel :deep(.el-tag),
.scene-edit-dataset-panel :deep(.el-table),
.scene-edit-dataset-panel :deep(.el-table th),
.scene-edit-dataset-panel :deep(.el-table td),
.scene-edit-dataset-panel :deep(.el-pagination),
.scene-edit-dataset-panel :deep(.el-pagination *),
.scene-edit-dataset-panel :deep(.el-empty__description),
.scene-edit-dataset-panel :deep(.el-empty__description p) {
  color: var(--scene-edit-text-2) !important;
}
.scene-edit-dataset-panel :deep(.el-table th .cell),
.scene-edit-dataset-panel :deep(.el-table td .cell),
.scene-edit-dataset-panel :deep(.el-radio__label) {
  color: var(--scene-edit-text) !important;
}
.scene-edit-dataset-panel__section-title {
  color: var(--scene-edit-text-2);
}
.scene-edit-dataset-panel__tag {
  color: var(--scene-edit-text) !important;
  background: rgb(64 42 24 / 92%) !important;
  border-color: rgb(96 165 250 / 22%) !important;
}
.scene-edit-dataset-panel__dataset-item {
  color: var(--scene-edit-text-2);
  background: rgb(255 255 255 / 4%);
  border: 1px solid transparent;
  border-radius: 8px;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}
.scene-edit-dataset-panel__dataset-item:hover {
  color: var(--scene-edit-text);
  background: rgb(74 49 28 / 92%);
  border-color: rgb(96 165 250 / 20%);
}
.scene-edit-dataset-panel__dataset-item--active {
  color: var(--scene-edit-text) !important;
  background: rgb(59 130 246 / 88%) !important;
  border-color: rgb(96 165 250 / 28%) !important;
}
:deep(.highlight-row) {
  background: rgb(59 130 246 / 88%) !important;
  border-left: 3px solid #60a5fa;
}
:deep(.highlight-row:hover) {
  background: rgb(93 57 24 / 94%) !important;
}
.scene-edit-dataset-panel :deep(.el-table__body tr.current-row > td.el-table__cell),
.scene-edit-dataset-panel :deep(.el-table__body tr.highlight-row > td.el-table__cell) {
  background: transparent !important;
}
.scene-edit-dataset-panel :deep(.el-radio__inner) {
  background: rgb(24 26 30 / 92%);
  border-color: rgb(96 165 250 / 28%);
}
.scene-edit-dataset-panel :deep(.el-radio__input.is-checked .el-radio__inner) {
  background: var(--scene-edit-accent);
  border-color: var(--scene-edit-accent-2);
}
.scene-edit-dataset-panel :deep(.el-pagination .btn-prev),
.scene-edit-dataset-panel :deep(.el-pagination .btn-next),
.scene-edit-dataset-panel :deep(.el-pagination .el-pager li) {
  color: var(--scene-edit-text-2) !important;
  background: rgb(24 26 30 / 92%) !important;
}
.scene-edit-dataset-panel :deep(.el-pagination .el-pager li.is-active) {
  color: var(--scene-edit-text) !important;
  background: rgb(59 130 246 / 88%) !important;
  border-color: rgb(96 165 250 / 28%) !important;
}
.scene-edit-dataset-panel :deep(.el-pagination .el-pager li.is-active.number),
.scene-edit-dataset-panel :deep(.el-pagination.el-pagination--small .el-pager li.is-active),
.scene-edit-dataset-panel :deep(.el-pagination.el-pagination--small .el-pager li.is-active.number) {
  color: var(--scene-edit-text) !important;
  background: rgb(59 130 246 / 88%) !important;
  box-shadow: inset 0 0 0 1px rgb(96 165 250 / 24%);
}
.scene-edit-dataset-panel :deep(.el-pagination .btn-prev:disabled),
.scene-edit-dataset-panel :deep(.el-pagination .btn-next:disabled),
.scene-edit-dataset-panel :deep(.el-pagination .btn-prev.is-disabled),
.scene-edit-dataset-panel :deep(.el-pagination .btn-next.is-disabled) {
  color: var(--scene-edit-text-3) !important;
}
.scene-edit-dataset-panel :deep(.el-table__body tr.highlight-row .cell),
.scene-edit-dataset-panel :deep(.el-table__body tr.highlight-row .el-radio__label),
.scene-edit-dataset-panel :deep(.el-table__body tr.highlight-row .el-radio),
.scene-edit-dataset-panel :deep(.el-tag__content),
.scene-edit-dataset-panel :deep(.el-tag__close) {
  color: var(--scene-edit-text) !important;
}
</style>
