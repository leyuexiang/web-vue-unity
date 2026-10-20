import { authContext } from '@/auth/authContext'
import { normalizeAccessToken } from '@/auth/accessToken'
import { isEmbeddedMode } from '@/auth/runtime'
import { getDim3dHeaders } from '@/servers/manual/dim3d/api/auth'

/** 数据面板请求执行时由宿主环境提供的运行时上下文。 */
export interface DataRequestRuntimeContext {
  /** 当前场景编号；仅嵌入模式要求必须存在。 */
  sceneId?: string | null
  /** 发布公开预览请求失败时保持页面内错误，不触发普通用户登录跳转。 */
  publicPreview?: boolean
}

const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '')

/**
 * 读取嵌入模式允许访问的数据接口来源。
 * 只比较协议、主机和端口，不允许通配符或模糊域名匹配，避免白名单意外放宽。
 */
const getAllowedOrigins = (): Set<string> => {
  const configured = String(import.meta.env.VITE_EMBED_DATA_API_ALLOWED_ORIGINS || '')
  return new Set(
    configured
      .split(',')
      .map(normalizeOrigin)
      .filter(Boolean)
      .flatMap((origin) => {
        try {
          return [normalizeOrigin(new URL(origin).origin)]
        } catch {
          return []
        }
      }),
  )
}

/** 判断地址是否为绝对 HTTP(S) 地址。 */
const isAbsoluteHttpUrl = (url: string) => /^https?:\/\//i.test(url.trim())

/**
 * 校验嵌入模式的数据接口来源。
 * 相对地址始终表示同源请求；绝对地址必须命中环境白名单，独立模式不做限制。
 */
export const assertEmbeddedDataRequestUrl = (url: string): void => {
  if (!isEmbeddedMode() || !isAbsoluteHttpUrl(url)) return

  const parsed = new URL(url)
  const allowedOrigins = getAllowedOrigins()
  if (!allowedOrigins.has(normalizeOrigin(parsed.origin))) {
    throw new Error('当前嵌入模式禁止访问未配置白名单的外部数据接口')
  }
}

/**
 * 读取嵌入模式必须携带的运行时鉴权头。
 * 令牌只存在内存鉴权上下文中，不写入数据面板配置或浏览器存储；生成授权头前会先规范化，
 * 兼容宿主传入纯令牌或已带 Bearer 前缀的令牌。
 */
export const getEmbeddedDataRequestHeaders = (): Record<string, string> => {
  if (!isEmbeddedMode()) return {}
  const context = authContext.get()
  if (!context?.accessToken || !context.clientId) {
    throw new Error('嵌入模式鉴权尚未完成，暂不能请求数据接口')
  }
  return {
    Authorization: `Bearer ${normalizeAccessToken(context.accessToken)}`,
    ClientId: context.clientId,
  }
}

/**
 * 判断独立模式的数据接口是否属于已配置的三维服务。
 * 不同环境可能通过不同端口暴露同一主机的接口，因此按协议和主机名匹配，并限定 `/api/` 路径，
 * 避免把模型资源凭证发送给任意外部地址或同主机上的非接口资源。
 */
const isConfiguredDim3dApiUrl = (url: string): boolean => {
  try {
    const pageOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
    const configuredServer = String(import.meta.env.VITE_DIM3D_SERVER_URL || '').trim()
    const trustedServer = new URL(configuredServer || pageOrigin, pageOrigin)
    const target = new URL(url, pageOrigin)
    return (
      target.protocol === trustedServer.protocol &&
      target.hostname === trustedServer.hostname &&
      target.pathname.startsWith('/api/')
    )
  } catch {
    return false
  }
}

/** 请求头名称不区分大小写，防止给已有的小写 Authorization / ClientId 再注入一份平台值。 */
const hasHeader = (headers: Record<string, unknown>, name: string): boolean => {
  const normalizedName = name.toLowerCase()
  return Object.keys(headers).some((key) => key.toLowerCase() === normalizedName)
}

/**
 * 为数据面板请求补齐当前平台凭证。
 * 嵌入模式必须使用宿主内存上下文并覆盖配置里可能遗留的鉴权头；独立模式访问已配置的
 * 三维 `/api/` 服务时复用模型资源请求的凭证，并保留调用方显式配置的同名请求头。
 */
export const mergeDataRequestAuthHeaders = (
  url: string,
  configuredHeaders: Record<string, unknown>,
): Record<string, unknown> => {
  const headers = { ...configuredHeaders }
  const embedded = isEmbeddedMode()
  const systemHeaders: Record<string, string> = embedded
    ? getEmbeddedDataRequestHeaders()
    : isConfiguredDim3dApiUrl(url)
      ? getDim3dHeaders()
      : {}

  if (embedded) {
    // 场景可能保留在运营端配置时写入的鉴权头；嵌入场景的身份由宿主决定，
    // 必须先删除所有大小写变体，再写入宿主当前平台的令牌和 ClientId。
    Object.keys(headers).forEach((key) => {
      const normalizedKey = key.toLowerCase()
      if (normalizedKey === 'authorization' || normalizedKey === 'clientid') delete headers[key]
    })
    return { ...headers, ...systemHeaders }
  }

  if (!hasHeader(headers, 'Authorization') && normalizeAccessToken(systemHeaders.Authorization)) {
    headers.Authorization = systemHeaders.Authorization
  }
  if (!hasHeader(headers, 'ClientId') && systemHeaders.ClientId?.trim()) {
    headers.ClientId = systemHeaders.ClientId
  }
  return headers
}

/** 校验嵌入模式必须存在的场景编号。 */
export const getEmbeddedSceneId = (context?: DataRequestRuntimeContext): string | null => {
  if (!isEmbeddedMode()) return null
  const sceneId = String(context?.sceneId ?? '').trim()
  if (!sceneId) throw new Error('嵌入模式缺少当前场景编号，暂不能请求数据接口')
  return sceneId
}
