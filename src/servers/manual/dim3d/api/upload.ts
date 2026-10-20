import request from '@/request.ts'
import { getDim3dHeaders } from './auth'
import { DIM3D_API_PREFIX } from './constants'

/** 模型压缩包上传成功后，后续模型写入接口只消费这个资源编号。 */
export interface Dim3dUploadResource {
  id?: string | number
  resourceName?: string
  resourceType?: string
  assetName?: string
  resourceRelativePath?: string
}

export interface Dim3dUploadConvertResponse {
  code?: number
  msg?: string
  data?: Dim3dUploadResource
}

/** 上传转换接口由统一三维服务器根地址派生，服务器迁移时无需修改本文件。 */
const DIM3D_UPLOAD_URL = `${DIM3D_API_PREFIX}/dim3d/resource/uploadConvert`

const getUploadHeaders = () => {
  return getDim3dHeaders()
}

/**
 * 上传单个 ZIP 模型压缩包。FormData 字段固定为 `file`，不手动设置 Content-Type，
 * 让浏览器自动补齐 multipart boundary；调用方负责校验 code、data.id 和 resourceType。
 */
export function uploadConvertDim3dResource(
  file: File,
  options?: Record<string, unknown>,
): Promise<Dim3dUploadConvertResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return request<Dim3dUploadConvertResponse>(DIM3D_UPLOAD_URL, {
    method: 'POST',
    data: formData,
    requestType: 'form',
    headers: getUploadHeaders(),
    // 补充接口不在 `/admin-api` 下，鉴权头已按当前会话显式注入，避免请求拦截器误判登录地址。
    passAuth: true,
    ...(options || {}),
    // 模型文件上传由公共资源服务处理，不属于租户端或运营端，禁止追加平台路径。
    // 放在调用方选项之后，避免外部选项误将公共上传接口切换到平台路径。
    skipPlatformPath: true,
  })
}

export { DIM3D_UPLOAD_URL }
