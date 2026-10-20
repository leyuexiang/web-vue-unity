import { describe, expect, it } from 'vitest'
import {
  createDataConfigRequestItem,
  createEmptyDataConfig,
  type AjaxRequestConfig,
  type ComponentDataConfig,
  type PublicRequestConfig,
} from '@/types/data-config'
import {
  applyInteractionRequestParameters,
  buildParameterTargetOptions,
} from '../interactionRequestParameters'

/** 创建与请求配置弹窗一致的动态请求，默认查询参数 key 与请求头 key 故意同名。 */
const ajax = (overrides: Partial<AjaxRequestConfig> = {}): AjaxRequestConfig => ({
  requestHttpType: 'GET',
  requestInterval: 0,
  requestIntervalUnit: 'second',
  requestOriginUrl: '',
  requestUrl: '/test',
  requestContentType: 'default',
  requestParamsBodyType: 'none',
  requestParams: {
    Params: { key: 'old' },
    Header: { key: 'header' },
    Body: {
      'form-data': { form: 'old' },
      'x-www-form-urlencoded': { encoded: 'old' },
      json: '{"id":1,"active":true,"nested":{"a.b":2}}',
      xml: '<root><key>old</key></root>',
    },
  },
  requestSQLContent: { sql: 'SELECT 1' },
  ...overrides,
})

/** 多请求配置中保留静态请求，验证不会把静态数据字段混入请求参数。 */
const configOf = (...requests: AjaxRequestConfig[]): ComponentDataConfig => {
  const config = createEmptyDataConfig([{ ignored: 1 }])
  config.requests!.push(
    ...requests.map((request, index) =>
      createDataConfigRequestItem({
        id: `ajax-${index}`,
        name: `请求${index + 2}`,
        request: { type: 'ajax', config: request },
      }),
    ),
  )
  return config
}

/** 直接构造协议编码，测试不依赖选项生成器拼出预期值。 */
const target = (id: string, location: string, ...path: string[]) =>
  JSON.stringify([id, location, path])

