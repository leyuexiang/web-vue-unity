import { cloneDeep } from 'lodash-es'
import type { ComponentDataConfig } from '@/types/data-config'
import { createUuid } from '@/utils/uuid'

/**
 * 右侧数据面板请求项的界面状态。
 * `config` 保留请求自身的完整配置；`collapsed` 只影响展示，不参与运行时数据。
 */
export interface DataPanelRequestItem {
  id: string
  /** 界面序号名称由列表位置生成，禁止用户编辑。 */
  name: string
  collapsed: boolean
  config: ComponentDataConfig
}

const MAX_REQUEST_COUNT = 5

/** 创建稳定编号的请求项，默认沿用对象当前示例静态数据。 */
export function createDataPanelRequestItem(
  config: ComponentDataConfig,
  index = 0,
  id?: string,
): DataPanelRequestItem {
  return {
    // 首项使用可读且稳定的 request-1；后续项由 UUID 保证删除/重排时不冲突。
    id: id || (index === 0 ? 'request-1' : createUuid()),
    name: `请求${index + 1}`,
    collapsed: false,
    // 请求项必须拥有自己的深复制快照，避免新增请求或切换请求时共享 dataset/source 引用。
    config: cloneDeep(config),
  }
}

/**
 * 从对象配置初始化请求项。
 * 新协议直接读取 `requests`；尚未有请求列表时把当前配置包装成请求1，避免清空示例数据。
 */
export function normalizeDataPanelRequestItems(
  config: ComponentDataConfig,
): DataPanelRequestItem[] {
  const rawRequests = (config as ComponentDataConfig & { requests?: unknown }).requests
  if (Array.isArray(rawRequests) && rawRequests.length > 0) {
    return rawRequests.slice(0, MAX_REQUEST_COUNT).map((raw, index) => {
      const value = raw as Partial<DataPanelRequestItem> &
        ComponentDataConfig & {
          deletedAutoMappingTargets?: string[]
        }
      // 新协议的请求项直接承载 request/dataset/bindings 等字段；兼容早期
      // 试验版本里可能出现的 { config: ComponentDataConfig } 包装结构。
      const nestedConfig = cloneDeep(
        value.config && typeof value.config === 'object'
          ? value.config
          : ({
              version: config.version,
              request: value.request,
              extractor: value.extractor,
              dataset: value.dataset,
              bindings: value.bindings,
              threeMapRole: value.threeMapRole,
              mergeMode: value.mergeMode,
              filterFn: value.filterFn,
              deletedAutoMappingTargets: value.deletedAutoMappingTargets,
            } as ComponentDataConfig)
      )
      // 请求项只保存自身字段；剥离旧数据中可能遗留的嵌套请求列表，避免请求递归共享。
      delete (nestedConfig as ComponentDataConfig & { requests?: unknown }).requests
      return {
        id: typeof value.id === 'string' && value.id ? value.id : createUuid(),
        name: `请求${index + 1}`,
        collapsed: Boolean(value.collapsed),
        config: nestedConfig,
      }
    })
  }
  return [createDataPanelRequestItem(config, 0, 'request-1')]
}

/** 删除请求后统一重排显示名称，内部 id 保持不变。 */
export function renameDataPanelRequestItems(items: DataPanelRequestItem[]) {
  items.forEach((item, index) => {
    item.name = `请求${index + 1}`
  })
  return items
}

/**
 * 设置请求项的唯一展开项。
 *
 * 展开编号为空时表示全部收起；该函数集中更新持久化用的 `collapsed` 字段，
 * 避免标题、箭头和内容区域分别维护折叠状态而产生不一致。
 */
export function setDataPanelRequestExpansion(
  items: DataPanelRequestItem[],
  expandedId: string | null,
) {
  const normalizedId = expandedId || ''
  items.forEach((item) => {
    item.collapsed = item.id !== normalizedId
  })
  return items
}

export { MAX_REQUEST_COUNT }
