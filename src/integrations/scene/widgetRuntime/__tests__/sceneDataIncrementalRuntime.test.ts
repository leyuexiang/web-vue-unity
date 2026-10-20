import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSceneWidgetStore } from '@/stores/sceneEditStore'
import InputConfig from '@/packages/components/Control/VInput/config'
import type { SceneObject } from '@/scene-platform'
import {
  createEmptyDataConfig,
  createEmptyRequestGlobalConfig,
  type AjaxRequestConfig,
  type PublicRequestConfig,
  getDataConfigRequests,
  createDataConfigRequestItem,
} from '@/types/data-config'
import { buildParameterTargetOptions } from '@/utils/dataConfig/interactionRequestParameters'
import { SceneDataPollingRuntime } from '../sceneDataPollingRuntime'
import { getSceneRequestParameterSourceConfig } from '../sceneDataRequestActions'
import request from '@/request'

vi.mock('@/request', () => ({ default: vi.fn() }))
vi.mock('@/auth/runtime', async (original) => ({
  ...(await original<typeof import('@/auth/runtime')>()),
  isEmbeddedMode: () => false,
}))
const network = vi.mocked(request)
const runtimes: SceneDataPollingRuntime[] = []
afterEach(() => {
  runtimes.splice(0).forEach((runtime) => runtime.dispose())
  vi.useRealTimers()
  vi.resetAllMocks()
})

