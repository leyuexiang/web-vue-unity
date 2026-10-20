/**
 * 将登录服务基址规范化为唯一的登录页地址。
 *
 * 登录服务地址可能来自运行时地址配置，也可能已经包含 `/login`、尾斜杠、
 * 查询参数或哈希。这里统一使用 URL 解析并清除旧查询，保证调用方后续只
 * 拼接当前页面回跳参数，不会在多次鉴权失败时重复追加登录路径。
 *
 * @param baseUrl 登录服务基址或已包含登录页的地址。
 * @param fallbackOrigin 解析相对地址时使用的来源，测试和非浏览器环境可显式传入。
 * @returns 规范化后的绝对登录页地址。
 */
export function resolveLoginUrl(
  baseUrl: string,
  fallbackOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
): string {
  const normalizedBaseUrl = baseUrl.trim()
  if (!normalizedBaseUrl) throw new Error('登录地址获取失败！')

  const loginUrl = new URL(normalizedBaseUrl, fallbackOrigin)
  const pathWithoutTrailingSlash = loginUrl.pathname.replace(/\/+$/, '')
  // 对已包含一个或多个 `/login` 的地址保持幂等，只保留最后一个登录路径段。
  const basePath = pathWithoutTrailingSlash.replace(/(?:\/login)+$/i, '')
  loginUrl.pathname = `${basePath || ''}/login`
  // 登录跳转参数由 toLogin 统一生成，避免复用配置地址中的旧回跳参数。
  loginUrl.search = ''
  loginUrl.hash = ''

  return loginUrl.toString()
}
