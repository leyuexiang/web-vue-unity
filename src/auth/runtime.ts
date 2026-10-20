import { authContext } from './authContext'
import { createIframeAuthProvider, type AuthProvider, type AuthContext } from './index'
import {
  clearTabAuthHandoffCache,
  consumeTabAuthHandoff,
  persistTabAuthRefreshContext,
  requestTabAuthHandoff,
} from './tabAuthHandoff'

/**
 * 应用启动阶段共享的认证运行时。
 *
 * 组合根只创建一次提供者，请求层和状态仓库通过本模块读取同一份内存上下文，避免
 * 每个模块重复注册 message 监听器或各自保存令牌。独立模式仍允许由调用方注入其他提供者。
 */
let activeProvider: AuthProvider | null = null

/**
 * 仅恢复独立页签携带的鉴权上下文，不回退到 iframe 握手。
 *
 * 场景预览既允许匿名访问，也可能由管理页或租户登录页携带鉴权快照打开；当没有快照时
 * 必须立即返回 null，让预览页先调用 resolve 判断是否需要登录，不能等待不存在的父 iframe。
 */
export async function initializeTabAuthentication(): Promise<Readonly<AuthContext> | null> {
  const applyContext = (context: AuthContext | null): Readonly<AuthContext> | null => {
    if (!context) return null
    try {
      const snapshot = authContext.set(context)
      if (authContext.hasValidContext()) {
        // 只在校验通过后写入；消费函数不重复序列化同一份认证上下文。
        persistTabAuthRefreshContext(snapshot)
        return snapshot
      }
    } catch {
      // 旧宿主的畸形消息不能让预览或编辑器启动停在未处理的异常中。
    }
    authContext.clear()
    return null
  }

  const handoffContext = consumeTabAuthHandoff()
  const restoredContext = applyContext(handoffContext)
  if (restoredContext) return restoredContext

  const handoffId = new URLSearchParams(window.location.search).get('authHandoff')
  if (!handoffId) return null
  return applyContext(await requestTabAuthHandoff(handoffId))
}

export function isEmbeddedMode(): boolean {
  return import.meta.env.VITE_EMBED_MODE === 'true'
}

export function getAuthProvider(): AuthProvider | null {
  return activeProvider
}

export function configureIframeAuthProvider(): AuthProvider {
  if (activeProvider) return activeProvider

  // 同一三维服务会同时嵌入运营端和租户端，因此支持逗号分隔的多宿主来源；
  // 保留单来源变量作为旧部署配置的兼容回退。
  const parentOrigins = [
    String(import.meta.env.VITE_OPERATION_ORIGINS || ''),
    String(import.meta.env.VITE_OPERATION_ORIGIN || ''),
  ]
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
  const parentOrigin = parentOrigins[0]
  if (!parentOrigin) throw new Error('内嵌模式缺少父页面来源配置')

  activeProvider = createIframeAuthProvider(
    {
      parentOrigin,
      parentOrigins,
      platformTypes: ['tenant', 'operation'],
      onStatusChange: (_status, context) => {
        if (context) authContext.set(context as AuthContext)
        else authContext.clear()
      },
    },
    authContext,
  )
  return activeProvider
}

export async function initializeAuthentication(): Promise<Readonly<AuthContext> | null> {
  if (!isEmbeddedMode()) return authContext.get()
  // 编辑器/预览页签由场景管理页单独打开，不再具备 iframe 父窗口；优先消费一次性
  // 同源鉴权交接，避免把独立页签误判为“登录无效”。
  const tabContext = await initializeTabAuthentication()
  if (tabContext) return tabContext
  return configureIframeAuthProvider().initialize()
}

export function clearAuthenticationRuntime(): void {
  activeProvider?.clear()
  authContext.clear()
  // 后端已确认失效时同时清理当前页签副本，防止刷新后再次恢复被拒绝的凭据。
  clearTabAuthHandoffCache()
}
