/**
 * 认证提供者公共入口。
 *
 * 页面和请求层应从这里依赖稳定契约，不直接依赖 iframe 实现；未来接入独立登录时只需
 * 提供同样的 AuthProvider，即可替换组合根而不修改业务模块。
 */
export type {
  AuthProvider,
  AuthProviderErrorCode,
  AuthStatus,
  AuthStatusListener,
} from './authTypes'
export { AuthProviderError } from './authTypes'

