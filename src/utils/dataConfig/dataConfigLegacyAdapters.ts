import { DRAG_MODEL_ENUM } from '@/enums'
import {
  createEmptyDataConfig,
  type ComponentDataBindingRule,
  type ComponentDataConfig,
  type DataBindingValueType,
  type DatasetRequestConfig,
  type MarkingBindingTargetPath,
  type ObjectBindingRule,
} from '@/types/data-config'
import type { DataPanelConfig, Dataset, DatasetProperty } from '@/types/threeScene'

const legacyTargetPathMap: Record<string, string> = {
  visible: 'visible',
  position: 'position',
  rotation: 'rotation',
  scaling: 'scale',
  scale: 'scale',
}

/**
 * 把旧版 `datasetConfigList` 的首条数据集绑定抽成当前请求配置结构。
 *
 * 旧协议里每一行都重复带一份 datasetProperty，
 * 当前协议只保留一份共享请求配置，因此这里固定取首条作为数据集来源。
 */
const buildDatasetRequestConfigFromLegacy = (panelConfigs: DataPanelConfig[]) => {
  const first = panelConfigs[0]
  return {
    datasetProperty: first?.datasetProperty
      ? ({
          ...first.datasetProperty,
        } satisfies DatasetProperty)
      : null,
  } satisfies DatasetRequestConfig
}

/**
 * 根据旧字段目标推断当前绑定值类型。
 *
 * 这一步用于历史场景升级，确保旋转、缩放、显隐等字段
 * 在迁移后仍然按正确的运行时值类型参与绑定。
 */
const inferValueType = (targetPath: string): DataBindingValueType => {
  if (targetPath === 'visible') return 'boolean'
  if (targetPath === 'rotation') return 'euler'
  if (targetPath === 'position' || targetPath === 'scale') return 'vector3'
  return 'string'
}

/**
 * 将旧版 `DataPanelConfig[]` 升级为当前 `ComponentDataConfig`。
 *
 * 旧版本把“请求来源”和“属性映射”混在一张列表里，
 * 这里会拆成新的 request + bindings 两段结构，供右侧数据面板和运行时共用。
 */
export const upgradeLegacyDataPanelConfigList = (
  panelConfigs: DataPanelConfig[] | undefined,
  modelType?: string,
  datasets: Dataset[] = [],
): ComponentDataConfig | null => {
  // 保留 datasets 入参仅用于兼容旧调用点，避免本轮重构扩大改动面。
  void datasets
  if (!panelConfigs || panelConfigs.length === 0) return null

  const dataConfig = createEmptyDataConfig()
  dataConfig.request.type = 'dataset'
  dataConfig.request.config = buildDatasetRequestConfigFromLegacy(panelConfigs)

  dataConfig.bindings = panelConfigs
    .map<ComponentDataBindingRule | null>((item) => {
      const targetPath = legacyTargetPathMap[item.fields?.[1] || item.propertyName]
      if (!targetPath) return null

      if (modelType === DRAG_MODEL_ENUM.Marking) {
        return {
          kind: 'marking',
          targetPath: targetPath as MarkingBindingTargetPath,
          sourceField: item.datasetProperty.bindProperty,
          valueType: inferValueType(targetPath),
          required: targetPath === 'position',
        }
      }

      return {
        kind: 'object',
        targetPath: targetPath as ObjectBindingRule['targetPath'],
        sourceField: item.datasetProperty.bindProperty,
        valueType: inferValueType(targetPath),
      }
    })
    .filter((item): item is ComponentDataBindingRule => Boolean(item))

  return dataConfig
}

/**
 * 将当前 `ComponentDataConfig` 反向写回旧版 `DataPanelConfig[]`。
 *
 * 编辑器历史链路和部分旧场景对象仍然读取这个结构，
 * 因此在完全删除旧协议前，保存阶段仍要同步维护一份兼容数据。
 */
export const buildLegacyDataPanelConfigList = (
  dataConfig: ComponentDataConfig | null | undefined,
): DataPanelConfig[] => {
  if (!dataConfig || dataConfig.request.type !== 'dataset') return []
  const requestConfig = dataConfig.request.config as DatasetRequestConfig

  return dataConfig.bindings
    .filter((item) => item.kind === 'object' || item.kind === 'marking')
    .map((item, index) => ({
      id: `${item.kind}-${item.targetPath}-${index}`,
      targetName: '',
      fields: ['property', item.targetPath === 'scale' ? 'scaling' : item.targetPath],
      propertyName: item.targetPath,
      datasetProperty: {
        datasetName: requestConfig.datasetProperty?.datasetName || '',
        bindProperty: item.sourceField,
        databaseName: requestConfig.datasetProperty?.databaseName || '',
        tableName: requestConfig.datasetProperty?.tableName || '',
        dataSourceId: requestConfig.datasetProperty?.dataSourceId || '',
      },
    }))
}
