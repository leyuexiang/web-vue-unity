import { appLogger } from '@/utils/logger'

interface StorageItem<T> {
  value: T
  expires?: number // 过期时间戳
}

class WebStorage {
  constructor(private storage: Storage) {}

  set<T>(key: string, value: T, ttl?: number): void {
    try {
      const item: StorageItem<T> = {
        value,
        expires: ttl ? Date.now() + ttl : undefined,
      }
      this.storage.setItem(key, JSON.stringify(item))
    } catch (error) {
      // 存储失败通常由容量或序列化异常导致，保留错误日志便于定位浏览器存储限制问题。
      appLogger.error('WebStorage', '设置值失败', key, error)
    }
  }

  get<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const itemStr = this.storage.getItem(key)

      if (!itemStr) return defaultValue

      const item = JSON.parse(itemStr) as StorageItem<T>

      // 检查是否过期
      if (item.expires && Date.now() > item.expires) {
        this.remove(key)
        return defaultValue
      }

      return item.value
    } catch (error) {
      appLogger.error('WebStorage', '获取值失败', key, error)
      return defaultValue
    }
  }

  remove(key: string): void {
    this.storage.removeItem(key)
  }

  clear(): void {
    Object.keys(this.storage).forEach((key) => this.storage.removeItem(key))
  }
}

/**
 * 在浏览器外壳缺少原生存储时提供空实现。
 * 编辑器鉴权模块会被服务端渲染、单元测试或构建分析阶段加载；此时不能因为直接访问
 * 未定义的 `localStorage/sessionStorage` 阻断整个模块图。浏览器运行时仍优先使用原生存储。
 */
const createFallbackStorage = (): Storage => {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  }
}

const resolveStorage = (storageName: 'localStorage' | 'sessionStorage') => {
  try {
    return typeof window !== 'undefined' ? window[storageName] : createFallbackStorage()
  } catch {
    return createFallbackStorage()
  }
}

export const localStore = new WebStorage(resolveStorage('localStorage'))
export const sessionStore = new WebStorage(resolveStorage('sessionStorage'))
