import { cloneDeep } from 'lodash-es'
import { isEmbeddedMode } from '@/auth/runtime'
import {
  isChartBindingRule,
  type AjaxRequestConfig,
  type ComponentDataConfig,
  type ComponentDataRequestItem,
} from '@/types/data-config'
import {
  buildChartEditorContent,
  normalizeStaticChartEditorPayload,
  resolveComponentData,
} from '@/utils/dataConfig'
import { getChartPanelSchema } from '@/packages/components/Chart/shared/chartConfigMeta'
import type { DataPanelRequestItem } from './multiRequestPanelState'

export interface StaticPayloadValidationResult {
  isValid: boolean
  payload?: unknown
  errorMessage: string
}

/**
 * 校验右侧面板里的静态 JSON 文本。
 *
 * 打点模式要求数组输入；其它模式只校验 JSON 可解析，
 * 这样组件层可以统一消费结果，不必在多个 watch 和保存分支里重复 try/catch。
 */
export function validateRightDataPanelStaticPayload(
  staticJsonText: string,
  isMarkingSelection: boolean,
): StaticPayloadValidationResult {
  try {
    const payload = JSON.parse(staticJsonText)
    if (isMarkingSelection && !Array.isArray(payload)) {
      return {
        isValid: false,
        errorMessage: '打点静态数据必须是数组，数组中的每一项会生成一个实例。',
      }
    }

    return {
      isValid: true,
      payload,
      errorMessage: '',
    }
  } catch (error) {
    return {
      isValid: false,
      errorMessage: error instanceof Error ? error.message : 'JSON 格式错误',
    }
  }
}

export interface PrepareRightDataPanelPersistConfigOptions {
  config: ComponentDataConfig
  staticJsonText: string
  isMarkingSelection: boolean
  availableDatasetFields: string[]
  isChartWidgetSelection: boolean
  selectedChartComponent?: Parameters<typeof buildChartEditorContent>[0]
}

export interface PrepareRightDataPanelPersistConfigResult {
  preparedConfig: ComponentDataConfig
  staticJsonError: string
}

/**
 * 嵌入模式的鉴权头和场景编号由运行时注入，不允许进入数据配置持久化快照。
 * 独立模式保留旧场景手动配置，避免破坏第三方接口的兼容能力。
 */
const stripEmbeddedRuntimeFields = (config: ComponentDataConfig): ComponentDataConfig => {
  if (!isEmbeddedMode() || config.request.type !== 'ajax') return config
  const ajax = config.request.config as AjaxRequestConfig
  const sceneParamNames = new Set(['sceneid'])
  const authHeaderNames = new Set(['authorization', 'clientid'])
  const removeKeys = (source: Record<string, string> | undefined, names: Set<string>) => {
    if (!source) return
    Object.keys(source).forEach((key) => {
      if (names.has(key.toLowerCase())) delete source[key]
    })
  }
  removeKeys(ajax.requestParams?.Params, sceneParamNames)
  removeKeys(ajax.requestParams?.Header, authHeaderNames)
  removeKeys(ajax.requestHeaders, authHeaderNames)
  return config
}

/**
 * 组装右侧数据面板的多请求持久化快照。
 *
 * 活动请求配置只是当前表单草稿，不能直接在它上面挂载整个 `requests` 数组。
 * 否则活动请求会同时成为根配置和请求项，后续对任意一份数据做原地修改时，
 * 根镜像与其它请求可能通过共享引用互相影响。这里深复制根配置和每个请求项，
 * 并明确让兼容用的根字段镜像请求1，确保请求一、请求二、请求三的数据完全隔离。
 */
export function buildRightDataPanelPersistedConfig(
  preparedConfig: ComponentDataConfig,
  requestItems: DataPanelRequestItem[],
): ComponentDataConfig {
  const persistedConfig = cloneDeep(preparedConfig) as ComponentDataConfig & {
    requests?: ComponentDataRequestItem[]
  }
  const requests = requestItems.map((item) => {
    const requestConfig = cloneDeep(item.config) as ComponentDataConfig & {
      requests?: unknown
    }
    stripEmbeddedRuntimeFields(requestConfig)
    // 请求项只承载自身配置，移除历史保存中可能残留的嵌套 requests，避免递归复制。
    delete requestConfig.requests
    return {
      id: item.id,
      name: item.name,
      collapsed: item.collapsed,
      ...requestConfig,
    }
  })

  persistedConfig.requests = requests
  const firstRequest = requests[0]
  if (firstRequest) {
    // 根字段只是旧调用点的兼容镜像，永远指向请求1，不能指向当前活动请求。
    persistedConfig.request = firstRequest.request
    persistedConfig.extractor = firstRequest.extractor
    persistedConfig.dataset = firstRequest.dataset
    persistedConfig.bindings = firstRequest.bindings
    persistedConfig.threeMapRole = firstRequest.threeMapRole
    persistedConfig.mergeMode = firstRequest.mergeMode
    persistedConfig.filterFn = firstRequest.filterFn
    persistedConfig.deletedAutoMappingTargets = firstRequest.deletedAutoMappingTargets
  }

  return persistedConfig
}

