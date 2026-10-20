import { afterEach, describe, expect, it, vi } from 'vitest'
import request from '@/request'
import { authContext } from '@/auth/authContext'
import {
  createEmptyDataConfig,
  createEmptyRequestGlobalConfig,
  type AjaxRequestConfig,
} from '@/types/data-config'
import { resolveDataRequestUrl } from '../dataRequestUrl'
import {
  customizeHttpRequest,
  executeComponentRequestByType,
  executeRequestConfig,
} from '../dataRequestExecution'
import {
  applyInteractionRequestParameters,
  buildParameterTargetOptions,
} from '../interactionRequestParameters'

// 仅替换网络边界和宿主模式；真实执行参数合并、地址解析、交互赋值及来源鉴权校验。
vi.mock('@/request', () => ({ default: vi.fn() }))
const embeddedMode = vi.hoisted(() => vi.fn(() => false))
vi.mock('@/auth/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/auth/runtime')>()),
  isEmbeddedMode: embeddedMode,
}))
const network = vi.mocked(request)
const globalConfig = createEmptyRequestGlobalConfig()

/** 使用参数表实际保存的字符串协议，避免用与界面不一致的测试配置。 */
const createRequest = (overrides: Partial<AjaxRequestConfig> = {}): AjaxRequestConfig => ({
  requestHttpType: 'GET',
  requestInterval: 0,
  requestIntervalUnit: 'second',
  requestOriginUrl: '',
  requestUrl: '/dim3d/model/info/${params.id}',
  requestContentType: 'default',
  requestParamsBodyType: 'none',
  requestParams: {
    Params: { id: '12001', filter: 'enabled' },
    Header: {},
    Body: { json: '', xml: '', 'form-data': {}, 'x-www-form-urlencoded': {} },
  },
  requestSQLContent: { sql: '' },
  ...overrides,
})

afterEach(() => {
  network.mockReset()
  embeddedMode.mockReturnValue(false)
  authContext.clear()
  vi.unstubAllGlobals()
})

describe('请求地址参数占位', () => {
  it('编码特殊字符，支持多个及重复占位，保留其它查询参数且不修改原参数表', () => {
    const params = { group: '设备/A?x=1#位置', id: '12001', page: '2' }
    const before = { ...params }
    expect(resolveDataRequestUrl('/${params.group}/${ params.id }/${params.id}', params)).toEqual({
      url: '/%E8%AE%BE%E5%A4%87%2FA%3Fx%3D1%23%E4%BD%8D%E7%BD%AE/12001/12001',
      params: { page: '2' },
    })
    expect(params).toEqual(before)
  })

  it('编号零与布尔值有效，参数值中的模板语法只作为文本发送', () => {
    expect(
      resolveDataRequestUrl('/${params.id}/${params.active}', { id: 0, active: false }),
    ).toEqual({
      url: '/0/false',
      params: {},
    })
    expect(resolveDataRequestUrl('/${params.id}', { id: '${globalThis.shouldNotRun()}' }).url).toBe(
      '/%24%7BglobalThis.shouldNotRun()%7D',
    )
  })

  it.each([undefined, null, '', '   ', {}, [], Number.NaN, Number.POSITIVE_INFINITY])(
    '占位参数为空或不可用时阻止发送：%s',
    (id) => expect(() => resolveDataRequestUrl('/${params.id}', { id })).toThrow('必须是非空'),
  )

  it('缺失参数、原型字段与不支持的参数表达式明确报错', () => {
    expect(() => resolveDataRequestUrl('/${params.id}', {})).toThrow('未配置')
    expect(() => resolveDataRequestUrl('/${params.constructor}', {})).toThrow('未配置')
    expect(() => resolveDataRequestUrl('/${params.id + 1}', { id: '1' })).toThrow('格式错误')
    expect(() => resolveDataRequestUrl('/${params["id"]}', { id: '1' })).toThrow('格式错误')
  })

  it('兼容旧的全局表达式与普通固定地址', () => {
    vi.stubGlobal('__requestUrlBase', '/legacy')
    expect(
      resolveDataRequestUrl('${globalThis.__requestUrlBase}/${params.id}', { id: '9' }),
    ).toEqual({
      url: '/legacy/9',
      params: {},
    })
    const params = { id: '9' }
    expect(resolveDataRequestUrl('/fixed', params)).toEqual({ url: '/fixed', params })
  })
})

