import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEditorSceneExitController } from '../editorSceneExitController'

describe('编辑页统一退出', () => {
  const browser = { closed: false, close: vi.fn(), setTimeout }
  beforeEach(() => {
    vi.useFakeTimers()
    browser.closed = false
    browser.close.mockReset()
    browser.setTimeout = setTimeout
    vi.stubGlobal('window', browser)
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('并发退出等待同一次解锁完成，且没有来源窗口时也关闭当前页签', async () => {
    let unlocked!: () => void
    const releaseSceneLock = vi.fn(() => new Promise<void>((resolve) => { unlocked = resolve }))
    const returnToManagement = vi.fn(async () => {})
    browser.close.mockImplementation(() => { browser.closed = true })
    const exit = createEditorSceneExitController({ releaseSceneLock, returnToManagement })
    const first = exit()
    expect(exit()).toBe(first)
    await Promise.resolve()
    expect(releaseSceneLock).toHaveBeenCalledOnce()
    expect(browser.close).not.toHaveBeenCalled()
    unlocked()
    await first
    expect(browser.close).toHaveBeenCalledOnce()
    expect(returnToManagement).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('浏览器拒绝关页时只回到管理页一次', async () => {
    const returnToManagement = vi.fn(async () => {})
    const exit = createEditorSceneExitController({ releaseSceneLock: vi.fn(async () => {}), returnToManagement })
    const pending = exit()
    await vi.advanceTimersByTimeAsync(99)
    expect(returnToManagement).not.toHaveBeenCalled()
    expect(exit()).toBe(pending)
    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(browser.close).toHaveBeenCalledOnce()
    expect(returnToManagement).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})
