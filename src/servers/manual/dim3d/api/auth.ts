import { getAccessToken } from '@/utils/auth'
import { normalizeAccessToken } from '@/auth/accessToken'

/**
 * 阶段三令牌在浏览器应用程序本地存储中的键名。
 * 用户可在开发者工具的“应用程序 > 本地存储”中直接维护此键，页面不会再显示配置按钮或弹窗。
 */
export const DIM3D_TEMP_TOKEN_STORAGE_KEY = 'jtyf.dim3d.temp-token'
/** 阶段三客户端编号在浏览器应用程序本地存储中的键名，需与令牌键成对配置。 */
export const DIM3D_CLIENT_ID_STORAGE_KEY = 'jtyf.dim3d.client-id'

/**
 * 安全读取浏览器存储值。
 * 隐私模式或浏览器策略可能禁止访问存储；此时返回空值，避免鉴权读取异常阻断页面渲染。
 */
const readStorageValue = (storage: Storage | undefined, key: string) => {
  try {
    return storage?.getItem(key)?.trim() || ''
  } catch {
    return ''
  }
}

/**
 * 安全获取浏览器存储对象。
 * 部分隐私策略会在读取 `window.localStorage` 属性时直接抛错，因此属性读取也必须处于保护范围内。
 */
const getBrowserStorage = (storageName: 'localStorage' | 'sessionStorage') => {
  try {
    return window[storageName]
  } catch {
    return undefined
  }
}

/**
 * 将旧版本会话存储中的配置迁移到应用程序本地存储。
 * 迁移只在本地存储没有值时执行，成功后删除旧键，避免同一配置在两个位置产生优先级歧义。
 */
const readDim3dStorageValue = (key: string) => {
  if (typeof window === 'undefined') return ''

  const localStorage = getBrowserStorage('localStorage')
  const sessionStorage = getBrowserStorage('sessionStorage')
  const localValue = readStorageValue(localStorage, key)
  if (localValue) return localValue

  const legacySessionValue = readStorageValue(sessionStorage, key)
  if (!legacySessionValue) return ''

  try {
    localStorage?.setItem(key, legacySessionValue)
    sessionStorage?.removeItem(key)
  } catch {
    // 本地存储不可写时继续使用旧值，保证升级过程中已有页面请求仍可完成。
  }
  return legacySessionValue
}

/** 保存或清除浏览器应用程序本地存储中的阶段三令牌。 */
export function getDim3dTemporaryToken() {
  return readDim3dStorageValue(DIM3D_TEMP_TOKEN_STORAGE_KEY)
}

/**
 * 写入或清除浏览器应用程序本地存储中的阶段三令牌。
 * 该函数保留给自动化脚本和受信任的宿主调用，不依赖页面组件，因此配置不会触发页面重渲染。
 */
export function setDim3dTemporaryToken(token: string) {
  if (typeof window === 'undefined') return
  const normalizedToken = token.trim()
  try {
    if (normalizedToken) {
      getBrowserStorage('localStorage')?.setItem(DIM3D_TEMP_TOKEN_STORAGE_KEY, normalizedToken)
    } else {
      getBrowserStorage('localStorage')?.removeItem(DIM3D_TEMP_TOKEN_STORAGE_KEY)
    }
  } catch {
    // 存储不可用时忽略写入失败；请求头生成仍会回退当前登录令牌。
  }
}

/** 从浏览器应用程序本地存储读取阶段三客户端编号。 */
export function getDim3dClientId() {
  return readDim3dStorageValue(DIM3D_CLIENT_ID_STORAGE_KEY)
}

/** 写入或清除浏览器应用程序本地存储中的阶段三客户端编号。 */
export function setDim3dClientId(clientId: string) {
  if (typeof window === 'undefined') return
  const normalizedClientId = clientId.trim()
  try {
    if (normalizedClientId) {
      getBrowserStorage('localStorage')?.setItem(DIM3D_CLIENT_ID_STORAGE_KEY, normalizedClientId)
    } else {
      getBrowserStorage('localStorage')?.removeItem(DIM3D_CLIENT_ID_STORAGE_KEY)
    }
  } catch {
    // 存储不可用时忽略写入失败；客户端编号将按当前存储状态参与请求头生成。
  }
}

/**
 * 三维服务临时令牌入口。
 *
 * 阶段三令牌优先读取浏览器应用程序本地存储；未配置时回退当前登录令牌，保持旧页面的基本兼容性。
 * 本地存储中的值支持纯令牌或完整“Bearer xxx”格式，后续统一去掉重复前缀。
 */
export function getDim3dToken() {
  const temporaryToken = getDim3dTemporaryToken()
  const sessionToken = String(getAccessToken() || '').trim()
  const token = temporaryToken || sessionToken
  // 兼容本地配置中填写完整授权头或纯令牌两种格式，并复用系统统一的前缀清理规则。
  return normalizeAccessToken(token)
}

/**
 * 统一生成三维接口请求头。
 *
 * 阶段三网关要求每一个请求同时携带 Authorization 和 ClientId。即使某个值尚未配置，
 * 也保留对应的请求头键，便于在浏览器网络面板中确认请求契约。所有阶段三适配器和
 * 场景编辑器接口都只能通过这个函数取头，避免漏加或使用旧登录令牌。
 */
export function getDim3dHeaders(): Record<string, string> {
  const token = getDim3dToken()
  const clientId = getDim3dClientId()
  return {
    Authorization: `Bearer ${token}`,
    ClientId: clientId,
  }
}

/**
 * 为阶段三和场景编辑器接口创建请求选项。
 * 每次调用都重新读取本地存储，开发者工具修改配置后无需刷新页面；`passAuth` 阻止全局拦截器
 * 用管理端登录令牌覆盖这里的 Authorization，同时让接口自身保留原始 401/403 结果。
 * 只有明确传入请求类型时才添加 `Content-Type`，避免文件上传被错误固定为 JSON。
 */
export function getDim3dRequestOptions(contentType?: string) {
  return {
    headers: {
      ...(contentType ? { 'Content-Type': contentType } : {}),
      ...getDim3dHeaders(),
    },
    passAuth: true,
  }
}
