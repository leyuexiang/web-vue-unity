import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SceneObject } from '@/scene-platform'
import {
  createEmptyDataConfig,
  createEmptyRequestGlobalConfig,
  customizeHttpRequest,
  type ComponentDataConfig,
  type PublicRequestConfig,
} from '@/utils/dataConfig'
import type {
  WidgetPreviewRemoteEntry,
  WidgetPreviewRemoteExecutionResult,
} from '../widgetDataRuntimeService'
import { SceneDataPollingRuntime } from '../sceneDataPollingRuntime'
import { getQuizRuntimeStatus } from '@/packages/components/Widget/Quiz/quizRuntimeStatus'
import { getSceneRequestParameterSourceConfig } from '../sceneDataRequestActions'

vi.mock('@/utils/dataConfig', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/dataConfig')>()
  return {
    ...original,
    customizeHttpRequest: vi.fn(),
  }
})

const createAjaxEntry = (targetId: string): WidgetPreviewRemoteEntry => ({
  kind: 'widget',
  target: { id: targetId } as WidgetPreviewRemoteEntry['target'],
  intervalSeconds: 5,
  intervalUnit: 'second',
  requestType: 'ajax',
  requestId: 'request-1',
})

const createQuizEntry = (
  targetId: string,
  requestType: 'ajax' | 'public' = 'ajax',
): WidgetPreviewRemoteEntry => ({
  ...createAjaxEntry(targetId),
  target: {
    id: targetId,
    component: {
      info: { keyName: 'VQuiz' },
      option: { quizId: '', questions: [] },
    },
  } as WidgetPreviewRemoteEntry['target'],
  requestType,
  ...(requestType === 'public' ? { publicRequestId: 'public-1' } : {}),
})

const createPublicDataConfig = (): ComponentDataConfig => {
  const dataConfig = createEmptyDataConfig()
  dataConfig.request = {
    type: 'public',
    config: { publicRequestId: 'public-1' },
  }
  dataConfig.bindings = [
    {
      kind: 'object',
      targetPath: 'visible',
      sourceField: 'visible',
      valueType: 'boolean',
    },
  ]
  return dataConfig
}

const createPublicRequest = (): PublicRequestConfig => ({
  id: 'public-1',
  name: '公共请求',
  requestHttpType: 'GET',
  requestInterval: 5,
  requestIntervalUnit: 'second',
  requestOriginUrl: 'https://example.test/',
  requestUrl: 'status',
  requestContentType: 'default',
  requestParamsBodyType: 'none',
  requestParams: {
    Params: {},
    Header: {},
    Body: { 'form-data': {}, 'x-www-form-urlencoded': {}, json: '', xml: '' },
  },
  requestSQLContent: { sql: '' },
})