/**
 * 在真正写回选中对象前，完成右侧面板配置的持久化整理。
 *
 * 这里集中处理：
 * - 静态 JSON 解析与打点数组校验
 * - 图表静态数据归一化
 * - dataset/source 与 dimensions 的最终回写
 */
export function prepareRightDataPanelPersistConfig(
  options: PrepareRightDataPanelPersistConfigOptions,
): PrepareRightDataPanelPersistConfigResult {
  const preparedConfig = options.config
  const staticJsonError = ''

  if (preparedConfig.request.type === 'static') {
    const validation = validateRightDataPanelStaticPayload(
      options.staticJsonText,
      options.isMarkingSelection,
    )
    if (!validation.isValid) {
      return {
        preparedConfig,
        staticJsonError: validation.errorMessage,
      }
    }

    ;(preparedConfig.request.config as { data: unknown }).data = validation.payload

    if (options.isChartWidgetSelection && options.selectedChartComponent) {
      const normalizedChartPayload = normalizeStaticChartEditorPayload(
        options.selectedChartComponent,
        validation.payload,
        preparedConfig,
      )
      preparedConfig.dataset.dimensions = normalizedChartPayload.dimensions
      preparedConfig.dataset.source = normalizedChartPayload.source
      if (normalizedChartPayload.binding) {
        const currentBinding = preparedConfig.bindings.find(isChartBindingRule)
        /**
         * 静态图表编辑只负责把内容归一化为行数据，不能覆盖用户在属性映射区的删除记录、
         * 人工目标字段或自动字段来源标记；否则每次编辑 JSON 都会把已删除自动项重新写回。
         * 归一化结果仍提供最新来源字段，目标字段元数据始终以当前面板草稿为准。
         */
        preparedConfig.bindings = [
          currentBinding
            ? {
                ...normalizedChartPayload.binding,
                targetDimensionField: currentBinding.targetDimensionField,
                targetMeasureFields: currentBinding.targetMeasureFields,
                targetMeasureFieldOrigins: currentBinding.targetMeasureFieldOrigins,
              }
            : normalizedChartPayload.binding,
        ]
      }
    } else {
      /**
       * 普通静态数据的字段缓存来自上一次保存，不能作为本次编辑后的字段定义。
       * 解析成功后先使缓存失效，再由下方统一解析器按提取结果的首条记录重建字段；
       * 这样新增、改名和清空数据都会同步到映射下拉，且只需沿用一次数据解析。
       * 图表继续保留上方按图表类型归一化的字段，人工映射和删除记录均不改写。
       */
      preparedConfig.dataset.dimensions = []
    }
  }

  const resolved = resolveComponentData(preparedConfig)
  if (preparedConfig.request.type === 'dataset' && options.availableDatasetFields.length > 0) {
    preparedConfig.dataset.dimensions = [...options.availableDatasetFields]
  } else if (preparedConfig.request.type === 'static') {
    preparedConfig.dataset.dimensions = resolved.dimensions
    preparedConfig.dataset.source = resolved.source
  }

  return {
    preparedConfig,
    staticJsonError,
  }
}

/**
 * 只在真正影响字段来源的条件变化后，返回当前应该展示的字段列表。
 *
 * 数据集请求直接沿用接口字段；其它类型继续从统一数据解析层推导维度。
 */
export function resolveRightDataPanelAvailableFields(
  config: ComponentDataConfig | null,
  availableDatasetFields: string[],
) {
  if (!config) return [] as string[]
  if (config.request.type === 'dataset') {
    return [...availableDatasetFields]
  }

  return resolveComponentData(config).dimensions
}

/**
 * 生成“数据内容”预览区应展示的文本。
 *
 * 图表优先展示可编辑的族化内容；普通控件则展示当前 dataset.source。
 * 这样组件层只负责把结果写回文本框，不再堆叠多段回退逻辑。
 */