describe('传参动作的目标请求参数', () => {
  it('公共选项携带接口身份，重复引用合并赋值，组件引用和公共定义均不改写', () => {
    const shared: PublicRequestConfig = {
      ...ajax({ requestHttpType: 'POST', requestParamsBodyType: 'json' }),
      id: 'shared',
      name: '共享查询',
    }
    const config = configOf(ajax())
    for (const id of ['public-a', 'public-b'])
      config.requests!.push(
        createDataConfigRequestItem({
          id,
          name: id,
          request: { type: 'public', config: { publicRequestId: shared.id } },
        }),
      )
    const before = JSON.stringify({ config, shared })
    const options = buildParameterTargetOptions(config, [shared])
    expect(
      options.find(
        (option) => option.value === JSON.stringify(['public-a', 'Params', ['key'], 'shared']),
      )?.label,
    ).toContain('全部绑定组件')
    const updated = applyInteractionRequestParameters(
      config,
      [
        { targetProperty: JSON.stringify(['public-a', 'json', ['id'], 'shared']), value: 0 },
        {
          targetProperty: JSON.stringify(['public-b', 'json', ['active'], 'shared']),
          value: false,
        },
        { targetProperty: JSON.stringify(['public-b', 'Params', ['key'], 'shared']), value: '' },
        { targetProperty: target('ajax-0', 'Params', 'key'), value: '独立' },
      ],
      [shared],
    )
    expect(updated.publicRequests).toHaveLength(1)
    expect(JSON.parse(updated.publicRequests![0].requestParams.Body.json)).toEqual({
      id: 0,
      active: false,
      nested: { 'a.b': 2 },
    })
    expect(updated.publicRequests![0].requestParams.Params.key).toBe('')
    expect(updated.requestIds).toEqual(['ajax-0'])
    expect(updated.config.requests![2]).toBe(config.requests![2])
    expect(JSON.stringify({ config, shared })).toBe(before)
  })

  it('公共接口删除或目标改绑后，原公共参数映射不能写入另一个接口', () => {
    const shared: PublicRequestConfig = { ...ajax(), id: 'new', name: '新接口' }
    const config = createEmptyDataConfig()
    config.request = { type: 'public', config: { publicRequestId: 'new' } }
    const assignments = [
      { targetProperty: JSON.stringify(['request-1', 'Params', ['key'], 'old']), value: 1 },
    ]
    expect(buildParameterTargetOptions(config, [])).toEqual([])
    expect(applyInteractionRequestParameters(config, assignments, [shared])).toEqual({
      config,
      requestIds: [],
    })
    expect(applyInteractionRequestParameters(config, assignments, [])).toEqual({
      config,
      requestIds: [],
    })
  })

  it('汇总全部动态请求并隔离同名查询参数与请求头，忽略未启用请求体', () => {
    const config = configOf(ajax(), ajax({ requestQuery: { extra: 'value', key: 'alias' } }))
    const options = buildParameterTargetOptions(config)
    expect(options.map((option) => option.value)).toEqual([
      target('ajax-0', 'Params', 'key'),
      target('ajax-0', 'Header', 'key'),
      target('ajax-1', 'Params', 'key'),
      target('ajax-1', 'Params', 'extra'),
      target('ajax-1', 'Header', 'key'),
    ])
    expect(options[0].label).toBe('请求2 · 查询参数 · key')
    expect(buildParameterTargetOptions(null)).toEqual([])
  })

  it('批量覆盖旧别名及当前参数，同请求多字段只产生一次重发，原配置保持不变', () => {
    const config = configOf(ajax({ requestQuery: { key: 'alias' } }), ajax())
    const before = JSON.stringify(config)
    const result = applyInteractionRequestParameters(config, [
      { targetProperty: target('ajax-0', 'Params', 'key'), value: 123 },
      { targetProperty: target('ajax-0', 'Header', 'key'), value: false },
    ])
    const request = result.config.requests![1].request.config as AjaxRequestConfig
    expect(request.requestQuery!.key).toBe('123')
    expect(request.requestParams.Params.key).toBe('123')
    expect(request.requestHeaders!.key).toBe('false')
    expect(result.requestIds).toEqual(['ajax-0'])
    expect(JSON.stringify(config)).toBe(before)
    expect(result.config.requests![2]).toBe(config.requests![2])
  })

  it('覆盖结构化请求体保留类型与特殊字符键，同名查询参数独立', () => {
    const config = configOf(ajax({ requestHttpType: 'POST', requestParamsBodyType: 'json' }))
    const result = applyInteractionRequestParameters(config, [
      { targetProperty: target('ajax-0', 'json', 'id'), value: 123 },
      { targetProperty: target('ajax-0', 'json', 'active'), value: false },
      { targetProperty: target('ajax-0', 'json', 'nested', 'a.b'), value: [4, 5] },
    ])
    const request = result.config.requests![1].request.config as AjaxRequestConfig
    expect(JSON.parse(request.requestParams.Body.json)).toEqual({
      id: 123,
      active: false,
      nested: { 'a.b': [4, 5] },
    })
    expect(request.requestParams.Params.key).toBe('old')
    expect(result.requestIds).toEqual(['ajax-0'])
  })

  it('只列出当前启用的表单分栏，切换请求体后旧映射安全失效', () => {
    const config = configOf(ajax({ requestHttpType: 'POST', requestParamsBodyType: 'form-data' }))
    expect(buildParameterTargetOptions(config).map((option) => option.value)).toContain(
      target('ajax-0', 'form-data', 'form'),
    )
    const result = applyInteractionRequestParameters(config, [
      { targetProperty: target('ajax-0', 'x-www-form-urlencoded', 'encoded'), value: 11 },
      { targetProperty: target('ajax-0', 'form-data', 'form'), value: 12 },
    ])
    const request = result.config.requests![1].request.config as AjaxRequestConfig
    expect(request.requestParams.Body['form-data'].form).toBe('12')
    expect(request.requestParams.Body['x-www-form-urlencoded'].encoded).toBe('old')
  })

  it('数据库语句模式覆盖普通请求体，文本请求体不虚构参数键', () => {
    const config = configOf(
      ajax({ requestHttpType: 'POST', requestContentType: 'sql', requestParamsBodyType: 'json' }),
      ajax({ requestHttpType: 'POST', requestParamsBodyType: 'xml' }),
    )
    const options = buildParameterTargetOptions(config)
    expect(options.some((option) => option.value === target('ajax-0', 'sql', 'sql'))).toBe(true)
    expect(
      options.some((option) => option.value.includes('"json"') || option.value.includes('"xml"')),
    ).toBe(false)
  })

  it('无效旧路径、请求删除、缺失来源及原型敏感键均不触发请求', () => {
    const config = configOf(ajax({ requestQuery: JSON.parse('{"__proto__":"bad"}') }))
    expect(
      buildParameterTargetOptions(config).some((option) => option.value.includes('__proto__')),
    ).toBe(false)
    const result = applyInteractionRequestParameters(config, [
      { targetProperty: 'userData.value', value: 1 },
      { targetProperty: target('removed', 'Params', 'key'), value: 1 },
      { targetProperty: target('ajax-0', 'Params', 'key'), value: undefined },
    ])
    expect(result).toEqual({ config, requestIds: [] })
    expect(result.config).toBe(config)
  })

  it('旧单请求镜像及请求体别名仍可覆盖，首项镜像同步到新协议', () => {
    const config = createEmptyDataConfig()
    config.request = {
      type: 'ajax',
      config: ajax({
        requestParamsBodyType: 'json',
        requestHttpType: 'POST',
        requestBody: '{"alias":1}',
      }),
    }
    ;(config.request.config as AjaxRequestConfig).requestParams.Body.json = ''
    const legacy = JSON.parse(JSON.stringify(config)) as ComponentDataConfig
    delete legacy.requests
    const result = applyInteractionRequestParameters(legacy, [
      { targetProperty: target('request-1', 'json', 'alias'), value: 'new' },
    ])
    expect((result.config.request.config as AjaxRequestConfig).requestParams.Body.json).toBe(
      '{"alias":"new"}',
    )
    expect(result.config.request).toBe(result.config.requests![0].request)
  })

  it('非法结构化文本和不可序列化来源不会破坏其它参数覆盖', () => {
    const config = configOf(ajax({ requestHttpType: 'POST', requestParamsBodyType: 'json' }))
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    const result = applyInteractionRequestParameters(config, [
      { targetProperty: target('ajax-0', 'json', 'id'), value: cyclic },
      { targetProperty: target('ajax-0', 'json', 'id'), value: BigInt(1) },
      { targetProperty: target('ajax-0', 'Params', 'key'), value: 0 },
    ])
    expect((result.config.requests![1].request.config as AjaxRequestConfig).requestQuery!.key).toBe(
      '0',
    )
    const invalid = ajax({ requestHttpType: 'POST', requestParamsBodyType: 'json' })
    invalid.requestParams.Body.json = '{unfinished'
    expect(buildParameterTargetOptions(configOf(invalid))).toHaveLength(2)
  })
})
