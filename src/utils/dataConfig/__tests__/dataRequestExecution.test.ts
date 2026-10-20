import { afterEach, describe, expect, it, vi } from 'vitest'
import request from '@/request'
import { appLogger } from '@/utils/logger'
import { createEmptyRequestGlobalConfig, type AjaxRequestConfig } from '@/types/data-config'
import { customizeHttpRequest, executeRequestConfig } from '../dataRequestExecution'
import { SceneDataPollingRuntime } from '@/integrations/scene/widgetRuntime/sceneDataPollingRuntime'
import type { WidgetPreviewRemoteEntry } from '@/integrations/scene/widgetRuntime/widgetDataRuntimeService'

// 只替换网络边界，保留真实请求执行器与轮询调度，复现后端对象异常跨层传递的链路。
vi.mock('@/request', () => ({ default: vi.fn() }))
vi.mock('@/auth/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/auth/runtime')>()),
  isEmbeddedMode: () => false,
}))

const network = vi.mocked(request)
const globalConfig = createEmptyRequestGlobalConfig()

/** 通过参数表是否为空触发两条真实执行分支，不依赖内部错误格式化函数。 */
const createRequest = (structured: boolean): AjaxRequestConfig => ({
  requestHttpType: 'GET',
  requestInterval: 0,
  requestIntervalUnit: 'second',
  requestOriginUrl: '',
  requestUrl: '/dim3d/model/info/0',
  requestContentType: 'default',
  requestParamsBodyType: 'none',
  requestParams: {
    Params: structured ? { id: '0' } : {},
    Header: {},
    Body: { json: '', xml: '', 'form-data': {}, 'x-www-form-urlencoded': {} },
  },
  requestSQLContent: { sql: '' },
})

afterEach(() => {
  network.mockReset()
  vi.restoreAllMocks()
})

describe.each([false, true])('数据请求异常，结构化参数：%s', (structured) => {
  it.each([
    [{ code: 500, msg: '资源不存在' }, '资源不存在'],
    [{ code: 404, msg: '接口不存在', message: '通用错误' }, '接口不存在'],
    [{ status: 403, msg: '  ', message: '没有访问权限' }, '没有访问权限'],
    [new TypeError('网络连接失败'), '网络连接失败'],
    ['请求超时', '请求超时'],
    [{ msg: { detail: '不可直接显示' } }, '请检查接口地址、跨域配置、请求参数或服务器状态'],
  ])('向上抛出可读错误且保留原始异常：%j', async (failure, message) => {
    network.mockRejectedValueOnce(failure)
    const error = await executeRequestConfig(
      createRequest(structured),
      undefined,
      undefined,
      globalConfig,
    ).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: `请求执行失败：${message}`, cause: failure })
    expect(network).toHaveBeenCalledTimes(1)
  })

  it('保留业务错误码和状态，便于上层定位失败类型', async () => {
    network.mockRejectedValueOnce({ code: 500, status: 404, msg: '资源不存在' })
    await expect(
      executeRequestConfig(createRequest(structured), undefined, undefined, globalConfig),
    ).rejects.toMatchObject({ code: 500, status: 404 })
  })

  it('原生失败响应仍判定为失败，不归一化成空数据成功', async () => {
    network.mockResolvedValueOnce(new Response(null, { status: 404 }))
    await expect(
      executeRequestConfig(createRequest(structured), undefined, undefined, globalConfig),
    ).rejects.toThrow('请求执行失败：接口返回 HTTP 404')
  })
})

it('直接调用结构化请求也保留后端原因，并交给调用方记录日志', async () => {
  const log = vi.spyOn(appLogger, 'error').mockImplementation(() => {})
  network.mockRejectedValueOnce({ code: 500, msg: '资源不存在' })
  await expect(customizeHttpRequest(createRequest(true), globalConfig)).rejects.toThrow(
    '请求执行失败：资源不存在',
  )
  expect(log).not.toHaveBeenCalled()
})

it('轮询链路的一次请求失败只记录一次，增量协调不重发且下个周期仍可恢复', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(appLogger, 'error').mockImplementation(() => {})
  const failure = { code: 500, msg: '资源不存在' }
  network.mockRejectedValueOnce(failure).mockResolvedValueOnce({ data: [{ value: '已恢复' }] })
  const entry: WidgetPreviewRemoteEntry = {
    kind: 'widget',
    target: { id: 'image-widget' } as WidgetPreviewRemoteEntry['target'],
    intervalSeconds: 5,
    intervalUnit: 'second',
    requestType: 'ajax',
    requestId: 'request-1',
  }
  const executeRemoteEntry = vi.fn(async () => {
    await executeRequestConfig(createRequest(true), undefined, undefined, globalConfig)
    return null
  })
  const runtime = new SceneDataPollingRuntime({
    getPublicRequests: () => [],
    getRequestGlobalConfig: () => globalConfig,
    widgetDataService: {
      applyStaticDataConfigs: vi.fn(),
      collectRemoteEntries: () => [entry],
      executeRemoteEntry,
      applyRemoteExecutionResult: vi.fn(),
      getDataConfigForEntry: vi.fn(),
      applyRemoteResult: vi.fn(),
    },
  })
  try {
    await runtime.start()
    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith(
      'SceneDataPollingRuntime',
      expect.stringContaining('image-widget'),
      expect.objectContaining({ message: '请求执行失败：资源不存在', cause: failure }),
    )
    await runtime.start()
    // 新对象激活所用的 start 只协调任务；失败重试仍遵循原有轮询周期。
    expect(executeRemoteEntry).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5000)
    expect(executeRemoteEntry).toHaveBeenCalledTimes(2)
    expect(log).toHaveBeenCalledTimes(1)
  } finally {
    // 无论断言成功或失败都释放调度器，避免测试留下定时器和运行时状态。
    runtime.dispose()
    vi.useRealTimers()
  }
})
