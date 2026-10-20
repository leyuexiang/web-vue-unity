import { cloneDeep } from 'lodash-es'
import type { ComponentDataConfig } from '@/types/data-config'
import { DATA_CONFIG_VERSION } from '@/types/data-config'
import { DEFAULT_GOVIEW_ICON_NAME, normalizeGoviewIconName, resolveGoviewIconItem } from './iconCatalog'
import type { VIconOption } from './config'

export const GOVIEW_ICON_DATA_FIELD = 'icon'

/**
 * 图标部件的静态数据保持为单行二维表。
 * 这样它能复用当前右侧数据面板的 widget value 映射，
 * 同时默认打开“数据”页签时能直接看到当前图标名。
 */
export const createGoviewIconDataConfig = (iconName: string): ComponentDataConfig => {
  const safeIconName = normalizeGoviewIconName(iconName)

  return {
    version: DATA_CONFIG_VERSION,
    request: {
      type: 'static',
      config: {
        data: [{ [GOVIEW_ICON_DATA_FIELD]: safeIconName }],
      },
    },
    extractor: {
      resultPath: '',
    },
    dataset: {
      dimensions: [GOVIEW_ICON_DATA_FIELD],
      source: [{ [GOVIEW_ICON_DATA_FIELD]: safeIconName }],
    },
    bindings: [
      {
        kind: 'widget',
        targetPath: 'value',
        sourceField: GOVIEW_ICON_DATA_FIELD,
        valueType: 'string',
      },
    ],
  }
}

/**
 * 左侧每张图标卡片都会带着一份预设配置进入拖拽链路。
 * 这里集中生成 option 与 dataConfig，避免面板组件和 Store 各自拼同一套字段。
 */
export const createGoviewIconPreset = (iconName: string) => {
  const safeIconName = normalizeGoviewIconName(iconName)
  const iconItem = resolveGoviewIconItem(safeIconName)
  const label = iconItem?.title || safeIconName

  const option: Partial<VIconOption> = {
    dataset: safeIconName,
    value: safeIconName,
    label,
  }

  return {
    option: cloneDeep(option),
    dataConfig: createGoviewIconDataConfig(safeIconName),
  }
}

export const createDefaultGoviewIconPreset = () => createGoviewIconPreset(DEFAULT_GOVIEW_ICON_NAME)
