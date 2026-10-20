import { describe, expect, it, vi } from 'vitest'
import { loadWithRetryableCache } from '../moduleLoadCache'

describe('组件加载缓存恢复', () => {
  // 模拟首次拖拽时文件尚未进入模块清单，后续加载应重新查找。
  it('未找到模块后允许重试', async () => {
    const cache = new Map<string, Promise<string | undefined>>()
    const loader = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValue('组件')
    expect(await loadWithRetryableCache(cache, '背景', loader)).toBeUndefined()
    expect(await loadWithRetryableCache(cache, '背景', loader)).toBe('组件')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  // 网络失败不应永久阻断同一资源，错误仍必须传递到调用方。
  it('请求异常后允许重试', async () => {
    const cache = new Map<string, Promise<string | undefined>>()
    const loader = vi.fn().mockRejectedValueOnce(new Error('暂时失败')).mockResolvedValue('组件')
    await expect(loadWithRetryableCache(cache, '色块', loader)).rejects.toThrow('暂时失败')
    expect(await loadWithRetryableCache(cache, '色块', loader)).toBe('组件')
  })

  // 快速连续拖拽只触发一次模块加载，成功结果继续缓存。
  it('复用并发请求和成功结果', async () => {
    const cache = new Map<string, Promise<string | undefined>>()
    const loader = vi.fn().mockResolvedValue('组件')
    const first = loadWithRetryableCache(cache, '背景', loader)
    expect(loadWithRetryableCache(cache, '背景', loader)).toBe(first)
    await first
    expect(await loadWithRetryableCache(cache, '背景', loader)).toBe('组件')
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
