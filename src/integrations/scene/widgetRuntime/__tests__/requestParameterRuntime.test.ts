import { describe, expect, it, vi } from 'vitest'
import {
  createEmptyDataConfig,
  createEmptyRequestGlobalConfig,
  type AjaxRequestConfig,
} from '@/types/data-config'
import { SceneDataPollingRuntime } from '../sceneDataPollingRuntime'
import type {
  WidgetPreviewRemoteEntry,
  WidgetPreviewRemoteExecutionResult,
} from '../widgetDataRuntimeService'
import { buildParameterTargetOptions } from '@/utils/dataConfig/interactionRequestParameters'
import { passSceneRequestParameters } from '../sceneDataRequestActions'

/** 使用真实调度器与请求参数协议，网络替身记录最终发送配置，避免发出业务请求。 */
const createFixture = () => {
  const config = createEmptyDataConfig()
  config.request = {
    type: 'ajax',
    config: {
      requestHttpType: 'GET',
      requestInterval: 0,
      requestIntervalUnit: 'second',
      requestParams: { Params: { key: 'old', page: '1' }, Header: {}, Body: {} },
    } as AjaxRequestConfig,
  }
  const entry = {
    kind: 'widget',
    target: { id: 'target', component: { dataConfig: config } },
    requestId: 'request-1',
    requestType: 'ajax',
    intervalSeconds: 0,
    intervalUnit: 'second',
  } as WidgetPreviewRemoteEntry
  const execute = vi.fn(
    async (_entry: WidgetPreviewRemoteEntry, override = config) =>
      ({
        kind: 'widget',
        target: entry.target,
        dataConfig: override,
        requestId: entry.requestId,
        source: [{ value: 'new' }],
        dimensions: ['value'],
      }) as WidgetPreviewRemoteExecutionResult,
  )
  const apply = vi.fn()
  const runtime = new SceneDataPollingRuntime({
    getPublicRequests: () => [],
    getRequestGlobalConfig: createEmptyRequestGlobalConfig,
    widgetDataService: {
      applyStaticDataConfigs: vi.fn(),
      collectRemoteEntries: () => [entry],
      executeRemoteEntry: execute,
      applyRemoteExecutionResult: apply,
      getDataConfigForEntry: () => config,
      applyRemoteResult: vi.fn(),
    },
  })
  const assignments = buildParameterTargetOptions(config).map((option) => ({
    targetProperty: option.value,
    value: '123',
  }))
  return { runtime, config, execute, apply, assignments }
}

describe('传参请求调度', () => {
  it('同一请求多个参数批量覆盖后只重发一次，保留编辑配置，停止后端口不执行', async () => {
    const f = createFixture()
    try {
      await f.runtime.start()
      f.execute.mockClear()
      await passSceneRequestParameters({
        targetKind: 'widget',
        targetId: 'target',
        assignments: f.assignments,
      })
      expect(f.execute).toHaveBeenCalledTimes(1)
      const sent = f.execute.mock.calls[0][1]!
      expect((sent.request.config as AjaxRequestConfig).requestParams.Params).toEqual({
        key: '123',
        page: '123',
      })
      expect((f.config.request.config as AjaxRequestConfig).requestParams.Params.key).toBe('old')
      f.runtime.stop()
      await passSceneRequestParameters({
        targetKind: 'widget',
        targetId: 'target',
        assignments: f.assignments,
      })
      expect(f.execute).toHaveBeenCalledTimes(1)
    } finally {
      f.runtime.dispose()
    }
  })

  it('后触发请求先返回时，丢弃先触发请求的迟到结果', async () => {
    const f = createFixture()
    try {
      await f.runtime.start()
      f.apply.mockClear()
      let resolveOld!: (result: WidgetPreviewRemoteExecutionResult) => void
      f.execute.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          }),
      )
      const old = f.runtime.passParameters({
        targetKind: 'widget',
        targetId: 'target',
        assignments: f.assignments,
      })
      await f.runtime.passParameters({
        targetKind: 'widget',
        targetId: 'target',
        assignments: f.assignments,
      })
      expect(f.apply).toHaveBeenCalledTimes(1)
      resolveOld({} as WidgetPreviewRemoteExecutionResult)
      await old
      expect(f.apply).toHaveBeenCalledTimes(1)
    } finally {
      f.runtime.dispose()
    }
  })
})
