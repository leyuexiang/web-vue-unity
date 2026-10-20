import {
  getDim3dScenePreviewBasic,
  getDim3dScenePreviewDependencies,
  getDim3dScenePreviewThreeD,
  getDim3dScenePreviewTwoD,
  getDim3dScenePreviewVegetationResources,
  resolveDim3dScenePreview,
  type Dim3dPreviewAccessMode,
  type Dim3dPreviewResolveResultCode,
} from '@/servers/manual/dim3d/api/sceneRuntime'
import type { SceneRuntimeFragmentLoaderApi } from './sceneRuntimeFragmentLoader'

/** 允许匿名建立预览会话的两种公开访问模式。 */
const PUBLIC_PREVIEW_ACCESS_MODES = new Set<Dim3dPreviewAccessMode>([
  'PUBLIC_SHARE',
  'PUBLIC_ENCRYPT',
])

/**
 * resolve 返回 ticket 后，后端还需要一个极短的异步窗口将票据写入缓存；
 * 首屏查询过早会导致 sceneBasic、threeD、twoD 因缓存未命中而失败。
 */
const PREVIEW_TICKET_CACHE_PROPAGATION_DELAY_MS = 500

/**
 * 票据刚写入 Redis 时，分片接口可能短暂返回凭证失效；首次请求失败后最多再尝试三次。
 * 这里的“重试三次”指额外重试次数，连同首次请求最多执行四次，最终仍失败才交给上层处理。
 */
const PREVIEW_CREDENTIAL_RETRY_COUNT = 3

/**
 * 预览票据有效期约为 30 分钟，提前 10 分钟重新解析会话，避免长时间停留时票据自然过期。
 * 续期沿用 resolve 契约，不新增或伪造后端刷新接口。
 */
export const PREVIEW_TICKET_REFRESH_INTERVAL_MS = 20 * 60 * 1000

/** 只对明确属于票据/凭证失效的 403 重试，避免把真实的权限拒绝延迟成多次无效请求。 */
const PREVIEW_CREDENTIAL_ERROR_MESSAGE_PATTERN =
  /访问凭证|访问令牌|凭证|令牌|ticket|token|过期|无效|expired|invalid/i

/**
 * 创建一次共享等待任务，确保三项首屏数据请求合计只等待 500 毫秒，而不是每项各自等待。
 * 该等待仅存在于当前预览数据源内存中，不会持久化 ticket，也不会改变后续依赖请求协议。
 */
const waitForPreviewTicketCache = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, PREVIEW_TICKET_CACHE_PROPAGATION_DELAY_MS)
  })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

/**
 * 判断响应或异常是否属于“预览票据尚未可见/已失效”。
 * 请求层对业务 403 可能直接返回响应，也可能以对象异常 reject，因此两种形态都要兼容。
 */
const isPreviewCredentialExpired = (value: unknown): boolean => {
  if (!isRecord(value) || value.code !== 403) return false
  const message = [value.msg, value.message]
    .filter((item): item is string => typeof item === 'string')
    .join(' ')
  return PREVIEW_CREDENTIAL_ERROR_MESSAGE_PATTERN.test(message)
}

/**
 * 仅把“重试中的静默标记”传给本次请求；最终一次请求删除该标记，确保最终失败可以弹出异常通知。
 * 同时保留调用方已有的请求参数，避免重试逻辑改变接口本身的业务入参。
 */
const createPreviewRequestOptions = (
  options: Record<string, unknown> | undefined,
  suppressCredentialNotification: boolean,
  anonymousPublicPreview = false,
): Record<string, unknown> | undefined => {
  const requestOptions = isRecord(options) ? { ...options } : {}
  if (suppressCredentialNotification) {
    requestOptions.suppressPreviewCredentialNotification = true
  } else {
    delete requestOptions.suppressPreviewCredentialNotification
  }
  /**
   * 公开分享和公开加密的四包接口只依赖 ticket，不得复用游客登录产生的租户鉴权头。
   * 个人、企业内部预览必须显式删除该标记，继续由统一请求层注入租户鉴权上下文。
   */
  if (anonymousPublicPreview) {
    requestOptions.anonymousPublicPreview = true
  } else {
    delete requestOptions.anonymousPublicPreview
  }
  return Object.keys(requestOptions).length ? requestOptions : undefined
}

