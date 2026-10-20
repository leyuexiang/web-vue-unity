import type { AuthContext } from './authTypes'

const STORAGE_PREFIX = 'xr-center-tab-auth:'
const MAX_AGE_MS = 60_000
const REFRESH_MAX_AGE_MS = 30 * 60_000
/** 交接信封寿命与消息等待分开；无响应时按内嵌认证的10秒上限结束。 */
const HANDOFF_TIMEOUT_MS = 10_000
const TAB_READY = 'XR_CENTER_TAB_AUTH_READY'
const TAB_AUTH = 'XR_CENTER_TAB_AUTH'
/** 旧版本曾在该地址片段中携带完整鉴权上下文；当前版本仅负责识别并清除，不再解析。 */
const TAB_AUTH_FRAGMENT = 'xrAuth'
const REFRESH_CONTEXT_PREFIX = 'xr-center-refresh-auth:'
const pendingContexts = new Map<string, Readonly<AuthContext>>()
let responderInstalled = false

/**
 * 认证归属使用不会随场景锁轮换的交接编号，旧版本的锁编号只用于兼容读取。
 * 首次进入时尚未生成 clientKey，也能先保存认证；每次刷新不必复制或迁移多份令牌。
 */
function getRefreshKeys(): string[] {
  const params = new URLSearchParams(window.location.search)
  return [...new Set([params.get('authHandoff'), params.get('clientKey')])].filter(
    (key): key is string => Boolean(key && /^[\w.-]+$/.test(key)),
  )
}

/**
 * 会话缓存仅供当前页签刷新使用；本地缓存保留原有30分钟期限作为存储受限时的兜底。
 * 两种存储独立写入，避免 sessionStorage 受限时连可用的 localStorage 也被跳过。
 */
export function persistTabAuthRefreshContext(context: Readonly<AuthContext>): void {
  if (typeof window === 'undefined' || !context.accessToken) return
  const refreshKey = getRefreshKeys()[0]
  if (!refreshKey) return
  const key = `${REFRESH_CONTEXT_PREFIX}${refreshKey}`
  const envelope = JSON.stringify({ createdAt: Date.now(), context })
  try {
    sessionStorage.setItem(key, envelope)
  } catch {
    // 会话存储失败后继续尝试本地存储，不影响当前已完成的认证。
  }
  try {
    localStorage.setItem(key, envelope)
  } catch {
    // 本地存储受限时，当前页签仍可使用独立写入的会话缓存。
  }
}

/**
 * 清除旧地址中可能残留的鉴权片段，但绝不再解析或采用其中的内容。
 *
 * 这样从旧管理页打开的新页签也会尽快移除地址栏中的敏感数据，同时阻断通过 URL 注入鉴权
 * 上下文的入口；若旧片段还包含其他非鉴权参数，则只删除 xrAuth 并保留其余片段参数。
 */
