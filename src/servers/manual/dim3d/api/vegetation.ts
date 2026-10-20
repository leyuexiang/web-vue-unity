import request from '@/request.ts'
import type {
  VegetationPublicationDensityProfile,
  VegetationQualityPreset,
} from '@/scene-platform/core/types'
import { getDim3dRequestOptions } from './auth'
import { DIM3D_OPERATION_API_PREFIX } from './constants'

/** 植被任务的正式状态；只有等待和运行状态允许继续轮询。 */
export type Dim3dVegetationGenerationTaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL_FAILED'
  | 'FAILED'
  | 'CANCELED'

/** 生成器可选观测数据。旧任务缺失时由业务层按基础计数展示，不能补造进度。 */
export interface Dim3dVegetationGenerationProgress {
  currentStage: string
  stageStartedAt?: string | null
  phaseDurationsMs?: Record<string, number> | null
  metrics?: Record<string, number> | null
  totalDurationMs?: number | null
  createdAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  failedStage?: string | null
  stale?: boolean
}

/** 生成任务传输视图。服务端未声明必填的结果字段保持可选，交由具体操作校验。 */
export interface Dim3dVegetationGenerationTaskResponse {
  taskId: string
  status: Dim3dVegetationGenerationTaskStatus
  totalTileCount?: number
  completedTileCount?: number
  failedTileCount?: number
  candidateCount?: number
  instanceCount?: number
  manifestUrl?: string
  errorMessage?: string
  publicationVersion?: string
  tilesetUrl?: string
  layerTilesetUrls?: Record<string, string>
  layerDensityTilesetUrls?: Record<string, Partial<Record<VegetationQualityPreset, string>>>
  sourceHash?: string
  generatorVersion?: string
  densityProfiles?: Partial<Record<VegetationQualityPreset, VegetationPublicationDensityProfile>>
  progress?: Dim3dVegetationGenerationProgress | null
}

/** 稳定发布传输视图。任务号始终使用字符串，避免后端长整型在浏览器中丢失精度。 */
export interface Dim3dVegetationPublicationResponse {
  sceneId: string
  publicationVersion: string
  taskId: string
  ruleVersion: string
  generatorVersion: string
  manifestUrl: string
  tilesetUrl: string
  layerTilesetUrls: Record<string, string>
  layerDensityTilesetUrls?: Record<string, Partial<Record<VegetationQualityPreset, string>>>
  sourceHash: string
  status: 'STABLE' | 'ROLLED_BACK'
  instanceCount: number
  tileCount: number
  densityProfiles?: Partial<Record<VegetationQualityPreset, VegetationPublicationDensityProfile>>
}

const VEGETATION_TASK_PATH = '/dim3d/vegetation/generation-task'
const VEGETATION_DYNAMIC_WINDOW_PATH = '/dim3d/vegetation/dynamic-tile/window'

/** 八个真实接口统一返回 `code/msg/data`；业务码不是200时保留后端消息。 */
interface Dim3dVegetationEnvelope<T> {
  code: number
  msg?: string
  data: T
}

/** 所有编辑态植被请求统一经过三维网关认证，避免通用拦截器覆盖专用令牌。 */
function requestVegetation<T>(path: string, options: Record<string, unknown>) {
  const authOptions = getDim3dRequestOptions('application/json')
  return request<T>(`${DIM3D_OPERATION_API_PREFIX}${path}`, {
    ...options,
    ...authOptions,
    headers: { ...authOptions.headers, ...(options.headers as Record<string, string> | undefined) },
  }).catch((error: unknown) => {
    /**
     * 通用拦截器会提前拒绝业务错误对象，无法进入后续解包流程。
     * 仅转换带有效消息的业务对象，保留错误码；网络异常与中止异常原样传递，
     * 避免丢失调用方用于取消判断的异常身份，也不在此重试写操作。
     */
    if (error && typeof error === 'object' && !(error instanceof Error)) {
      const response = error as { code?: unknown; msg?: unknown }
      if (typeof response.msg === 'string' && response.msg.trim()) {
        throw Object.assign(new Error(response.msg), { code: response.code })
      }
    }
    throw error
  })
}

