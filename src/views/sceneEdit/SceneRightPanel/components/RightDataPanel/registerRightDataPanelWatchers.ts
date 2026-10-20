import { watch, type ComputedRef, type Ref } from 'vue'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import type { ComponentDataConfig, DatasetRequestConfig } from '@/types/data-config'
import type { DatasetProperty } from '@/types/threeScene'

interface RegisterRightDataPanelWatchersOptions {
  availableFields: Ref<string[]>
  editableConfig: Ref<ComponentDataConfig | null>
  hydrating: Ref<boolean>
  initializationRevision: Ref<number>
  isChartWidgetSelection: ComputedRef<boolean>
  selectedWidget: ComputedRef<{ id: string; component: BaseWidgetConfig } | null>
  ensureChartRuleBinding: () => void
  autoFillChartMapping: (
    config: ComponentDataConfig,
    fields: string[],
    keyName: string,
  ) => void
  selectionKey: ComputedRef<string>
  refreshToken: ComputedRef<string>
  requestError: Ref<string>
  staticJsonError: Ref<string>
  datasetFieldLoadError: Ref<string>
  availableDatasetFields: Ref<string[]>
  latestRequestRaw: Ref<unknown>
  getSelectedConfig: () => ComponentDataConfig
  initializeSelectionState: (selectedConfig: ComponentDataConfig) => Promise<void>
  staticJsonText: Ref<string>
  validateStaticJsonSoon: () => void
  loadedDatasetKey: Ref<string>
  refreshAvailableFields: () => void
  loadDatasetFields: (requestConfig: DatasetRequestConfig) => Promise<void>
}

/**
 * 集中注册右侧数据面板的监听器。
 *
 * 原组合函数里同时承载大量 watch 编排，导致主体再次膨胀。
 * 这里把“字段变化联动”“选中态初始化”“静态数据校验”“数据集字段同步”统一外提，
 * 保留原有行为不变，只收缩主组合函数的职责体积。
 */
export const registerRightDataPanelWatchers = (
  options: RegisterRightDataPanelWatchersOptions,
) => {
  watch(options.availableFields, (fields) => {
    if (!options.editableConfig.value || options.hydrating.value) return
    if (!options.isChartWidgetSelection.value || fields.length === 0) return
    options.autoFillChartMapping(
      options.editableConfig.value,
      fields,
      options.selectedWidget.value?.component.info.keyName || '',
    )
  })

  watch(
    [options.editableConfig, options.isChartWidgetSelection],
    () => {
      if (options.hydrating.value) return
      options.ensureChartRuleBinding()
    },
    { immediate: true },
  )

  watch(
    () => [options.selectionKey.value, options.refreshToken.value] as const,
    async () => {
      const revision = ++options.initializationRevision.value
      options.hydrating.value = true
      options.requestError.value = ''
      options.staticJsonError.value = ''
      options.datasetFieldLoadError.value = ''
      options.availableDatasetFields.value = []
      options.latestRequestRaw.value = null

      const selectedConfig = options.getSelectedConfig()
      await options.initializeSelectionState(selectedConfig)
      // 选中对象或刷新令牌变化后，旧初始化结果不能解除新一轮 hydrating 状态。
      if (revision !== options.initializationRevision.value) return
      options.hydrating.value = false
    },
    { immediate: true },
  )

  watch(options.staticJsonText, () => {
    if (options.editableConfig.value?.request.type === 'static' && !options.hydrating.value) {
      options.validateStaticJsonSoon()
    }
  })

  watch(
    () => {
      if (options.editableConfig.value?.request.type !== 'dataset') return ''
      const datasetProperty = (options.editableConfig.value.request.config as DatasetRequestConfig)
        .datasetProperty as DatasetProperty | undefined
      return [
        datasetProperty?.datasetName || '',
        datasetProperty?.dataSourceId || '',
        datasetProperty?.tableName || '',
      ].join('::')
    },
    async (datasetKey) => {
      if (
        !options.editableConfig.value ||
        options.hydrating.value ||
        options.editableConfig.value.request.type !== 'dataset'
      ) {
        return
      }

      if (!datasetKey) {
        options.availableDatasetFields.value = []
        options.loadedDatasetKey.value = ''
        options.refreshAvailableFields()
        return
      }

      if (
        datasetKey === options.loadedDatasetKey.value &&
        options.availableDatasetFields.value.length > 0
      ) {
        return
      }

      await options.loadDatasetFields(
        options.editableConfig.value.request.config as DatasetRequestConfig,
      )
    },
  )
}
