import { readonly, ref, type DeepReadonly, type Ref } from 'vue'

export const MANAGE_THEME_STORAGE_KEY = 'jtyf.manage.theme'

export type ManageTheme = 'light' | 'dark'

export interface ManageThemeStorage {
  getItem(key: string): string | null
  removeItem(key: string): void
  setItem(key: string, value: string): void
}

export interface ManageThemeController {
  theme: DeepReadonly<Ref<ManageTheme>>
  initialize(): ManageTheme
  setTheme(theme: ManageTheme): ManageTheme
  toggleTheme(): ManageTheme
}

type StorageResolver = () => ManageThemeStorage | null

/**
 * 缓存只接受两个稳定主题值。旧版本、手工篡改或异常值统一回退亮色，
 * 避免把任意字符串写进主题根属性后形成不可预测的第三种视觉状态。
 */
export const normalizeManageTheme = (value: unknown): ManageTheme =>
  value === 'dark' ? 'dark' : 'light'

/**
 * 惰性获取 localStorage，兼容服务端渲染、隐私模式和禁用存储的 WebView。
 * 读取失败只影响记忆能力，不阻断管理页面首次渲染。
 */
const resolveBrowserStorage: StorageResolver = () => {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const createManageThemeController = (
  resolveStorage: StorageResolver = resolveBrowserStorage,
): ManageThemeController => {
  const theme = ref<ManageTheme>('light')
  let initialized = false

  const getStorage = () => {
    try {
      return resolveStorage()
    } catch {
      return null
    }
  }

  const persistTheme = (nextTheme: ManageTheme) => {
    try {
      getStorage()?.setItem(MANAGE_THEME_STORAGE_KEY, nextTheme)
    } catch {
      // 存储配额、安全策略或嵌入环境拒绝写入时，保留当前会话中的响应式主题。
    }
  }

  const initialize = (): ManageTheme => {
    if (initialized) return theme.value

    const storage = getStorage()
    let cachedTheme: string | null = null

    try {
      cachedTheme = storage?.getItem(MANAGE_THEME_STORAGE_KEY) ?? null
    } catch {
      cachedTheme = null
    }

    theme.value = normalizeManageTheme(cachedTheme)
    initialized = true

    if (cachedTheme !== null && cachedTheme !== 'light' && cachedTheme !== 'dark') {
      try {
        storage?.removeItem(MANAGE_THEME_STORAGE_KEY)
      } catch {
        // 清理非法缓存失败不影响已回退的亮色主题。
      }
    }

    return theme.value
  }

  const setTheme = (nextTheme: ManageTheme): ManageTheme => {
    initialized = true
    theme.value = nextTheme
    persistTheme(nextTheme)
    return theme.value
  }

  const toggleTheme = (): ManageTheme => setTheme(theme.value === 'light' ? 'dark' : 'light')

  return {
    theme: readonly(theme),
    initialize,
    setTheme,
    toggleTheme,
  }
}

const manageThemeController = createManageThemeController()

/**
 * 管理端共用单例控制器，确保布局、侧栏和传送浮层读取同一份主题状态，
 * 避免组件各自创建 ref 导致重复存储读取和切换不同步。
 */
export const useManageTheme = (): ManageThemeController => manageThemeController