/**
 * 仅在预览票据失效时重试。
 * 网络异常、参数错误、业务权限拒绝等其他失败保持原有失败语义，不被无意义地重复请求。
 */
const requestWithPreviewCredentialRetry = async <T>(
  request: (suppressCredentialNotification: boolean) => Promise<T>,
): Promise<T> => {
  for (let attempt = 0; attempt <= PREVIEW_CREDENTIAL_RETRY_COUNT; attempt += 1) {
    const isRetryingCredential = attempt < PREVIEW_CREDENTIAL_RETRY_COUNT
    try {
      const response = await request(isRetryingCredential)
      if (!isPreviewCredentialExpired(response) || attempt === PREVIEW_CREDENTIAL_RETRY_COUNT) {
        return response
      }
    } catch (error) {
      if (!isPreviewCredentialExpired(error) || attempt === PREVIEW_CREDENTIAL_RETRY_COUNT) {
        throw error
      }
    }

    /** 每次重试前留出新的 Redis 可见窗口，避免连续查询命中同一台尚未同步的节点。 */
    await waitForPreviewTicketCache()
  }

  // 循环必定在成功返回或抛出异常时结束，此分支仅用于满足类型系统的完整返回约束。
  throw new Error('预览凭证重试流程异常。')
}

export interface ScenePreviewSession {
  /** 由 resolve 响应解析出的发布快照编号，供后续四个发布预览数据接口使用。 */
  publishedPublicationId: string
  /** 后端发布预览路径使用 publicationId；在预览会话中必须与 publishedPublicationId 保持同值。 */
  publicationId: string
  /** 仅用于记录 resolve 请求使用的场景编号，不会作为发布预览接口路径参数。 */
  sceneId: string
  accessMode: Dim3dPreviewAccessMode
  /** 短期票据仅供当前内存会话使用，调用方不得写入路由、存储或发布包。 */
  ticket: string
}

export interface ScenePreviewResolveResult {
  resultCode: Dim3dPreviewResolveResultCode
  message: string
  /** 非 OK 分支也保留访问类型，供公开访问与个人/企业登录流程安全分流。 */
  accessMode?: Dim3dPreviewAccessMode
  session?: ScenePreviewSession
}

/** 预览票据续期器；停止后不会再发起 resolve 请求。 */
export interface ScenePreviewTicketRefresher {
  refresh: () => Promise<void>
  stop: () => void
}

/**
 * 将预览访问机器码转换成密码面板可直接展示的提示。
 *
 * `resolve` 接口当前在密码错误时仍会返回顶层“操作成功”，真正的失败状态只体现在
 * `resultCode=NEED_PASSWORD`。因此密码分支不能展示顶层 `msg`：首次未携带密码时保持
 * 引导文案，提交过非空密码后仍收到 NEED_PASSWORD 时则给出确定的本地错误提示。
 */
export const resolveScenePreviewAccessMessage = (
  result: Pick<ScenePreviewResolveResult, 'resultCode' | 'message'>,
  hasSubmittedPassword: boolean,
): string => {
  if (result.resultCode === 'NEED_PASSWORD') {
    return hasSubmittedPassword ? '访问密码错误，请重新输入。' : ''
  }
  return result.message.trim() || '当前场景暂时无法访问。'
}

/**
 * 解析预览地址并建立发布预览会话。
 *
 * 本模块只负责访问分流和发布预览请求适配，不组装场景或创建运行时，确保访问方式与
 * 场景类型保持正交。入口参数沿用后端查询参数 sceneId，必须传编辑场景编号；后续四个数据接口
 * 统一使用 resolve 成功响应中的 publicationId（前端会将其保存为 publishedPublicationId）。
 * PERSONAL、ENTERPRISE 必须先恢复租户鉴权上下文；匿名访问即使后端返回 OK，也会在前端
 * 收敛为 NEED_LOGIN，避免受限场景因网关配置偏差被匿名打开。
 */