/** 路径编号只能接受非空字符串；数字编号可能已在JSON解析阶段发生精度损失。 */
function normalizeVegetationId(value: string, fieldName: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${fieldName} 必须是非空字符串编号。`)
  return normalized
}

/**
 * 通用请求层只处理已登记的全局错误码，不会替业务模块移除 `data` 包装。
 * 植被接口在这里统一按真实契约解包，避免各适配器重复读取或误把根响应当任务视图。
 */
function unwrapVegetationResponse<T>(value: unknown, responseName: string): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${responseName}必须是对象。`)
  }
  const envelope = value as Partial<Dim3dVegetationEnvelope<T>>
  if (envelope.code !== 200) {
    throw new Error(envelope.msg?.trim() || `${responseName}业务处理失败。`)
  }
  if (!Object.prototype.hasOwnProperty.call(envelope, 'data')) {
    throw new Error(`${responseName}缺少data字段。`)
  }
  return envelope.data as T
}

const VEGETATION_TASK_STATUSES = new Set<Dim3dVegetationGenerationTaskStatus>([
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'PARTIAL_FAILED',
  'FAILED',
  'CANCELED',
])

/** 读取响应中的必填字符串；不把数字编号或空值静默转成可用业务标识。 */
function requireResponseString(
  value: Record<string, unknown>,
  fieldName: string,
  responseName: string,
): string {
  const field = value[fieldName]
  if (typeof field !== 'string' || !field.trim()) {
    throw new Error(`${responseName}缺少有效的${fieldName}字符串。`)
  }
  return field
}

/** 六十四位计数仍以数字参与界面计算，但超出安全整数时必须阻断有损结果。 */
function assertSafeResponseCount(
  value: Record<string, unknown>,
  fieldName: string,
  responseName: string,
): void {
  const field = value[fieldName]
  if (field !== undefined && (!Number.isSafeInteger(field) || Number(field) < 0)) {
    throw new Error(`${responseName}的${fieldName}必须是非负安全整数。`)
  }
}

function normalizeVegetationTaskResponse(value: unknown): Dim3dVegetationGenerationTaskResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('植被任务响应必须是对象。')
  }
  const response = value as Record<string, unknown>
  requireResponseString(response, 'taskId', '植被任务响应')
  const status = requireResponseString(response, 'status', '植被任务响应')
  if (!VEGETATION_TASK_STATUSES.has(status as Dim3dVegetationGenerationTaskStatus)) {
    throw new Error(`植被任务响应包含未知状态：${status}`)
  }
  for (const fieldName of [
    'totalTileCount',
    'completedTileCount',
    'failedTileCount',
    'candidateCount',
    'instanceCount',
  ]) {
    assertSafeResponseCount(response, fieldName, '植被任务响应')
  }
  return response as unknown as Dim3dVegetationGenerationTaskResponse
}

function normalizeVegetationPublicationResponse(
  value: unknown,
): Dim3dVegetationPublicationResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('植被发布响应必须是对象。')
  }
  const response = value as Record<string, unknown>
  for (const fieldName of [
    'sceneId',
    'publicationVersion',
    'taskId',
    'ruleVersion',
    'generatorVersion',
    'manifestUrl',
    'tilesetUrl',
    'sourceHash',
    'status',
  ]) {
    requireResponseString(response, fieldName, '植被发布响应')
  }
  assertSafeResponseCount(response, 'instanceCount', '植被发布响应')
  assertSafeResponseCount(response, 'tileCount', '植被发布响应')
  if (!response.layerTilesetUrls || typeof response.layerTilesetUrls !== 'object') {
    throw new Error('植被发布响应缺少有效的layerTilesetUrls字典。')
  }
  return response as unknown as Dim3dVegetationPublicationResponse
}

