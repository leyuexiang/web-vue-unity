import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  CONDITION_RULE_TYPE_ENUM,
  JUDGMENT_TYPE_ENUM,
  OBJECT_TYPE_ENUM,
  FIXED_VALUE_TYPE_ENUM,
} from '@/enums/scenePanelEnum'
import { getSceneAllContents } from '@/utils/renderScene/sceneModules'
import type { ConditionItem, DatasetProperty, SceneAllContentsItem } from '@/types/threeScene'
import {
  objectTypeOptions,
  fixedValueTypeOptions,
  judgmentTypeOptions,
  modelValueTypeOptions,
  domSelectorTypeOptions,
  fixedValueFieldMap,
  widgetRuntimeObjectTypeOption,
  widgetRuntimeFieldOptions,
  isWidgetRuntimeSupportedKeyName,
} from '../config'
import { isConditionItemCompleted } from '../utils'
import {
  buildDataConfigFieldOptions,
  getSceneObjectDataConfigByUuid,
  getWidgetDataConfigById,
} from '@/utils/dataConfig'
import type { DatasetContext, FixedValueLocation, JsonContext } from '../type'
import { createUuid } from '@/utils/uuid'
import { resolveWidgetPanelSelection } from '@/integrations/scene/widgetPanels'
import { useSceneStore } from '@/stores/sceneEditStore'
import { getActiveSceneViewportHost } from '@/integrations/scene/editorScenePlatformHost'
import { getEditorSceneObjectTargetCandidates } from '@/integrations/scene/editorSceneObjectTargetCandidates'
import { getEditorSceneObjectDataConfig } from '@/integrations/scene/editorSceneDataConfigAdapter'
import { resolveEditorSceneObjectIdFromLegacyEngineId } from '@/integrations/scene/editorSceneRuntimeObjectIdResolver'

interface ConditionBlockPayload {
  conditionList?: ConditionItem[]
  conditionRuleType?: CONDITION_RULE_TYPE_ENUM | null
}

interface UseAddRulesDialogOptions {
  targetKind?: 'auto' | 'widget' | 'sceneObject'
}

/**
 * 规则配置弹窗的状态与交互逻辑。
 *
 * 模板本身已经很长，若脚本继续堆在 SFC 内部，会让弹窗文件持续超长。
 * 这里把字段来源、条件编辑、JSON/数据集上下文和确认逻辑统一下沉，
 * 保留模板文件只负责表格与控件渲染。
 */