export const resolveScenePreviewSession = async (
  sceneId: string,
  password?: string,
  authenticated = false,
  anonymousPublicPreview = false,
): Promise<ScenePreviewResolveResult> => {
  const normalizedSceneId = sceneId.trim()
  if (!normalizedSceneId) {
    throw new Error('预览 sceneId 必须是非空字符串。')
  }
  const response = anonymousPublicPreview
    ? await resolveDim3dScenePreview(normalizedSceneId, password, {
        anonymousPublicPreview: true,
      })
    : await resolveDim3dScenePreview(normalizedSceneId, password)
  if (response.code !== undefined && response.code !== 200) {
    throw new Error(response.msg?.trim() || `预览会话解析失败，业务码：${String(response.code)}`)
  }

  const data = response.data
  const resultCode = data?.resultCode
  if (!resultCode) throw new Error('预览会话解析缺少 resultCode。')
  if (resultCode !== 'OK') {
    return {
      resultCode,
      message: response.msg?.trim() || '',
      ...(data?.accessMode ? { accessMode: data.accessMode } : {}),
    }
  }

  const accessMode = data?.accessMode
  if (!accessMode) {
    throw new Error('预览会话解析缺少 accessMode。')
  }
  if (!PUBLIC_PREVIEW_ACCESS_MODES.has(accessMode) && !authenticated) {
    return { resultCode: 'NEED_LOGIN', message: response.msg?.trim() || '', accessMode }
  }

  /**
   * 正常情况下接口适配层已把 publicationId 归一化为字符串；这里保留一次防御性兜底，
   * 防御网关直接返回超出 JavaScript 安全整数范围的数字。该数字已无法恢复
   * 原始低位，因此不能把 number 转成一个可能错误的发布编号；接口适配层会直接拒绝这种违约响应。
   */
  const publicationId =
    typeof data.publicationId === 'string'
      ? data.publicationId.trim()
      : typeof data.publicationId === 'number' && Number.isSafeInteger(data.publicationId)
        ? String(data.publicationId)
        : ''
  const ticket = data.ticket?.trim() || ''
  if (!publicationId || !ticket) {
    throw new Error('预览会话缺少 publicationId 或 ticket。')
  }
  return {
    resultCode: 'OK',
    message: response.msg?.trim() || '',
    session: {
      sceneId: normalizedSceneId,
      publishedPublicationId: publicationId,
      accessMode,
      publicationId,
      ticket,
    },
  }
}

/**
 * 为当前预览会话创建票据续期器。
 *
 * 续期只更新同一发布快照的内存 ticket，不重建 Runtime、不重新加载三维或二维数据；
 * 分片加载器通过闭包读取 session.ticket，因此下一次请求会自动使用新票据。公开加密模式
 * 的密码由调用方通过回调提供，密码只存在当前页面内存，绝不写入 URL、存储或日志。
 */
export const createScenePreviewTicketRefresher = (
  session: ScenePreviewSession,
  options: {
    getPassword?: () => string | undefined
    isAuthenticated?: () => boolean
    onError?: (error: unknown) => void
    intervalMs?: number
  } = {},
): ScenePreviewTicketRefresher => {
  let stopped = false
  let refreshPromise: Promise<void> | null = null
  const intervalMs =
    Number.isFinite(options.intervalMs) && (options.intervalMs ?? 0) > 0
      ? Number(options.intervalMs)
      : PREVIEW_TICKET_REFRESH_INTERVAL_MS

  const refresh = async (): Promise<void> => {
    if (stopped) return
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      const result = await resolveScenePreviewSession(
        session.sceneId,
        options.getPassword?.(),
        options.isAuthenticated?.() ?? false,
      )
      if (result.resultCode !== 'OK' || !result.session) {
        throw new Error(result.message || `预览票据续期失败：${result.resultCode}`)
      }
      if (
        result.session.publicationId !== session.publicationId ||
        result.session.accessMode !== session.accessMode
      ) {
        throw new Error('预览票据续期返回的发布快照或访问模式发生变化。')
      }

      // 页签关闭期间请求可能晚到；已停止的续期器不得再把新票据写回已卸载页面。
      if (stopped) return
      /** 只替换票据，保持当前运行时绑定的发布快照和访问模式不变。 */
      session.ticket = result.session.ticket
    })()

    try {
      await refreshPromise
    } catch (error) {
      options.onError?.(error)
      throw error
    } finally {
      refreshPromise = null
    }
  }

  const timer = setInterval(() => {
    void refresh().catch(() => {
      // 错误已通过 onError 通知页面；保留定时器，下一周期继续尝试续期。
    })
  }, intervalMs)

  return {
    refresh,
    stop: () => {
      if (stopped) return
      stopped = true
      clearInterval(timer)
    },
  }
}

