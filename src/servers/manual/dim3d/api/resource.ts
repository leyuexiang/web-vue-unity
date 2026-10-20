import request from '@/request.ts'
import { getDim3dHeaders } from './auth'
import { DIM3D_AMM_PREFIX, DIM3D_API_PREFIX } from './constants'

/** 模型资源元信息，resourceRelativePath 是 amm 桶内相对路径，不是完整 URL。 */
export interface Dim3dResourceInfo {
  id?: string | number
  resourceName?: string
  resourceType?: string
  assetName?: string
  resourceRelativePath?: string
}

export interface Dim3dResourceInfoResponse {
  code?: number
  msg?: string
  data?: Dim3dResourceInfo
}

/** 资源详情接口由统一三维服务器根地址派生，禁止在业务适配器中维护 IP 和端口。 */
const DIM3D_RESOURCE_INFO_URL = `${DIM3D_API_PREFIX}/dim3d/resource/info`

/** 按 modelFileId 查询模型资源元信息；编号始终按字符串传递，避免大整数精度损失。 */
export function getDim3dResourceInfo(
  modelFileId: string,
  options?: Record<string, unknown>,
): Promise<Dim3dResourceInfoResponse> {
  return request<Dim3dResourceInfoResponse>(
    `${DIM3D_RESOURCE_INFO_URL}/${encodeURIComponent(modelFileId.trim())}`,
    {
      method: 'GET',
      headers: getDim3dHeaders(),
      passAuth: true,
      // 资源详情是模型文件解析的公共接口；平台差异只作用于模型列表，详情沿用原始路径。
      skipPlatformPath: true,
      ...(options || {}),
    },
  )
}

/** 将接口相对路径规范化为 amm 桶完整地址，避免重复或缺失斜杠。 */
export function buildDim3dResourceUrl(resourceRelativePath: string) {
  const normalizedPath = resourceRelativePath.trim().replace(/^\/+/, '')
  return normalizedPath ? `${DIM3D_AMM_PREFIX}${normalizedPath}` : ''
}

export { DIM3D_AMM_PREFIX, DIM3D_RESOURCE_INFO_URL }
