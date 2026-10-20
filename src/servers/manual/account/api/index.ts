/**
 * 旧账户模块的兼容导出入口。实现已迁至独立认证模块，不再请求历史管理接口。
 * 登录、退出、会话恢复和续期统一使用业务服务器；完整协议见接口文档第五份。
 */
export { loginStandalone as login, logoutStandalone as logout, restoreStandalone as getDetailOfAccount } from '@/auth/standalone'