/** 使用真实组件、模型及调度器，仅替换网络边界，覆盖用户截图中的增量激活入口。 */
const dataConfig = (url: string, interval = 0) => {
  const config = createEmptyDataConfig()
  config.request = {
    type: 'ajax',
    config: {
      requestUrl: url,
      requestHttpType: 'GET',
      requestInterval: interval,
      requestIntervalUnit: 'second',
      requestParams: { Params: { id: '0' }, Header: {}, Body: {} },
    } as AjaxRequestConfig,
  }
  return config
}
const widget = (id: string, interval = 0) => {
  const component = new InputConfig()
  component.dataConfig = dataConfig(`/${id}`, interval)
  component.dataConfig.bindings = [
    { kind: 'widget', targetPath: 'value', sourceField: 'value', valueType: 'string' },
  ]
  return { id, component }
}
const object = (id: string): SceneObject => ({
  id,
  name: id,
  type: 'model',
  visible: true,
  locked: false,
  order: 0,
  assetRefs: [],
  transform: { kind: 'local', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
  metadata: { dataConfig: dataConfig(`/${id}`) },
})
const fixture = () => {
  const widgets = useSceneWidgetStore()
  widgets.totalWidgets = []
  const objects: SceneObject[] = []
  const publicRequests: PublicRequestConfig[] = []
  const applyObject = vi.fn()
  network.mockImplementation(async (_url, options) => ({
    data: { value: `数据${(options?.params as Record<string, string>).id}` },
  }))
  const runtime = new SceneDataPollingRuntime({
    getSceneObjects: () => objects,
    getPublicRequests: () => publicRequests,
    getRequestGlobalConfig: createEmptyRequestGlobalConfig,
    applySceneObject: applyObject,
  })
  runtimes.push(runtime)
  return { widgets, objects, publicRequests, runtime, applyObject }
}

describe('场景数据增量激活', () => {
  it('新增组件和模型只请求新增目标，已有二维传参及模型来源快照保持不变', async () => {
    const f = fixture()
    const existingWidget = widget('widget-old')
    const existingObject = object('object-old')
    f.widgets.totalWidgets = [existingWidget]
    f.objects.push(existingObject)
    await f.runtime.start()
    for (const [targetKind, targetId, config] of [
      ['widget', existingWidget.id, existingWidget.component.dataConfig!],
      ['object', existingObject.id, existingObject.metadata!.dataConfig],
    ] as const) {
      await f.runtime.passParameters({
        targetKind,
        targetId,
        assignments: [{ targetProperty: buildParameterTargetOptions(config)[0].value, value: 5 }],
      })
    }
    const baseline = network.mock.calls.length
    f.widgets.totalWidgets = [...f.widgets.totalWidgets!, widget('widget-new')]
    f.objects.push(object('object-new'))
    await f.runtime.start()
    expect(
      network.mock.calls
        .slice(baseline)
        .map(([url]) => url)
        .sort(),
    ).toEqual(['/object-new', '/widget-new'])
    expect(existingWidget.component.option.value).toBe('数据5')
    expect(getSceneRequestParameterSourceConfig('object-old')?.dataset.source[0]).toEqual({
      value: '数据5',
    })
    await f.runtime.start()
    expect(network).toHaveBeenCalledTimes(baseline + 2)
  })

  it('已有轮询的周期不因新增组件而重新计时，继续使用运行时传参', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const existing = widget('polling', 5)
    f.widgets.totalWidgets = [existing]
    await f.runtime.start()
    await f.runtime.passParameters({
      targetKind: 'widget',
      targetId: existing.id,
      assignments: [
        {
          targetProperty: buildParameterTargetOptions(existing.component.dataConfig!)[0].value,
          value: 5,
        },
      ],
    })
    await vi.advanceTimersByTimeAsync(2000)
    f.widgets.totalWidgets = [...f.widgets.totalWidgets!, widget('new')]
    await f.runtime.start()
    network.mockClear()
    await vi.advanceTimersByTimeAsync(3000)
    expect(network).toHaveBeenCalledTimes(1)
    expect(network.mock.calls[0][0]).toBe('/polling')
    expect(network.mock.calls[0][1]?.params).toMatchObject({ id: '5' })
  })

  it('新增组件期间保留已有在途请求，不重复发送且迟到结果仍应用到原目标', async () => {
    const f = fixture()
    const existing = widget('slow')
    f.widgets.totalWidgets = [existing]
    let resolve!: (value: unknown) => void
    network.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const initial = f.runtime.start()
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1))
    f.widgets.totalWidgets = [...f.widgets.totalWidgets!, widget('new')]
    await f.runtime.start()
    expect(network.mock.calls.filter(([url]) => url === '/slow')).toHaveLength(1)
    resolve({ data: { value: '首轮返回' } })
    await initial
    expect(existing.component.option.value).toBe('首轮返回')
  })

  it('外观变化不请求，自身请求改变只重建对应目标', async () => {
    const f = fixture()
    const a = widget('a')
    const b = widget('b')
    f.widgets.totalWidgets = [a, b]
    f.objects.push(object('model'))
    await f.runtime.start()
    network.mockClear()
    a.component.option.fontSize = 30
    await f.runtime.start()
    expect(network).not.toHaveBeenCalled()
    const stored = f.widgets.totalWidgets![0].component.dataConfig!
    ;(getDataConfigRequests(stored)[0].request.config as AjaxRequestConfig).requestUrl = '/changed'
    await f.runtime.start()
    expect(network.mock.calls.map(([url]) => url)).toEqual(['/changed'])
    network.mockClear()
    const modelConfig = f.objects[0].metadata!.dataConfig as ReturnType<typeof dataConfig>
    ;(getDataConfigRequests(modelConfig)[0].request.config as AjaxRequestConfig).requestUrl =
      '/model-changed'
    await f.runtime.start()
    expect(network.mock.calls.map(([url]) => url)).toEqual(['/model-changed'])
  })

  it('同组件请求二改变不丢失请求一的交互覆盖', async () => {
    vi.useFakeTimers()
    const f = fixture()
    const a = widget('multi', 5)
    a.component.dataConfig!.requests = [
      createDataConfigRequestItem({ ...getDataConfigRequests(a.component.dataConfig)[0] }),
      createDataConfigRequestItem({
        ...getDataConfigRequests(dataConfig('/second'))[0],
        id: 'request-2',
      }),
    ]
    f.widgets.totalWidgets = [a]
    await f.runtime.start()
    await f.runtime.passParameters({
      targetKind: 'widget',
      targetId: a.id,
      assignments: [
        { targetProperty: buildParameterTargetOptions(a.component.dataConfig!)[0].value, value: 5 },
      ],
    })
    const config = f.widgets.totalWidgets![0].component.dataConfig!
    ;(getDataConfigRequests(config)[1].request.config as AjaxRequestConfig).requestUrl =
      '/second-changed'
    network.mockClear()
    await f.runtime.start()
    expect(network.mock.calls.map(([url]) => url)).toEqual(['/second-changed'])
    await f.runtime.passParameters({
      targetKind: 'widget',
      targetId: a.id,
      assignments: [{ targetProperty: buildParameterTargetOptions(config)[1].value, value: 8 }],
    })
    // 请求二单独传参后再次协调，等待请求一原有轮询验证其覆盖仍为 5。
    await f.runtime.start()
    network.mockClear()
    await vi.advanceTimersByTimeAsync(5000)
    expect(network).toHaveBeenCalledTimes(1)
    expect(network.mock.calls[0][0]).toBe('/multi')
    expect(network.mock.calls[0][1]?.params).toMatchObject({ id: '5' })
  })

  it.each(['widget', 'object'] as const)(
    '%s 删除重加相同编号后，旧响应不得覆盖新任务',
    async (kind) => {
      const f = fixture()
      const a = widget('same')
      if (kind === 'widget') f.widgets.totalWidgets = [a]
      else f.objects.push(object('same'))
      let resolveOld!: (value: unknown) => void
      network.mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolveOld = done
          }),
      )
      const oldStart = f.runtime.start()
      await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1))
      f.widgets.totalWidgets = []
      f.objects.splice(0)
      await f.runtime.start()
      if (kind === 'widget') f.widgets.totalWidgets = [widget('same')]
      else f.objects.push(object('same'))
      await f.runtime.start()
      resolveOld({ data: { value: '失效旧数据' } })
      await oldStart
      if (kind === 'widget') expect(f.widgets.totalWidgets![0].component.option.value).toBe('数据0')
      else
        expect(getSceneRequestParameterSourceConfig('same')?.dataset.source[0]).toEqual({
          value: '数据0',
        })
      expect(network).toHaveBeenCalledTimes(2)
    },
  )

  it('新增公共接口订阅复用当前结果，不重新请求或覆盖已有目标', async () => {
    const f = fixture()
    const shared = {
      ...dataConfig('/shared').request.config,
      id: 'shared',
      name: '共享接口',
    } as PublicRequestConfig
    f.publicRequests.push(shared)
    const a = widget('a')
    a.component.dataConfig!.request = { type: 'public', config: { publicRequestId: shared.id } }
    f.widgets.totalWidgets = [a]
    await f.runtime.start()
    a.component.option.value = '已有组件当前值'
    const b = widget('b')
    b.component.dataConfig!.request = { type: 'public', config: { publicRequestId: shared.id } }
    const model = object('model')
    ;(model.metadata!.dataConfig as ReturnType<typeof dataConfig>).request = {
      type: 'public',
      config: { publicRequestId: shared.id },
    }
    f.widgets.totalWidgets = [...f.widgets.totalWidgets!, b]
    f.objects.push(model)
    await f.runtime.start()
    expect(network).toHaveBeenCalledTimes(1)
    expect(a.component.option.value).toBe('已有组件当前值')
    expect(b.component.option.value).toBe('数据0')
    expect(getSceneRequestParameterSourceConfig('model')?.dataset.source[0]).toEqual({
      value: '数据0',
    })
  })

  it('新公共订阅加入已有在途请求，每个目标仅接收一次结果', async () => {
    const f = fixture()
    f.publicRequests.push({
      ...dataConfig('/shared').request.config,
      id: 'shared',
      name: '共享接口',
    } as PublicRequestConfig)
    const a = widget('a')
    a.component.dataConfig!.request = { type: 'public', config: { publicRequestId: 'shared' } }
    f.widgets.totalWidgets = [a]
    let resolve!: (value: unknown) => void
    network.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const initial = f.runtime.start()
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1))
    const model = object('model')
    ;(model.metadata!.dataConfig as ReturnType<typeof dataConfig>).request = {
      type: 'public',
      config: { publicRequestId: 'shared' },
    }
    f.objects.push(model)
    const incremental = f.runtime.start()
    expect(network).toHaveBeenCalledTimes(1)
    resolve({ data: { value: '共同返回' } })
    await Promise.all([initial, incremental])
    expect(a.component.option.value).toBe('共同返回')
    expect(f.applyObject).toHaveBeenCalledTimes(1)
    expect(getSceneRequestParameterSourceConfig('model')?.dataset.source[0]).toEqual({
      value: '共同返回',
    })
  })

  it('静态组件和模型不因新增对象重放绑定，退出后重新进入正常初始化', async () => {
    const f = fixture()
    const a = widget('static')
    a.component.dataConfig!.request = { type: 'static', config: { data: [{ value: '静态值' }] } }
    const model = object('static-model')
    ;(model.metadata!.dataConfig as ReturnType<typeof dataConfig>).request = {
      type: 'static',
      config: { data: [{ visible: false }] },
    }
    f.widgets.totalWidgets = [a]
    f.objects.push(model)
    await f.runtime.start()
    a.component.option.value = '组件当前交互值'
    f.widgets.totalWidgets = [...f.widgets.totalWidgets!, widget('new')]
    await f.runtime.start()
    expect(a.component.option.value).toBe('组件当前交互值')
    expect(f.applyObject).toHaveBeenCalledTimes(1)
    f.runtime.stop()
    expect(getSceneRequestParameterSourceConfig('static-model')).toBeNull()
    await f.runtime.start()
    expect(a.component.option.value).toBe('静态值')
    expect(f.applyObject).toHaveBeenCalledTimes(2)
  })

  it('公共接口输入改变时只刷新订阅目标，旧在途结果失效', async () => {
    const f = fixture()
    const shared = {
      ...dataConfig('/shared-old').request.config,
      id: 'shared',
      name: '共享接口',
    } as PublicRequestConfig
    f.publicRequests.push(shared)
    const a = widget('a')
    a.component.dataConfig!.request = { type: 'public', config: { publicRequestId: 'shared' } }
    f.widgets.totalWidgets = [a, widget('independent')]
    let resolveOld!: (value: unknown) => void
    // 普通请求先发，公共接口紧随其后；只延迟公共接口响应。
    network.mockImplementation(async (url, options) => {
      if (url === '/shared-old')
        return new Promise((done) => {
          resolveOld = done
        })
      return { data: { value: `数据${(options?.params as Record<string, string>).id}` } }
    })
    const initial = f.runtime.start()
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(2))
    f.publicRequests[0] = { ...shared, requestUrl: '/shared-new' }
    await f.runtime.start()
    expect(network.mock.calls.map(([url]) => url)).toEqual([
      '/independent',
      '/shared-old',
      '/shared-new',
    ])
    resolveOld({ data: { value: '过期公共响应' } })
    await initial
    expect(a.component.option.value).toBe('数据0')
  })
})