export function buildRightDataPanelContentDisplay(
  config: ComponentDataConfig | null,
  selectedChartComponent?: Parameters<typeof buildChartEditorContent>[0],
) {
  if (!config) return ''

  if (selectedChartComponent) {
    const previewContent = buildChartEditorContent(selectedChartComponent, config)
    if (previewContent) {
      return JSON.stringify(previewContent, null, 2)
    }

    const chartOption = (selectedChartComponent.option as Record<string, unknown> | undefined)
      ?.chartOption as Record<string, unknown> | undefined
    if (chartOption?.dataset) {
      return JSON.stringify(chartOption.dataset, null, 2)
    }

    const family = getChartPanelSchema(selectedChartComponent.info.keyName || '').family
    if (family === 'gauge') {
      return JSON.stringify(
        { dimensions: ['name', 'value'], source: [{ name: '指标', value: 50 }] },
        null,
        2,
      )
    }
    if (family === 'treemap') {
      return JSON.stringify(
        { dimensions: ['name', 'value'], source: [{ name: '当归', value: 580 }] },
        null,
        2,
      )
    }
    if (family === 'sankey') {
      return JSON.stringify(
        { nodes: [{ name: 'A' }, { name: 'B' }], links: [{ source: 'A', target: 'B', value: 10 }] },
        null,
        2,
      )
    }
  }

  const source = config.dataset.source
  if (Array.isArray(source) && source.length > 0) {
    return JSON.stringify(source, null, 2)
  }

  return ''
}

/**
 * 为当前选中项生成右侧面板里的静态 JSON 初始文本。
 *
 * 图表控件优先展示族化编辑结构；普通对象和普通控件则回退到 request.config.data
 * 或当前 dataset.source，保证进入面板时用户看到的内容就是可直接编辑的来源。
 */
export function buildRightDataPanelStaticJsonText(
  config: ComponentDataConfig,
  selectedChartComponent?: Parameters<typeof buildChartEditorContent>[0],
) {
  const staticData =
    config.request.type === 'static'
      ? (config.request.config as { data?: unknown }).data
      : undefined

  /**
   * 新增请求的静态数据明确为空时，直接展示空数组或空对象。
   * 不能继续调用图表示例数据推导，否则右侧会出现 series、nodes 等并不属于新请求的
   * 模板内容，容易让用户误以为请求已经返回了真实数据。
   */
  if (
    config.request.type === 'static' &&
    ((Array.isArray(staticData) && staticData.length === 0) ||
      Boolean(
        staticData &&
          typeof staticData === 'object' &&
          !Array.isArray(staticData) &&
          Object.keys(staticData).length === 0,
      ))
  ) {
    return JSON.stringify(staticData ?? [], null, 2)
  }

  if (selectedChartComponent && config.request.type === 'static') {
    return JSON.stringify(buildChartEditorContent(selectedChartComponent, config) ?? [], null, 2)
  }

  return JSON.stringify(
    (config.request.config as { data?: unknown }).data ?? config.dataset.source ?? [],
    null,
    2,
  )
}

export interface InitializeRightDataPanelStateOptions {
  selectedConfig: ComponentDataConfig
  isChartWidgetSelection: boolean
  selectedChartComponent?: Parameters<typeof buildChartEditorContent>[0]
  availableFields: string[]
}

export interface InitializeRightDataPanelStateResult {
  editableConfig: ComponentDataConfig
  staticJsonText: string
  shouldLoadDatasetFields: boolean
  shouldAutoFillChartMapping: boolean
}

/**
 * 生成切换选中目标后的右侧面板初始状态。
 *
 * 组件层只负责重置响应式标记、按需加载字段和触发自动映射；
 * 这里集中确定初始草稿、静态 JSON 文本以及后续是否需要补充动作。
 */
export function initializeRightDataPanelState(
  options: InitializeRightDataPanelStateOptions,
): InitializeRightDataPanelStateResult {
  const editableConfig = options.selectedConfig

  return {
    editableConfig,
    staticJsonText: buildRightDataPanelStaticJsonText(
      editableConfig,
      editableConfig.request.type === 'static' && options.isChartWidgetSelection
        ? options.selectedChartComponent
        : undefined,
    ),
    shouldLoadDatasetFields: editableConfig.request.type === 'dataset',
    shouldAutoFillChartMapping:
      options.isChartWidgetSelection && options.availableFields.length >= 0,
  }
}