describe('请求发送与交互传参联动', () => {
  it('结构化请求使用全局前置地址及旧参数别名优先级，并保留配置原值', async () => {
    network.mockResolvedValue({ data: { id: 12002 } })
    const config = createRequest({ requestQuery: { id: '12002' } })
    const before = JSON.stringify(config)
    await customizeHttpRequest(config, {
      ...globalConfig,
      requestOriginUrl: 'https://data.example',
    })
    expect(network).toHaveBeenCalledWith(
      'https://data.example/dim3d/model/info/12002',
      expect.objectContaining({ params: { filter: 'enabled' }, skipPlatformPath: true }),
    )
    expect(JSON.stringify(config)).toBe(before)
  })

  it('旧简单请求也解析占位，并且占位参数全部消费时不发送空查询参数表', async () => {
    network.mockResolvedValue({ data: { id: 12003 } })
    const config = createRequest({ requestQuery: { id: '12003' } })
    config.requestParams.Params = {}
    const result = await executeRequestConfig(config, undefined, undefined, globalConfig)
    expect(network).toHaveBeenCalledWith('/dim3d/model/info/12003', expect.any(Object))
    expect(network.mock.calls[0][1]).not.toHaveProperty('params')
    expect(result.source).toEqual([{ id: 12003 }])
  })

  it('公共请求复用同一解析，序列化恢复后交互修改查询参数会请求新的详情路径', async () => {
    network.mockResolvedValue({ data: { id: 12004 } })
    const config = createEmptyDataConfig()
    config.request = { type: 'ajax', config: createRequest() }
    delete config.requests
    // 用实际可选目标编码传参，再走持久化往返，验证不需要额外保存路径变量状态。
    const target = buildParameterTargetOptions(config).find((item) => item.label.endsWith(' · id'))!
    const updated = applyInteractionRequestParameters(config, [
      { targetProperty: target.value, value: 12004 },
    ])
    const restored = JSON.parse(JSON.stringify(updated.config)) as typeof config
    await executeComponentRequestByType(restored, [], globalConfig)
    expect(network).toHaveBeenLastCalledWith(
      '/dim3d/model/info/12004',
      expect.objectContaining({ params: { filter: 'enabled' } }),
    )
    config.request = { type: 'public', config: { publicRequestId: 'detail' } }
    await executeComponentRequestByType(
      config,
      [{ ...createRequest(), id: 'detail', name: '详情' }],
      globalConfig,
    )
    expect(network.mock.calls.at(-1)?.[0]).toBe('/dim3d/model/info/12001')
    expect((restored.request.config as AjaxRequestConfig).requestParams.Params.id).toBe('12004')
  })

  it('嵌入请求在地址替换后仍携带必需场景编号与宿主凭证', async () => {
    embeddedMode.mockReturnValue(true)
    authContext.set({
      accessToken: 'test-token',
      clientId: 'test-client',
      permissions: [],
      roles: [],
      platformType: 'tenant',
    })
    network.mockResolvedValue({ data: { id: 12001 } })
    await customizeHttpRequest(createRequest(), globalConfig, { sceneId: 'scene-1' })
    expect(network).toHaveBeenCalledWith(
      '/dim3d/model/info/12001',
      expect.objectContaining({
        params: { filter: 'enabled', sceneId: 'scene-1' },
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          ClientId: 'test-client',
        }),
      }),
    )
  })

  it.each([false, true])('缺参时所有发送入口都报错且不发出请求，简单请求：%s', async (simple) => {
    const config = createRequest()
    config.requestParams.Params = simple ? {} : { filter: 'enabled' }
    await expect(executeRequestConfig(config, undefined, undefined, globalConfig)).rejects.toThrow(
      '未配置',
    )
    expect(network).not.toHaveBeenCalled()
  })
})
