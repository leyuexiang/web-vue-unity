// @ts-nocheck
import request from '@/request.ts'
import { DIM3D_SERVER_URL } from '@/servers/manual/dim3d/api/constants'
import { PREFIX } from './const'

type ManualRequestOptions = Record<string, unknown>

/** 获取 token */
export async function getToken(
  data: { username: string, password: string, rememberMe: number, messageCode?: string },
  options?: ManualRequestOptions,
) {
  return request(`${PREFIX}/api/auth/getToken`, {
    method: 'POST',
    data: { ...data },
    ...(options || {}),
  })
}

/** 公开场景游客登录参数，与租户端密码登录协议保持一致。 */
export interface PublicPreviewGuestLoginPayload {
  /** 登录前用于识别租户 Web 应用。 */
  clientId: string
  /** 租户端账号类型固定为 2。 */
  accountType: 2
  phonenumber: string
  password: string
  grantType: 'password'
}

/** 租户游客登录接口返回的最小字段集合。 */
export interface PublicPreviewGuestLoginResult {
  code?: number
  msg?: string
  data?: { access_token?: string, client_id?: string, expire_in?: number }
}

/** 游客登录与三维新接口共用服务器地址，部署时只维护一套协议、IP 和端口。 */
export const PUBLIC_PREVIEW_GUEST_LOGIN_URL = `${DIM3D_SERVER_URL}/api/auth/tenant/login`

/** OpenAPI 将请求体声明为字符串，因此发送序列化后的 JSON 登录参数。 */
export async function loginPublicPreviewGuest(
  payload: PublicPreviewGuestLoginPayload,
) {
  return request(PUBLIC_PREVIEW_GUEST_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify(payload),
    passAuth: true,
    // 内嵌构建被直接作为公开地址访问时尚无宿主凭证，允许此公开预览登录请求先建立游客上下文。
    publicPreview: true,
    skipPlatformPath: true,
  }) as Promise<PublicPreviewGuestLoginResult>
}
