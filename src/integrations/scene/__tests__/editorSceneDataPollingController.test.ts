import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import type { ViewportHost } from '@/scene-platform'
import type { WidgetConfig } from '@/stores/sceneEditStore'
import TextConfig from '@/packages/components/Widget/TextCommon/config'
import { createEmptyDataConfig, createEmptyRequestGlobalConfig, type StaticRequestConfig, type PublicRequestConfig, type RequestGlobalConfig } from '@/types/data-config'
import { createEditorSceneDataPollingController } from '../editorSceneDataPollingController'

/** 隔离网络执行，只检验真实响应式配置是否触发唯一调度器，避免把结果回填误判成配置修改。 */
const fixture = vi.hoisted(() => ({
  widgets: {} as { totalWidgets: WidgetConfig[] },
  requests: {} as { scenePublicRequestList: PublicRequestConfig[]; sceneRequestGlobalConfig: RequestGlobalConfig },
  start: vi.fn(), dispose: vi.fn(),
}))
vi.mock('@/stores/sceneEditStore', () => ({ useSceneWidgetStore: () => fixture.widgets }))
vi.mock('@/stores/sceneAuxiliaryStores', () => ({
  useSceneDataStore: () => ({ sceneDataset: [] }),
  useSceneRequestStore: () => fixture.requests,
}))
vi.mock('../widgetRuntime', () => ({ SceneDataPollingRuntime: class {
  start = fixture.start
  dispose = fixture.dispose
} }))

describe('二维编辑器数据配置监听', () => {
  let controller: ReturnType<typeof createEditorSceneDataPollingController> | undefined
  afterEach(() => { controller?.dispose(); vi.useRealTimers(); vi.clearAllMocks() })

  const setup = async () => {
    vi.useFakeTimers()
    const component = new TextConfig()
    component.dataConfig = createEmptyDataConfig([{ value: '初始' }])
    fixture.widgets = reactive({ totalWidgets: [{ id: 'text-1', component }] })
    fixture.requests = reactive({ scenePublicRequestList: [], sceneRequestGlobalConfig: createEmptyRequestGlobalConfig() })
    const host = { getStore: () => ({ getScene: () => ({ id: 'scene-1' }), subscribe: () => () => {} }) } as unknown as ViewportHost
    controller = createEditorSceneDataPollingController({ getViewportHost: () => host, refreshDelayMs: 10 })
    await controller.start()
    expect(fixture.start).toHaveBeenCalledTimes(1)
  }

  it('面板原位修改静态数据及全局接口地址后重新调度', async () => {
    await setup()
    const request = fixture.widgets.totalWidgets[0]!.component.dataConfig!.requests![0]!.request
    ;(request.config as StaticRequestConfig).data = [{ value: '更新' }]
    await nextTick()
    await vi.advanceTimersByTimeAsync(10)
    expect(fixture.start).toHaveBeenCalledTimes(2)
    fixture.requests.sceneRequestGlobalConfig.requestOriginUrl = 'https://example.test'
    await nextTick()
    await vi.advanceTimersByTimeAsync(10)
    expect(fixture.start).toHaveBeenCalledTimes(3)
  })

  it('请求结果回填不重启任务，销毁后配置修改不再调度', async () => {
    await setup()
    const request = fixture.widgets.totalWidgets[0]!.component.dataConfig!.requests![0]!
    request.dataset.source = [{ value: '远程结果' }]
    await nextTick()
    await vi.advanceTimersByTimeAsync(10)
    expect(fixture.start).toHaveBeenCalledTimes(1)
    controller!.dispose()
    ;(request.request.config as StaticRequestConfig).data = []
    await nextTick()
    await vi.advanceTimersByTimeAsync(10)
    expect(fixture.start).toHaveBeenCalledTimes(1)
    expect(fixture.dispose).toHaveBeenCalledTimes(1)
  })
})