describe('SceneDataPollingRuntime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(customizeHttpRequest).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('单个首轮请求失败时仍注册其它请求，并在下一周期重试失败项', async () => {
    const entries = [createAjaxEntry('widget-1'), createAjaxEntry('widget-2')]
    const executeRemoteEntry = vi
      .fn<(entry: WidgetPreviewRemoteEntry) => Promise<WidgetPreviewRemoteExecutionResult | null>>()
      .mockImplementation(async (entry) => {
        if (entry.target.id === 'widget-1' && executeRemoteEntry.mock.calls.length <= 1) {
          throw new Error('首轮失败')
        }
        return null
      })
    const runtime = new SceneDataPollingRuntime({
      getPublicRequests: () => [],
      getRequestGlobalConfig: createEmptyRequestGlobalConfig,
      widgetDataService: {
        applyStaticDataConfigs: vi.fn(),
        collectRemoteEntries: () => entries,
        executeRemoteEntry,
        applyRemoteExecutionResult: vi.fn(),
        getDataConfigForEntry: vi.fn(),
        applyRemoteResult: vi.fn(),
      },
    })

    await runtime.start()
    expect(executeRemoteEntry).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(5000)
    expect(executeRemoteEntry).toHaveBeenCalledTimes(4)
    runtime.dispose()
  })

  it('二维和三维引用同一公共接口时每个周期只请求一次并分发给全部目标', async () => {
    const publicDataConfig = createPublicDataConfig()
    const widgetEntry: WidgetPreviewRemoteEntry = {
      ...createAjaxEntry('widget-1'),
      requestType: 'public',
      publicRequestId: 'public-1',
    }
    const sceneObject: SceneObject = {
      id: 'object-1',
      name: '三维对象',
      type: 'model',
      visible: true,
      locked: false,
      order: 0,
      transform: {
        kind: 'local',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      assetRefs: [],
      metadata: { dataConfig: publicDataConfig },
    }
    const applyRemoteResult = vi.fn()
    const applySceneObject = vi.fn()
    vi.mocked(customizeHttpRequest).mockResolvedValue({ data: [{ visible: false }] })
    const runtime = new SceneDataPollingRuntime({
      getPublicRequests: () => [createPublicRequest()],
      getRequestGlobalConfig: createEmptyRequestGlobalConfig,
      getSceneObjects: () => [sceneObject],
      applySceneObject,
      widgetDataService: {
        applyStaticDataConfigs: vi.fn(),
        collectRemoteEntries: () => [widgetEntry],
        executeRemoteEntry: vi.fn(),
        applyRemoteExecutionResult: vi.fn(),
        getDataConfigForEntry: () => publicDataConfig,
        applyRemoteResult,
      },
    })

    await runtime.start()

    expect(customizeHttpRequest).toHaveBeenCalledTimes(1)
    expect(applyRemoteResult).toHaveBeenCalledTimes(1)
    expect(applySceneObject).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'object-1', visible: false }),
    )
    // 跨组件传参必须读取本轮请求结果，不能读取仍保留在编辑快照中的旧数据。
    expect(getSceneRequestParameterSourceConfig('object-1')?.dataset.source).toEqual([
      { visible: false },
    ])
    expect(getSceneRequestParameterSourceConfig('deleted-object')).toBeNull()

    await vi.advanceTimersByTimeAsync(5000)
    expect(customizeHttpRequest).toHaveBeenCalledTimes(2)
    runtime.dispose()
    // 生命周期结束即释放来源读端口，防止下一场景误读上一场景的对象编号。
    expect(getSceneRequestParameterSourceConfig('object-1')).toBeNull()
  })

  it('销毁后清除定时器，并丢弃已发出请求的迟到结果', async () => {
    const entry = createAjaxEntry('widget-1')
    let resolveRequest: ((value: WidgetPreviewRemoteExecutionResult | null) => void) | null = null
    const executeRemoteEntry = vi.fn(
      () =>
        new Promise<WidgetPreviewRemoteExecutionResult | null>((resolve) => {
          resolveRequest = resolve
        }),
    )
    const applyRemoteExecutionResult = vi.fn()
    const runtime = new SceneDataPollingRuntime({
      getPublicRequests: () => [],
      getRequestGlobalConfig: createEmptyRequestGlobalConfig,
      widgetDataService: {
        applyStaticDataConfigs: vi.fn(),
        collectRemoteEntries: () => [entry],
        executeRemoteEntry,
        applyRemoteExecutionResult,
        getDataConfigForEntry: vi.fn(),
        applyRemoteResult: vi.fn(),
      },
    })

    const starting = runtime.start()
    /** 等待 start 完成本地静态数据阶段并真正发出首轮请求，再模拟页面立即销毁。 */
    await vi.advanceTimersByTimeAsync(0)
    expect(executeRemoteEntry).toHaveBeenCalledTimes(1)
    runtime.dispose()
    resolveRequest?.({
      kind: 'widget',
      target: entry.target,
      dataConfig: createEmptyDataConfig(),
      dimensions: ['value'],
      source: [{ value: 1 }],
      requestId: entry.requestId,
    })
    await starting
    await vi.advanceTimersByTimeAsync(5000)

    expect(applyRemoteExecutionResult).not.toHaveBeenCalled()
  })

  it('测验首份完整题库只请求一次，显式销毁后清理运行状态', async () => {
    const entry = createQuizEntry('quiz-once')
    let loaded = false
    const executeRemoteEntry = vi.fn(
      async (): Promise<WidgetPreviewRemoteExecutionResult> => ({
        kind: 'widget',
        target: entry.target,
        dataConfig: createEmptyDataConfig(),
        dimensions: [],
        source: [],
        requestId: entry.requestId,
      }),
    )
    const runtime = new SceneDataPollingRuntime({
      getPublicRequests: () => [],
      getRequestGlobalConfig: createEmptyRequestGlobalConfig,
      widgetDataService: {
        applyStaticDataConfigs: vi.fn(),
        collectRemoteEntries: () => [entry],
        executeRemoteEntry,
        applyRemoteExecutionResult: vi.fn(() => {
          loaded = true
        }),
        getDataConfigForEntry: vi.fn(),
        applyRemoteResult: vi.fn(),
        isQuizLoaded: () => loaded,
      },
    })

    await runtime.start()
    expect(executeRemoteEntry).toHaveBeenCalledTimes(1)
    expect(getQuizRuntimeStatus('quiz-once')).toMatchObject({ state: 'ready' })

    await vi.advanceTimersByTimeAsync(15000)
    expect(executeRemoteEntry).toHaveBeenCalledTimes(1)

    runtime.dispose()
    expect(getQuizRuntimeStatus('quiz-once')).toMatchObject({ state: 'idle' })
  })

  it('共享公共接口轮询继续更新其他部件，但不覆盖已加载的测验题库', async () => {
    const quizEntry = createQuizEntry('quiz-shared', 'public')
    const widgetEntry: WidgetPreviewRemoteEntry = {
      ...createAjaxEntry('widget-shared'),
      requestType: 'public',
      publicRequestId: 'public-1',
    }
    const publicDataConfig = createPublicDataConfig()
    // 公共传参可从测验目标发起，显式刷新须重新加载全部订阅，之后轮询继续保护答题。
    quizEntry.target.component.dataConfig = publicDataConfig
    const publicRequest = createPublicRequest()
    publicRequest.requestParams.Params.id = 'old'
    let quizLoaded = false
    const quizApplyRemoteResult = vi.fn(() => {
      quizLoaded = true
    })
    const widgetApplyRemoteResult = vi.fn()
    vi.mocked(customizeHttpRequest).mockResolvedValue({ data: [{ quizId: 'quiz-shared' }] })
    const runtime = new SceneDataPollingRuntime({
      getPublicRequests: () => [publicRequest],
      getRequestGlobalConfig: createEmptyRequestGlobalConfig,
      widgetDataService: {
        applyStaticDataConfigs: vi.fn(),
        collectRemoteEntries: () => [quizEntry, widgetEntry],
        executeRemoteEntry: vi.fn(),
        applyRemoteExecutionResult: vi.fn(),
        getDataConfigForEntry: () => publicDataConfig,
        applyRemoteResult: (entry) => {
          if (entry.target.id === quizEntry.target.id) quizApplyRemoteResult()
          else widgetApplyRemoteResult()
        },
        isQuizLoaded: () => quizLoaded,
      },
    })

    await runtime.start()
    expect(quizApplyRemoteResult).toHaveBeenCalledTimes(1)
    expect(widgetApplyRemoteResult).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5000)
    expect(customizeHttpRequest).toHaveBeenCalledTimes(2)
    expect(quizApplyRemoteResult).toHaveBeenCalledTimes(1)
    expect(widgetApplyRemoteResult).toHaveBeenCalledTimes(2)

    await runtime.passParameters({
      targetKind: 'widget',
      targetId: quizEntry.target.id,
      assignments: [{ targetProperty: '["request-1","Params",["id"],"public-1"]', value: 'new' }],
    })
    expect(customizeHttpRequest).toHaveBeenCalledTimes(3)
    expect(quizApplyRemoteResult).toHaveBeenCalledTimes(2)
    expect(widgetApplyRemoteResult).toHaveBeenCalledTimes(3)
    expect(vi.mocked(customizeHttpRequest).mock.lastCall?.[0].requestParams.Params.id).toBe('new')
    await vi.advanceTimersByTimeAsync(5000)
    expect(quizApplyRemoteResult).toHaveBeenCalledTimes(2)
    expect(widgetApplyRemoteResult).toHaveBeenCalledTimes(4)

    runtime.dispose()
  })
})