/**
 * 为一个已解析的发布预览会话创建统一运行态加载器数据源。
 *
 * 票据通过闭包限制在本次会话，所有预览数据请求固定走 scenePreview/published 路径；任一失败不会回退到
 * 受限发布接口，避免以错误的数据源绕过访问控制。
 */
export const createScenePreviewFragmentLoaderApi = (
  session: Pick<ScenePreviewSession, 'ticket' | 'publishedPublicationId' | 'accessMode'>,
): Partial<SceneRuntimeFragmentLoaderApi> => {
  /**
   * 只有公开分享、公开加密的四包接口走匿名运营端链路；个人和企业内部
   * 预览继续携带租户鉴权，避免公开访问规则扩散到受限预览。
   */
  const anonymousPublicPreview = PUBLIC_PREVIEW_ACCESS_MODES.has(session.accessMode)
  /**
   * 加载器会并发调用三个首屏接口，因此必须共享同一个等待任务；把等待写在各函数内部会让总耗时
   * 取决于最慢接口并重复创建定时器，也无法明确保证它们都在票据缓存稳定后发出。
   */
  const previewTicketCacheReady = waitForPreviewTicketCache()

  return {
    getSceneBasic: async (publicationId, options) => {
      assertPreviewPublicationId(publicationId, session.publishedPublicationId)
      await previewTicketCacheReady
      return requestWithPreviewCredentialRetry((suppressCredentialNotification) =>
        getDim3dScenePreviewBasic(
          session.publishedPublicationId,
          session.ticket,
          createPreviewRequestOptions(
            options,
            suppressCredentialNotification,
            anonymousPublicPreview,
          ),
        ),
      )
    },
    getThreeD: async (publicationId, options) => {
      assertPreviewPublicationId(publicationId, session.publishedPublicationId)
      await previewTicketCacheReady
      return requestWithPreviewCredentialRetry((suppressCredentialNotification) =>
        getDim3dScenePreviewThreeD(
          session.publishedPublicationId,
          session.ticket,
          createPreviewRequestOptions(
            options,
            suppressCredentialNotification,
            anonymousPublicPreview,
          ),
        ),
      )
    },
    getTwoD: async (publicationId, options) => {
      assertPreviewPublicationId(publicationId, session.publishedPublicationId)
      await previewTicketCacheReady
      return requestWithPreviewCredentialRetry((suppressCredentialNotification) =>
        getDim3dScenePreviewTwoD(
          session.publishedPublicationId,
          session.ticket,
          createPreviewRequestOptions(
            options,
            suppressCredentialNotification,
            anonymousPublicPreview,
          ),
        ),
      )
    },
    getDependencies: async (publicationId, instanceIds, options) => {
      assertPreviewPublicationId(publicationId, session.publishedPublicationId)
      await previewTicketCacheReady
      return requestWithPreviewCredentialRetry((suppressCredentialNotification) =>
        getDim3dScenePreviewDependencies(
          session.publishedPublicationId,
          session.ticket,
          instanceIds,
          createPreviewRequestOptions(
            options,
            suppressCredentialNotification,
            anonymousPublicPreview,
          ),
        ),
      )
    },
    getVegetationResources: async (publicationId, resourceKeys, options) => {
      assertPreviewPublicationId(publicationId, session.publishedPublicationId)
      /** 植被资源接口和三个首屏包共用票据缓存等待窗口，避免票据刚签发时立即被网关拒绝。 */
      await previewTicketCacheReady
      return requestWithPreviewCredentialRetry((suppressCredentialNotification) =>
        getDim3dScenePreviewVegetationResources(
          session.publishedPublicationId,
          session.ticket,
          resourceKeys,
          createPreviewRequestOptions(options, suppressCredentialNotification),
        ),
      )
    },
  }
}

/** 公开预览所有数据请求都必须绑定同一个发布快照编号，防止调用方误传编辑场景编号。 */
const assertPreviewPublicationId = (publicationId: string, expectedPublicationId: string) => {
  if (publicationId !== expectedPublicationId) {
    throw new Error('发布预览请求编号与 publishedPublicationId 不一致。')
  }
}
