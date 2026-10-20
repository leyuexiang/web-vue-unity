import { effectScope, nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dim3dOssListResponse } from '@/servers/manual/dim3d/api/oss'
import ImageConfig from '../config'
import { useImageSource } from '../useImageSource'

const queryFile = vi.hoisted(() => vi.fn())
vi.mock('@/servers/manual/dim3d/api/oss', () => ({ getDim3dOssFileById: queryFile }))

/** 在真实响应式作用域中驱动图片地址监听，卸载用例会显式停止作用域。 */
const scopes: ReturnType<typeof effectScope>[] = []
const createImage = (resourceKey: string, value = '') => {
  const option = reactive(new ImageConfig().option)
  option.sourceType = 'resource-market'
  option.resourceKey = resourceKey
  option.value = value
  const scope = effectScope()
  scopes.push(scope)
  const source = scope.run(() => useImageSource(() => option))!
  return { option, source, scope }
}
/** 等待响应式监听及请求完成回调，不依赖真实网络时延。 */
const flush = async () => {
  await nextTick()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

/** 延迟响应允许精确控制新旧请求返回顺序，复现快速切图的竞争条件。 */
const deferred = () => {
  let resolve!: (response: Dim3dOssListResponse) => void
  const promise = new Promise<Dim3dOssListResponse>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const response = (ossId: string, url = `/runtime/${ossId}.png`): Dim3dOssListResponse => ({
  code: 200,
  data: [{ ossId, url }],
})

describe('市场图片地址呈现', () => {
  beforeEach(() => queryFile.mockReset())
  afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()))

  it('按编号解析地址，同图多实例和再次切回只查询一次', async () => {
    const pending = deferred()
    queryFile.mockReturnValue(pending.promise)
    const first = createImage('cache-image')
    const second = createImage('cache-image')
    expect(queryFile).toHaveBeenCalledTimes(1)
    pending.resolve(response('cache-image'))
    await flush()
    expect(first.source.value).toBe('/runtime/cache-image.png')
    expect(second.source.value).toBe(first.source.value)
    expect(first.option.value).toBe('')
    first.option.resourceKey = undefined
    await nextTick()
    expect(first.source.value).toBe('')
    first.option.resourceKey = 'cache-image'
    await flush()
    expect(first.source.value).toBe('/runtime/cache-image.png')
    expect(queryFile).toHaveBeenCalledTimes(1)
  })

  it('快速换图后旧响应不会覆盖新图片', async () => {
    const oldRequest = deferred()
    const newRequest = deferred()
    queryFile.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise)
    const image = createImage('race-old')
    image.option.resourceKey = 'race-new'
    await nextTick()
    newRequest.resolve(response('race-new'))
    await flush()
    expect(image.source.value).toBe('/runtime/race-new.png')
    oldRequest.resolve(response('race-old'))
    await flush()
    expect(image.source.value).toBe('/runtime/race-new.png')
  })

  it('卸载后不回写地址，失败不缓存且切回允许重试', async () => {
    const pending = deferred()
    queryFile.mockReturnValueOnce(pending.promise)
    const removed = createImage('removed-image')
    removed.scope.stop()
    pending.resolve(response('removed-image'))
    await flush()
    expect(removed.source.value).toBe('')

    queryFile.mockRejectedValueOnce(new Error('资源暂不可用'))
    const active = createImage('retry-image')
    await flush()
    expect(active.source.value).toBe('')
    active.option.resourceKey = undefined
    await nextTick()
    queryFile.mockResolvedValueOnce(response('retry-image'))
    active.option.resourceKey = 'retry-image'
    await flush()
    expect(active.source.value).toBe('/runtime/retry-image.png')
  })

  it('已有地址和外部地址无需请求，切换外部来源后使旧请求失效', async () => {
    const image = createImage('direct-image', '/runtime/direct.png')
    expect(image.source.value).toBe('/runtime/direct.png')
    expect(queryFile).not.toHaveBeenCalled()
    const pending = deferred()
    queryFile.mockReturnValueOnce(pending.promise)
    image.option.value = ''
    await nextTick()
    image.option.sourceType = 'external'
    image.option.value = '/external/new.png'
    await nextTick()
    pending.resolve(response('direct-image'))
    await flush()
    expect(image.source.value).toBe('/external/new.png')
  })
})
