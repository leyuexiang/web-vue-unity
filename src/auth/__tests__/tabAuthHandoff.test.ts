import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContext } from '../authTypes'

const CACHE_KEY = 'xr-center-editor-auth:v1'
const SESSION_KEY = 'xr-center-editor-auth-session:v1'
const context: AuthContext = {
  accessToken: '假令牌甲', clientId: '假应用', permissions: ['scene:read'], roles: [], platformType: 'operation',
}

/** 每份实例代表一台浏览器或一个页签；测试只使用内存和假凭据。 */
function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)) },
    removeItem: key => { values.delete(key) },
    clear: () => values.clear(),
  }
}

let local: Storage
let session: Storage
let page: { location: { search: string; origin: string; hash: string }; name: string }

/** 只切换交接编号，模拟原有管理页连续打开编辑器，不改动业务场景或接口。 */
function visit(id: string) { page.location.search = `?authHandoff=${id}` }

beforeEach(() => {
  vi.resetModules()
  local = createStorage()
  session = createStorage()
  page = { location: { search: '', origin: 'http://editor.invalid', hash: '' }, name: '' }
  vi.stubGlobal('window', page)
  vi.stubGlobal('localStorage', local)
  vi.stubGlobal('sessionStorage', session)
})

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('编辑器固定鉴权缓存', () => {
  it('连续访问和页签刷新复用同一个本地存储项及同一个会话存储项', async () => {
    const auth = await import('../tabAuthHandoff')
    for (let i = 0; i < 5; i++) {
      const id = auth.createTabAuthHandoff(context)!
      visit(id)
      expect(auth.consumeTabAuthHandoff()).toEqual(context)
      auth.persistTabAuthRefreshContext(context)
    }
    expect(local.length).toBe(1)
    expect(local.key(0)).toBe(CACHE_KEY)
    expect(session.length).toBe(1)
    expect(session.key(0)).toBe(SESSION_KEY)
    expect(auth.consumeTabAuthHandoff()).toEqual(context)
  })

  it('同一浏览器重载后设备标识不变，另一份设备存储产生不同标识', async () => {
    let auth = await import('../tabAuthHandoff')
    auth.createTabAuthHandoff(context)
    const firstDevice = JSON.parse(local.getItem(CACHE_KEY)!).deviceId
    expect(typeof firstDevice).toBe('string')
    expect(firstDevice).not.toBe('')
    vi.resetModules()
    auth = await import('../tabAuthHandoff')
    auth.createTabAuthHandoff(context)
    expect(JSON.parse(local.getItem(CACHE_KEY)!).deviceId).toBe(firstDevice)
    vi.stubGlobal('localStorage', createStorage())
    auth.createTabAuthHandoff(context)
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).deviceId).not.toBe(firstDevice)
  })

  it('固定存储项仍按交接编号隔离账号，清理甲页不删除乙页凭据', async () => {
    const auth = await import('../tabAuthHandoff')
    const other = { ...context, accessToken: '假令牌乙', platformType: 'tenant' as const }
    const first = auth.createTabAuthHandoff(context)!
    const second = auth.createTabAuthHandoff(other)!
    expect(second).not.toBe(first)
    visit(first)
    expect(auth.consumeTabAuthHandoff()).toEqual(context)
    auth.persistTabAuthRefreshContext(context)
    auth.clearTabAuthHandoffCache()
    visit(second)
    expect(auth.consumeTabAuthHandoff()).toEqual(other)
    visit(first)
    expect(auth.consumeTabAuthHandoff()).toBeNull()
    visit('没有对应凭据')
    expect(auth.consumeTabAuthHandoff()).toBeNull()
  })

  it('窗口名称交接成功后同样回收一次性本地信封和窗口名称', async () => {
    const auth = await import('../tabAuthHandoff')
    const id = auth.createTabAuthHandoff(context)!
    visit(id)
    page.name = auth.createTabAuthWindowName(context)
    expect(auth.consumeTabAuthHandoff()).toEqual(context)
    expect(page.name).toBe('')
    expect(auth.consumeTabAuthHandoff()).toBeNull()
  })

  it('迁移旧缓存并清理过期项，不删除应用的其他存储数据', async () => {
    const now = Date.now()
    local.setItem('其他业务配置', '保留')
    local.setItem('xr-center-refresh-auth:old-valid', JSON.stringify({ createdAt: now, context }))
    local.setItem('xr-center-refresh-auth:old-expired', JSON.stringify({ createdAt: now - 31 * 60_000, context }))
    local.setItem('xr-center-tab-auth:old-expired', '{损坏数据')
    const auth = await import('../tabAuthHandoff')
    visit('old-valid')
    expect(auth.consumeTabAuthHandoff()).toEqual(context)
    auth.persistTabAuthRefreshContext(context)
    expect(local.length).toBe(2)
    expect(local.getItem('其他业务配置')).toBe('保留')
    expect(local.getItem('xr-center-refresh-auth:old-valid')).toBeNull()
    expect(local.getItem('xr-center-refresh-auth:old-expired')).toBeNull()
    expect(local.getItem('xr-center-tab-auth:old-expired')).toBeNull()
  })

  it('本地存储不可写时会话副本仍支持刷新，失效时不会恢复已过期凭据', async () => {
    const auth = await import('../tabAuthHandoff')
    visit('session-only')
    vi.spyOn(local, 'setItem').mockImplementation(() => { throw new Error('存储受限') })
    auth.persistTabAuthRefreshContext(context)
    expect(auth.consumeTabAuthHandoff()).toEqual(context)
    auth.persistTabAuthRefreshContext({ ...context, expiresAt: Date.now() - 1 })
    expect(auth.consumeTabAuthHandoff()).toBeNull()
  })

  it('会话存储受限时只恢复编号匹配的本地副本，三十分钟后清理而不延长期限', async () => {
    const auth = await import('../tabAuthHandoff')
    const id = auth.createTabAuthHandoff(context)!
    visit(id)
    expect(auth.consumeTabAuthHandoff()).toEqual(context)
    vi.spyOn(session, 'setItem').mockImplementation(() => { throw new Error('会话存储受限') })
    auth.persistTabAuthRefreshContext(context)
    expect(auth.consumeTabAuthHandoff()).toEqual(context)
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 31 * 60_000)
    expect(auth.consumeTabAuthHandoff()).toBeNull()
    expect(Object.keys(JSON.parse(local.getItem(CACHE_KEY)!).refreshContexts)).toHaveLength(0)
  })

  it('缓存内容有数量和时间上限，反复打开页面不会把增长转移到固定项内部', async () => {
    const auth = await import('../tabAuthHandoff')
    for (let i = 0; i < 100; i++) auth.createTabAuthHandoff(context)
    const cache = JSON.parse(local.getItem(CACHE_KEY)!)
    expect(Object.keys(cache.handoffs).length).toBeLessThanOrEqual(64)
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 61_000)
    auth.createTabAuthHandoff(context)
    expect(Object.keys(JSON.parse(local.getItem(CACHE_KEY)!).handoffs)).toHaveLength(1)
  })
})