function discardLegacyTabAuthFragment(): void {
  const fragmentParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  if (!fragmentParams.has(TAB_AUTH_FRAGMENT)) return

  fragmentParams.delete(TAB_AUTH_FRAGMENT)
  const remainingFragment = fragmentParams.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}${remainingFragment ? `#${remainingFragment}` : ''}`,
  )
}

/**
 * 将当前页签的内存鉴权快照一次性转交给新开的编辑器/预览页签。
 * 新页签不是 iframe，无法再次从父页面完成 postMessage 握手，因此使用短时、一次性
 * 的同源 localStorage 信封传递；消费后立即删除，避免把令牌长期留在浏览器存储中。
 */
export function createTabAuthHandoff(context: Readonly<AuthContext>): string | null {
  if (typeof window === 'undefined' || !context.accessToken) return null
  const randomId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
  const key = `${STORAGE_PREFIX}${randomId}`
  pendingContexts.set(randomId, context)
  try {
    localStorage.setItem(key, JSON.stringify({ createdAt: Date.now(), context }))
    return key.slice(STORAGE_PREFIX.length)
  } catch {
    return null
  }
}

/** 在已创建的空白页签跳转前写入短时鉴权信封，兼容浏览器切断跨域 opener 的情况。 */
export function createTabAuthWindowName(context: Readonly<AuthContext>): string {
  return JSON.stringify({ type: TAB_AUTH, createdAt: Date.now(), context })
}

/**
 * 清理当前页签的鉴权交接缓存。
 *
 * 预览页只允许在首次进入时消费交接上下文；关闭页签或浏览器前必须移除未消费的
 * localStorage 信封、刷新快照和 window.name，防止下次复用上一次访问权限。只按当前地址
 * 中的随机编号删除，不影响其他页签正在使用的鉴权上下文。
 */
export function clearTabAuthHandoffCache(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const handoffId = params.get('authHandoff')
  try {
    if (handoffId && /^[\w.-]+$/.test(handoffId)) {
      localStorage.removeItem(`${STORAGE_PREFIX}${handoffId}`)
      pendingContexts.delete(handoffId)
    }
  } catch {
    // 交接存储受限不妨碍继续清理会话缓存。
  }
  // 同时清理稳定编号和旧版本的锁编号缓存；其中一种存储失败不能阻断另一种。
  for (const refreshKey of getRefreshKeys()) {
    const key = `${REFRESH_CONTEXT_PREFIX}${refreshKey}`
    try {
      sessionStorage.removeItem(key)
    } catch {
      // 存储受限时继续清理本地副本。
    }
    try {
      localStorage.removeItem(key)
    } catch {
      // 不阻塞关闭；页面内存与窗口名称仍会清理。
    }
  }
  window.name = ''
}

/** 管理页响应跨域编辑器页签的鉴权请求；仅保留短时内存快照。 */
export function installTabAuthResponder(): void {
  if (responderInstalled || typeof window === 'undefined') return
  responderInstalled = true
  window.addEventListener('message', (event) => {
    if (event.data?.type !== TAB_READY || typeof event.data?.handoffId !== 'string') return
    if (!getConfiguredParentOrigins().includes(event.origin)) return
    const context = pendingContexts.get(event.data.handoffId)
    if (!event.source || typeof (event.source as Window).postMessage !== 'function') return
    pendingContexts.delete(event.data.handoffId)
    try {
      // 已消费或不存在的编号明确返回空响应，让旧编辑页立即结束等待，不能复用旧授权。
      ;(event.source as Window).postMessage(
        { type: TAB_AUTH, handoffId: event.data.handoffId, context: context ?? null },
        event.origin,
      )
    } catch {
      // 编辑页关闭或跨来源导航后可能无法接收，不向控制台输出凭据。
    }
  })
}

/** 读取宿主来源白名单，供跨域页签握手使用；localhost 与局域网 IP 必须同时列入。 */
function getConfiguredParentOrigins(): string[] {
  const values = [
    // 管理页通常与编辑页同源，但外层宿主白名单不包含三维应用自身的端口。
    window.location.origin,
    String(import.meta.env.VITE_OPERATION_ORIGINS || ''),
    String(import.meta.env.VITE_OPERATION_ORIGIN || ''),
  ]
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
  const origins = new Set<string>()
  for (const value of values) {
    try {
      const url = new URL(value)
      if (/^https?:$/.test(url.protocol)) origins.add(url.origin)
    } catch {
      // 忽略错误配置；不使用通配来源，也不因一个配置项阻断整个等待流程。
    }
  }
  return [...origins]
}

/** 跨域新页签向 opener 请求一次性鉴权快照。 */
export function requestTabAuthHandoff(handoffId: string): Promise<AuthContext | null> {
  if (
    typeof window === 'undefined' ||
    !window.opener ||
    window.opener === window ||
    window.opener.closed
  ) {
    return Promise.resolve(null)
  }
  const parentOrigins = getConfiguredParentOrigins()
  const opener = window.opener
  if (parentOrigins.length === 0) return Promise.resolve(null)
  return new Promise((resolve) => {
    let settled = false
    const finish = (context: AuthContext | null) => {
      if (settled) return
      settled = true
      window.removeEventListener('message', handleMessage)
      clearTimeout(timer)
      resolve(context)
    }
    const handleMessage = (event: MessageEvent) => {
      if (!parentOrigins.includes(event.origin) || event.source !== opener) return
      if (event.data?.type !== TAB_AUTH || event.data?.handoffId !== handoffId) return
      finish(event.data.context ?? null)
    }
    const timer = setTimeout(() => finish(null), HANDOFF_TIMEOUT_MS)
    window.addEventListener('message', handleMessage)
    // 实际 opener 可能是 localhost 或局域网 IP，向每个受信来源各发一次，避免只命中旧单来源变量。
    try {
      for (const parentOrigin of parentOrigins) {
        opener.postMessage({ type: TAB_READY, handoffId }, parentOrigin)
      }
    } catch {
      // 发送异常也必须走统一收口，不能留下悬空监听器或让启动页面一直显示加载。
      finish(null)
    }
  })
}

/**
 * 统一校验存储信封；缓存期限与凭据期限分开，恢复缓存不能延长凭据的真实有效期。
 * 同页签会话副本随页签结束而消失，因此只按 expiresAt 判断；跨页签副本仍限制保留时间。
 */
function readAuthEnvelope(raw: string | null, maxAgeMs: number): AuthContext | null {
  if (!raw) return null
  try {
    const envelope = JSON.parse(raw) as { createdAt?: number; context?: AuthContext }
    const now = Date.now()
    if (typeof envelope.createdAt !== 'number' || !Number.isFinite(envelope.createdAt)) return null
    const age = now - envelope.createdAt
    if (age < 0 || age > maxAgeMs) return null
    const context = envelope.context
    if (
      !context ||
      typeof context.accessToken !== 'string' ||
      !context.accessToken.trim() ||
      typeof context.clientId !== 'string' ||
      !context.clientId.trim() ||
      !Array.isArray(context.permissions) ||
      !Array.isArray(context.roles) ||
      context.permissions.some((permission) => typeof permission !== 'string') ||
      context.roles.some((role) => typeof role !== 'string') ||
      (context.platformType !== 'operation' && context.platformType !== 'tenant')
    )
      return null
    if (
      context.expiresAt !== undefined &&
      (!Number.isFinite(context.expiresAt) || (context.expiresAt !== 0 && context.expiresAt <= now))
    )
      return null
    return context
  } catch {
    // 损坏的 JSON 或缺失字段只能使本通道失效，不能阻断其他安全通道。
    return null
  }
}

/** 读取指定存储的一份缓存，删除失效副本；访问异常时允许调用方继续尝试另一种存储。 */
function readRefreshContext(storage: Storage, key: string, maxAgeMs: number): AuthContext | null {
  const raw = storage.getItem(key)
  const context = readAuthEnvelope(raw, maxAgeMs)
  if (raw && !context) storage.removeItem(key)
  return context
}

/**
 * 优先恢复当前页签会话，再消费短时窗口信封和跨页签缓存。
 * 最多读取稳定编号与旧锁编号两份副本；失效交接不能遮挡有效会话，不轮询、不发接口请求。
 */
export function consumeTabAuthHandoff(): AuthContext | null {
  if (typeof window === 'undefined') return null
  discardLegacyTabAuthFragment()
  const refreshKeys = getRefreshKeys()
  for (const refreshKey of refreshKeys) {
    try {
      const context = readRefreshContext(
        sessionStorage,
        `${REFRESH_CONTEXT_PREFIX}${refreshKey}`,
        Infinity,
      )
      if (context) return context
    } catch {
      // 会话存储不可读时继续尝试窗口信封和本地存储。
    }
  }

  try {
    const envelope = JSON.parse(window.name || '') as { type?: string }
    if (envelope.type === TAB_AUTH) {
      const context = readAuthEnvelope(window.name, MAX_AGE_MS)
      if (context) return context
    }
  } catch {
    // 非鉴权窗口名称不参与认证。
  }

  const id = new URLSearchParams(window.location.search).get('authHandoff')
  if (id && /^[\w.-]+$/.test(id)) {
    try {
      const key = `${STORAGE_PREFIX}${id}`
      const raw = localStorage.getItem(key)
      localStorage.removeItem(key)
      const context = readAuthEnvelope(raw, MAX_AGE_MS)
      if (context) return context
    } catch {
      // 一次性交接缺失、损坏或存储受限时，仍允许恢复已有刷新缓存。
    }
  }

  for (const refreshKey of refreshKeys) {
    try {
      const context = readRefreshContext(
        localStorage,
        `${REFRESH_CONTEXT_PREFIX}${refreshKey}`,
        REFRESH_MAX_AGE_MS,
      )
      if (context) return context
    } catch {
      // 本通道失败不抛出，运行时会决定是否需要有上限的窗口握手。
    }
  }
  return null
}