export const useAddRulesDialog = (
  emit: (
    event: 'confirm',
    data: {
      conditionList: ConditionItem[]
      conditionRuleType: CONDITION_RULE_TYPE_ENUM | null
    },
  ) => void,
  options: UseAddRulesDialogOptions = {},
) => {
  const targetKind = options.targetKind || 'auto'
  const sceneStore = useSceneStore()
  const dialogVisible = ref(false)
  const ruleType = ref(CONDITION_RULE_TYPE_ENUM.All)
  const modelValueOptions = ref<SceneAllContentsItem[]>([])

  /**
   * 在打开规则弹窗前刷新三维对象候选。
   *
   * SceneStore 是候选的主读源，旧场景遍历只补充尚未迁移的历史对象。刻意不把该查询
   * 放在深度响应式计算中：规则表单输入时不会反复遍历整个场景，打开弹窗时刷新一次即可。
   */
  const refreshModelValueOptions = () => {
    modelValueOptions.value = getEditorSceneObjectTargetCandidates({
      store: getActiveSceneViewportHost()?.getStore() ?? null,
      legacyContents: getSceneAllContents(),
    })
  }

  const currentWidgetEntry = computed(() => {
    if (targetKind === 'sceneObject') return null
    const selection = resolveWidgetPanelSelection()
    return selection.kind === 'widget' || selection.kind === 'widgetChild' ? selection.widget : null
  })

  const currentSceneObjectUuid = computed(() => {
    if (targetKind === 'widget') return null
    return sceneStore.currentTransformMaterialUuid || null
  })

  /**
   * 三维规则弹窗同时兼容平台对象 id 与历史 Three uuid。
   * 新格式对象优先使用稳定的 SceneObject.id，旧 uuid 只作为运行时映射和数据读取兜底。
   */
  const resolveCurrentSceneObjectId = () => {
    const selectedId = currentSceneObjectUuid.value
    const host = getActiveSceneViewportHost()
    const store = host?.getStore() ?? null
    if (!selectedId || !store) return null
    if (store.getObject(selectedId)) return selectedId
    return resolveEditorSceneObjectIdFromLegacyEngineId(host?.getRuntime(), selectedId)
  }

  const widgetRuntimeFieldOptionsForCurrentWidget = computed(() =>
    isWidgetRuntimeSupportedKeyName(currentWidgetEntry.value?.component.info.keyName)
      ? widgetRuntimeFieldOptions
      : [],
  )

  const availableObjectTypeOptions = computed(() =>
    widgetRuntimeFieldOptionsForCurrentWidget.value.length > 0
      ? [...objectTypeOptions, widgetRuntimeObjectTypeOption]
      : objectTypeOptions,
  )

  const componentDataFieldOptions = ref<string[]>([])

  const createEmptyCondition = (): ConditionItem => ({
    id: createUuid(),
    sourceObjectType: OBJECT_TYPE_ENUM.FixedValue,
    judgmentType: JUDGMENT_TYPE_ENUM.Equal,
    targetObjectType: OBJECT_TYPE_ENUM.FixedValue,
    status: false,
  })

  const tableData = ref<ConditionItem[]>([])

  const getCurrentTargetDataConfig = () => {
    /**
     * 规则弹窗显式区分二维和三维目标：
     * - 二维面板只读 component.dataConfig；
     * - 三维面板优先读取 SceneObject.metadata.dataConfig，再回退历史 mesh.userData.dataConfig；
     * - auto 仅保留旧入口兼容，优先当前二维选择。
     */
    if (targetKind === 'widget') {
      return getWidgetDataConfigById(currentWidgetEntry.value?.id)
    }
    if (targetKind === 'sceneObject') {
      const host = getActiveSceneViewportHost()
      const legacyDataConfig = getSceneObjectDataConfigByUuid(currentSceneObjectUuid.value)
      return getEditorSceneObjectDataConfig({
        store: host?.getStore() ?? null,
        objectId: resolveCurrentSceneObjectId(),
        legacyDataConfig,
      })
    }
    if (currentWidgetEntry.value?.id) {
      return getWidgetDataConfigById(currentWidgetEntry.value.id)
    }
    return getSceneObjectDataConfigByUuid(currentSceneObjectUuid.value)
  }

  const showDialog = (conditionBlock?: ConditionBlockPayload) => {
    refreshModelValueOptions()
    componentDataFieldOptions.value = buildDataConfigFieldOptions(getCurrentTargetDataConfig())

    if (conditionBlock?.conditionList?.length) {
      tableData.value = conditionBlock.conditionList.map((item) => ({ ...item }))
    }

    if (conditionBlock?.conditionRuleType !== undefined) {
      ruleType.value = conditionBlock.conditionRuleType ?? CONDITION_RULE_TYPE_ENUM.All
    } else {
      ruleType.value = CONDITION_RULE_TYPE_ENUM.All
    }

    dialogVisible.value = true
  }

  const handleClose = () => {
    tableData.value = []
    ruleType.value = CONDITION_RULE_TYPE_ENUM.All
    dialogVisible.value = false
  }

  const handleAddCondition = () => {
    tableData.value.push(createEmptyCondition())
  }

  const handleRemoveCondition = (rowId: string) => {
    if (tableData.value.length === 1) {
      tableData.value.splice(0, 1, createEmptyCondition())
      return
    }
    tableData.value = tableData.value.filter((item) => item.id !== rowId)
  }

  const handleFixedValueTypeChange = (
    location: FixedValueLocation,
    row: ConditionItem,
    type?: FIXED_VALUE_TYPE_ENUM,
  ) => {
    const field = fixedValueFieldMap[location]
    row[field.valueKey] = undefined as ConditionItem[typeof field.valueKey]
    row[field.textKey] = '' as ConditionItem[typeof field.textKey]
    if (type === FIXED_VALUE_TYPE_ENUM.Boolean) {
      row[field.valueKey] = false as ConditionItem[typeof field.valueKey]
    }
  }

  const addJsonDialogRef = ref<{ showDialog: (jsonValue?: string) => void }>()

  const getJsonInitialValue = (row: ConditionItem, location: FixedValueLocation) => {
    const field = fixedValueFieldMap[location]
    const value = row[field.valueKey]
    return typeof value === 'string' ? value : ''
  }

  const editingJsonContext = ref<JsonContext | null>(null)

  const handleAddJson = (location: FixedValueLocation, row: ConditionItem) => {
    editingJsonContext.value = {
      rowId: row.id,
      location,
    }
    addJsonDialogRef.value?.showDialog(getJsonInitialValue(row, location))
  }

  const handleJsonConfirm = (jsonValue: string) => {
    if (!editingJsonContext.value) return
    const targetRow = tableData.value.find((item) => item.id === editingJsonContext.value?.rowId)
    if (!targetRow) {
      editingJsonContext.value = null
      return
    }
    const field = fixedValueFieldMap[editingJsonContext.value.location]
    targetRow[field.valueKey] = jsonValue as ConditionItem[typeof field.valueKey]
    editingJsonContext.value = null
  }

  const setDatasetDialogRef = ref<{
    showDialog: (datasetProperty?: DatasetProperty | null) => Promise<void>
  }>()
  const editingDatasetContext = ref<DatasetContext | null>(null)

  const handleSetDataset = (type: DatasetContext['type'], row: ConditionItem) => {
    editingDatasetContext.value = {
      rowId: row.id,
      type,
    }
    const datasetProperty =
      type === 'source' ? (row.sourceDatasetProperty ?? null) : (row.targetDatasetProperty ?? null)
    setDatasetDialogRef.value?.showDialog(datasetProperty)
  }

  const handleSetDatasetConfirm = (datasetProperty: DatasetProperty) => {
    if (!editingDatasetContext.value) return
    const targetRow = tableData.value.find((item) => item.id === editingDatasetContext.value?.rowId)
    if (!targetRow) {
      editingDatasetContext.value = null
      return
    }
    if (editingDatasetContext.value.type === 'source') {
      targetRow.sourceDatasetProperty = datasetProperty
    } else {
      targetRow.targetDatasetProperty = datasetProperty
    }
    editingDatasetContext.value = null
  }

  const handleConfirm = () => {
    const isAllValid = tableData.value.every((item) => item.status)
    if (!isAllValid) {
      ElMessage.warning('请先完善所有条件')
      return
    }
    emit('confirm', {
      conditionList: tableData.value,
      conditionRuleType: ruleType.value,
    })
    handleClose()
  }

  const syncTableStatus = () => {
    tableData.value.forEach((row) => {
      const nextStatus = isConditionItemCompleted(row)
      if (row.status !== nextStatus) {
        row.status = nextStatus
      }
    })
  }

  watch(tableData, syncTableStatus, { deep: true, immediate: true })

  return {
    dialogVisible,
    ruleType,
    tableData,
    modelValueOptions,
    availableObjectTypeOptions,
    componentDataFieldOptions,
    widgetRuntimeFieldOptionsForCurrentWidget,
    fixedValueTypeOptions,
    judgmentTypeOptions,
    modelValueTypeOptions,
    domSelectorTypeOptions,
    addJsonDialogRef,
    setDatasetDialogRef,
    showDialog,
    handleClose,
    handleAddCondition,
    handleRemoveCondition,
    handleFixedValueTypeChange,
    handleAddJson,
    handleJsonConfirm,
    handleSetDataset,
    handleSetDatasetConfirm,
    handleConfirm,
  }
}
