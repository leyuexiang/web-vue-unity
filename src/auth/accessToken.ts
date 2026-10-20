/**
 * 统一把原始访问令牌或已带授权方案前缀的值整理成原始令牌。
 *
 * 登录回跳、刷新接口以及三维临时令牌的历史配置可能保存纯令牌，也可能保存
 * `Bearer <令牌>`。调用方生成 `Authorization` 请求头时会统一添加一次前缀，
 * 因此这里去除一个或多个已有前缀，并清理首尾空白，避免重复前缀导致服务端
 * 解析到错误或不完整的令牌。
 */
export function normalizeAccessToken(token: string | null | undefined): string {
  return token?.trim().replace(/^(?:Bearer\s+)+/i, '').trim() ?? ''
}
