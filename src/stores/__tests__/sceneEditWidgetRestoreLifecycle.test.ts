import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import { useSceneWidgetStore, type WidgetConfig } from '../sceneEditStore'
import { loadConfig } from '@/packages'

/** 使用可控的组件安装屏障复现跨场景迟到响应，避免依赖真实网络和定时器。 */
vi.mock('@/packages', () => ({ loadConfig: vi.fn() }))
vi.mock('@/utils/renderScene/widgetModules', () => ({ installWidget: vi.fn(async () => true) }))
const widget = (id: string): WidgetConfig => ({ id, component: {
  attr: { l: 0, t: 0, w: 100, h: 40, zIndex: 0 }, info: { name: id, keyName: 'VTextCommon', packageName: 'Widget', icon: '' },
  option: { value: id }, styles: { animations: [] }, statusList: [], interactiveEvent: [],
} as unknown as BaseWidgetConfig })
const installBarrier = () => {
  let release!: () => void
  const promise = new Promise<undefined>(resolve => { release = () => resolve(undefined) })
  vi.mocked(loadConfig).mockReturnValueOnce(promise)
  return release
}

describe('二维仓库恢复生命周期', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.mocked(loadConfig).mockReset() })
  it('退出页面的空恢复使未完成的旧快照失效', async () => {
    const store = useSceneWidgetStore()
    const release = installBarrier()
    const pending = store.loadSavedWidgets([widget('旧组件')])
    await Promise.resolve()
    await store.loadSavedWidgets([])
    release()
    await pending
    expect(store.totalWidgets).toEqual([])
    expect(store.widgetLayerTree).toEqual([])
  })

  it('同场景并行激活隐藏组件时不会相互覆盖，切换场景后旧追加失效', async () => {
    const store = useSceneWidgetStore()
    await store.loadSavedWidgets([widget('已存在')])
    const releaseA = installBarrier()
    const pendingA = store.appendSavedWidgets([widget('隐藏甲')])
    await Promise.resolve()
    const releaseB = installBarrier()
    const pendingB = store.appendSavedWidgets([widget('隐藏乙')])
    await Promise.resolve()
    releaseA()
    await pendingA
    releaseB()
    await pendingB
    expect(new Set(store.totalWidgets!.map(item => item.id))).toEqual(new Set(['已存在', '隐藏甲', '隐藏乙']))
    const releaseOld = installBarrier()
    const pendingOld = store.appendSavedWidgets([widget('过期')])
    await Promise.resolve()
    await store.loadSavedWidgets([])
    releaseOld()
    await pendingOld
    expect(store.totalWidgets).toEqual([])
  })
})
