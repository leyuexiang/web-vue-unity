import { clearAuthenticationRuntime } from './runtime'

const PREVIEW_LOGIN_REDIRECT_KEY = 'xr-center-preview-login-redirect-at'
const PREVIEW_LOGIN_REDIRECT_COOLDOWN_MS = 5_000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

/** 判断预览请求失败是否属于需要重新登录的 401。 */
export function isScenePreviewAuthenticationError(error: unknown): boolean {
  if (!isRecord(error)) return false
  return error.code === 401 || error.status === 401
}

/**
 * 跳转租户端既有登录页，并把当前预览地址作为回跳目标。
 *
 * 父页面精确来源沿用 iframe 鉴权配置；回跳前删除已经消费或失效的交接参数，防止登录回来后
 * 旧 window.name、authHandoff 或刷新缓存抢在新 xrAuth 前恢复过期令牌。
 */
export function redirectScenePreviewToTenantLogin(): boolean {
  if (typeof window === 'undefined') return false

  const lastRedirectAt = Number(sessionStorage.getItem(PREVIEW_LOGIN_REDIRECT_KEY) || 0)
  if (Date.now() - lastRedirectAt < PREVIEW_LOGIN_REDIRECT_COOLDOWN_MS) return false

  const tenantOrigin = String(import.meta.env.VITE_OPERATION_ORIGIN || '').trim()
  if (!tenantOrigin) throw new Error('租户端登录地址未配置。')

  const loginUrl = new URL('/login', tenantOrigin)
  const returnUrl = new URL(window.location.href)
  returnUrl.searchParams.delete('authHandoff')
  returnUrl.searchParams.delete('clientKey')
  returnUrl.hash = ''

  loginUrl.searchParams.set('redirect', returnUrl.toString())
  sessionStorage.setItem(PREVIEW_LOGIN_REDIRECT_KEY, String(Date.now()))
  clearAuthenticationRuntime()
  window.name = ''
  window.location.replace(loginUrl.toString())
  return true
}

/** 登录态已经成功换取预览会话后解除防循环保护，后续真实过期仍可再次进入登录。 */
export function clearScenePreviewLoginRedirectGuard(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PREVIEW_LOGIN_REDIRECT_KEY)
}