export async function createDim3dVegetationGenerationTask<TBody>(body: TBody) {
  const response = await requestVegetation<unknown>(`${VEGETATION_TASK_PATH}/create`, {
    method: 'POST',
    data: body,
  })
  return normalizeVegetationTaskResponse(unwrapVegetationResponse(response, '创建植被任务响应'))
}

/** 生命周期信号透传到底层请求，切场景后及时释放在途查询。 */
export async function getDim3dVegetationGenerationTask(taskId: string, signal?: AbortSignal) {
  const response = await requestVegetation<unknown>(
    `${VEGETATION_TASK_PATH}/${encodeURIComponent(normalizeVegetationId(taskId, 'taskId'))}`,
    { method: 'GET', ...(signal ? { signal } : {}) },
  )
  return normalizeVegetationTaskResponse(unwrapVegetationResponse(response, '查询植被任务响应'))
}

export async function cancelDim3dVegetationGenerationTask(taskId: string) {
  const response = await requestVegetation<unknown>(
    `${VEGETATION_TASK_PATH}/${encodeURIComponent(normalizeVegetationId(taskId, 'taskId'))}/cancel`,
    { method: 'POST' },
  )
  return normalizeVegetationTaskResponse(unwrapVegetationResponse(response, '取消植被任务响应'))
}

export async function publishDim3dVegetationGenerationTask(taskId: string) {
  const response = await requestVegetation<unknown>(
    `${VEGETATION_TASK_PATH}/${encodeURIComponent(normalizeVegetationId(taskId, 'taskId'))}/publish`,
    { method: 'POST' },
  )
  return normalizeVegetationPublicationResponse(
    unwrapVegetationResponse(response, '发布植被任务响应'),
  )
}

export async function getDim3dCurrentVegetationPublication(sceneId: string) {
  const response = await requestVegetation<unknown>(
    `${VEGETATION_TASK_PATH}/scene/${encodeURIComponent(normalizeVegetationId(sceneId, 'sceneId'))}/current`,
    { method: 'GET', suppressNotFoundNotification: true },
  )
  return normalizeVegetationPublicationResponse(
    unwrapVegetationResponse(response, '当前植被版本响应'),
  )
}

export async function listDim3dVegetationPublicationHistory(sceneId: string) {
  const response = await requestVegetation<unknown>(
    `${VEGETATION_TASK_PATH}/scene/${encodeURIComponent(normalizeVegetationId(sceneId, 'sceneId'))}/history`,
    { method: 'GET' },
  )
  const history = unwrapVegetationResponse<unknown>(response, '植被发布历史响应')
  if (!Array.isArray(history)) throw new Error('植被发布历史响应data必须是数组。')
  return history.map(normalizeVegetationPublicationResponse)
}

export async function rollbackDim3dVegetationPublication(
  sceneId: string,
  publicationVersion: string,
) {
  const response = await requestVegetation<unknown>(
    `${VEGETATION_TASK_PATH}/scene/${encodeURIComponent(normalizeVegetationId(sceneId, 'sceneId'))}/rollback`,
    {
      method: 'POST',
      params: {
        publicationVersion: normalizeVegetationId(publicationVersion, 'publicationVersion'),
      },
    },
  )
  return normalizeVegetationPublicationResponse(unwrapVegetationResponse(response, '植被回滚响应'))
}

/**
 * 动态窗口传输层统一复用植被网关和认证，并保留后端返回的地块结果。
 * 地块状态、数量和编号完整性由动态适配层校验，避免通用请求层把部分失败误判为整组成功。
 */
export function requestDim3dVegetationDynamicWindow<TBody, TResponse>(
  body: TBody,
  signal?: AbortSignal,
) {
  return requestVegetation<Dim3dVegetationEnvelope<TResponse>>(VEGETATION_DYNAMIC_WINDOW_PATH, {
    method: 'POST',
    data: body,
    ...(signal ? { signal } : {}),
  }).then((response) => unwrapVegetationResponse<TResponse>(response, '动态植被窗口响应'))
}
