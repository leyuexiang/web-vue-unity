import type { ComponentDataConfig, PublicRequestReferenceConfig } from '@/types/data-config'
import type { DatasetProperty } from '@/types/threeScene'
import { createDatasetRequestConfig } from './rightDataPanelRequestHelpers'

export interface ClearDatasetRequestResult {
  requestConfig: ReturnType<typeof createDatasetRequestConfig>
  availableDatasetFields: string[]
  loadedDatasetKey: string
}

/**
 * 生成“清空数据集绑定”后的下一份局部状态。
 *
 * 这里把 request.config、字段缓存和已加载标识统一收口，
 * 避免组件在多个分支里重复拼装同一套清空动作。
 */
export function clearRightDataPanelDatasetRequest(): ClearDatasetRequestResult {
  return {
    requestConfig: createDatasetRequestConfig(null),
    availableDatasetFields: [],
    loadedDatasetKey: '',
  }
}

/**
 * 根据弹窗返回的数据集属性，构造面板需要写回的请求配置。
 *
 * 右侧面板仍然沿用既有 datasetProperty 结构，确保旧场景配置不需要迁移。
 */
export function applyRightDataPanelDatasetProperty(datasetProperty: DatasetProperty) {
  return createDatasetRequestConfig(datasetProperty)
}

/**
 * 把下拉框值规范成公共接口引用配置。
 *
 * 组件层输入可能来自 `string | number | boolean | undefined`，
 * 这里统一转成 `publicRequestId | null`，避免模板事件回调里散落类型收口逻辑。
 */
export function createRightDataPanelPublicRequestReference(
  value: string | number | boolean | undefined,
): PublicRequestReferenceConfig {
  return {
    publicRequestId: value ? String(value) : null,
  }
}

/**
 * 生成右侧面板“下载 JSON”动作的最终文本快照。
 *
 * 静态请求直接导出编辑中的原始 JSON 文本；
 * 其它请求导出当前预览区文本，保持用户看到什么就下载什么。
 */
export function createRightDataPanelDownloadSnapshot(
  requestType: ComponentDataConfig['request']['type'] | undefined,
  staticJsonText: string,
  dataContentDisplay: string,
) {
  return requestType === 'static' ? staticJsonText : dataContentDisplay
}

/**
 * 触发隐藏文件输入框。
 *
 * 组件只负责维护 ref，本函数负责真正的 DOM 点击动作，
 * 这样文件选择入口和后续读取逻辑就能保持同一层语义。
 */
export function triggerRightDataPanelFileInput(fileInput: HTMLInputElement | null | undefined) {
  fileInput?.click()
}

/**
 * 读取导入文件内容，并在成功后立即重置 input 的 value。
 *
 * 重置动作必须在 helper 内完成，否则用户连续导入同一文件时，
 * 浏览器不会再次触发 `change` 事件，面板会表现成“导入按钮失效”。
 */
export async function readRightDataPanelImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return null
  const content = await file.text()
  input.value = ''
  return content
}

/**
 * 以 JSON 文本下载当前数据快照。
 *
 * 浏览器对象 URL 只在点击完成后短暂保留，随后立即释放，
 * 避免右侧面板频繁导出时堆积无用 Blob URL。
 */
export function downloadRightDataPanelJson(payload: string, fileName = 'data.json') {
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
