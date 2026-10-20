import { sessionStore } from './webStorage'
import { normalizeAccessToken } from '@/auth/accessToken'
import { authContext } from '@/auth/authContext'
import { clearStandalone, logoutStandalone } from '@/auth/standalone'
import { clearTabAuthHandoffCache } from '@/auth/tabAuthHandoff'

/** 只供迁移兼容读取；新独立会话由独立认证模块按页签保存。 */
export const AUTH_KEY = { ACCESS_TOKEN: 'accessToken', REFRESH_TOKEN: 'refreshToken', EXPIRES_TIME: 'expiresTime' }

/** 清理旧登录凭据和交接快照，通知组合根显示本项目登录表单，不再跳旧登录服务。 */
export async function toLogin(logout = false): Promise<void> {
  const task = logout ? logoutStandalone() : Promise.resolve(clearStandalone())
  Object.values(AUTH_KEY).forEach(key => sessionStore.remove(key))
  clearTabAuthHandoffCache()
  window.dispatchEvent(new CustomEvent('standalone-auth-required'))
  try { await task } catch { /* 远端注销失败也保持本地退出，不输出包含凭据的请求异常。 */ }
}

/** 旧地址中的令牌只删除、不采信；认证只来自登录接口或已有受信页签交接。 */
export function handleLoginRedirect(): void {
  Object.values(AUTH_KEY).forEach(key => sessionStore.remove(key))
  const url = new URL(window.location.href)
  const [hashPath, query = ''] = url.hash.split('?')
  const hashParams = new URLSearchParams(query)
  let changed = false
  for (const key of Object.values(AUTH_KEY)) {
    if (url.searchParams.has(key) || hashParams.has(key)) changed = true
    url.searchParams.delete(key)
    hashParams.delete(key)
  }
  if (changed) {
    url.hash = hashPath + (hashParams.size ? `?${hashParams}` : '')
    window.history.replaceState(window.history.state, '', url)
  }
}

/** 受信内存上下文优先；旧会话值仅保留给尚未切换的调用方兼容读取。 */
export function getAccessToken(): string {
  return normalizeAccessToken(authContext.get()?.accessToken ?? sessionStore.get<string>(AUTH_KEY.ACCESS_TOKEN))
}
