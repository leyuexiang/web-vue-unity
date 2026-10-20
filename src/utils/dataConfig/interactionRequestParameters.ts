import {
  getDataConfigRequests,
  syncDataConfigRequestMirror,
  type AjaxRequestConfig,
  type ComponentDataConfig,
  type PublicRequestConfig,
  type PublicRequestReferenceConfig,
} from '@/types/data-config'

/** 参数位置属于请求协议，编码后可隔离不同请求、不同分栏中的同名键。 */
type ParameterLocation =
  | 'Params'
  | 'Header'
  | 'form-data'
  | 'x-www-form-urlencoded'
  | 'json'
  | 'sql'
interface ParameterTarget {
  requestId: string
  /** 共享接口按接口编号合并写入；普通请求仍按组件内请求编号隔离。 */
  storageKey: string
  request: AjaxRequestConfig
  publicRequest?: PublicRequestConfig
  location: ParameterLocation
  path: string[]
  value: string
  label: string
}

export interface InteractionRequestParameterAssignment {
  /** 保存下拉选项的完整编码，不将旧的组件属性路径误当作请求参数。 */
  targetProperty: string
  value: unknown
}

/** 公共参数额外携带接口编号；旧三段动态参数编码保持原样，非法字段交由原入口安全忽略。 */
export const isPublicRequestParameterTarget = (value: string): boolean => {
  if (!value.trim().startsWith('[')) return false
  try {
    const decoded: unknown = JSON.parse(value)
    return Array.isArray(decoded) && decoded.length === 4 && typeof decoded[3] === 'string'
  } catch {
    return false
  }
}

/** 禁止原型链敏感字段参与赋值；仅处理配置中真实存在的自有键。 */
const isSafeKey = (key: string) =>
  Boolean(key.trim()) && !['__proto__', 'prototype', 'constructor'].includes(key)
/** 沿用项目目标运行环境支持的自有属性检查，兼容较早的脚本标准库。 */
const hasOwn = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)

/** 解析结构化请求体；模板或暂存的非法文本不产生虚构字段，也不阻断其它请求。 */
const parseJsonBody = (config: AjaxRequestConfig): unknown => {
  try {
    return JSON.parse(config.requestParams?.Body?.json || config.requestBody || '')
  } catch {
    return undefined
  }
}

/**
 * 单次遍历请求参数，生成界面与执行共用的目标索引。
 * GET 请求没有请求体；SQL 请求仅使用 sql 请求体；XML 是整段文本而非键值表。
 * JSON 路径保存为分段数组，避免含点号、方括号的业务键与嵌套路径混淆。
 */
const collectParameterTargets = (
  config: ComponentDataConfig | null | undefined,
  publicRequests: readonly PublicRequestConfig[] = [],
) => {
  const targets: ParameterTarget[] = []
  const jsonBodies = new Map<string, unknown>()
  const publicIndex = new Map(publicRequests.map((request) => [request.id, request]))
  for (const item of getDataConfigRequests(config)) {
    const publicRequest =
      item.request.type === 'public'
        ? publicIndex.get(
            (item.request.config as PublicRequestReferenceConfig).publicRequestId || '',
          )
        : undefined
    if (item.request.type !== 'ajax' && !publicRequest) continue
    const request = publicRequest ?? (item.request.config as AjaxRequestConfig)
    const storageKey = JSON.stringify([
      publicRequest ? 'public' : 'ajax',
      publicRequest?.id ?? item.id,
    ])
    const requestLabel = publicRequest
      ? `${item.name} · 公共接口「${publicRequest.name}」（全部绑定组件）`
      : item.name
    /** 将单个有效参数转成唯一选项，空占位键不进入可选择列表。 */
    const add = (location: ParameterLocation, path: string[]) => {
      const locationLabel =
        location === 'Params' ? '查询参数' : location === 'Header' ? '请求头' : '请求体'
      targets.push({
        requestId: item.id,
        storageKey,
        request,
        publicRequest,
        location,
        path,
        // 公共接口编号加入编码，防止组件改绑后旧事件误改另一个同名参数的接口。
        value: JSON.stringify(
          publicRequest ? [item.id, location, path, publicRequest.id] : [item.id, location, path],
        ),
        label: `${requestLabel} · ${locationLabel} · ${path.join('.')}`,
      })
    }
    for (const key of Object.keys({ ...request.requestParams?.Params, ...request.requestQuery })) {
      if (isSafeKey(key)) add('Params', [key])
    }
    for (const key of Object.keys({
      ...request.requestParams?.Header,
      ...request.requestHeaders,
    })) {
      // 请求体发送器会自动生成该同名头，不能展示一个赋值后会立即被覆盖的选项。
      const bodySetsContentType =
        request.requestContentType === 'sql' ||
        !['none', undefined].includes(request.requestParamsBodyType)
      if (isSafeKey(key) && !(key === 'Content-Type' && bodySetsContentType)) add('Header', [key])
    }
    if ((request.requestHttpType || 'GET') === 'GET') continue
    if (request.requestContentType === 'sql') {
      if (hasOwn(request.requestSQLContent || {}, 'sql')) add('sql', ['sql'])
      continue
    }
    const bodyType = request.requestParamsBodyType
    if (bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') {
      for (const key of Object.keys(request.requestParams?.Body?.[bodyType] || {})) {
        if (isSafeKey(key)) add(bodyType, [key])
      }
    } else if (bodyType === 'json') {
      // 同一公共接口可被目标的多个请求项引用，结构化请求体仅解析一次并累积全部赋值。
      if (!jsonBodies.has(storageKey)) jsonBodies.set(storageKey, parseJsonBody(request))
      const body = jsonBodies.get(storageKey)
      const pending = [{ value: body, path: [] as string[] }]
      // 用带游标的队列保留原键顺序，避免递归栈溢出与数组头部删除；每个键只处理一次。
      for (let cursor = 0; cursor < pending.length; cursor += 1) {
        const current = pending[cursor]
        if (!current.value || typeof current.value !== 'object') continue
        const entries = Object.entries(current.value)
        for (let index = 0; index < entries.length; index += 1) {
          const [key, value] = entries[index]
          if (!isSafeKey(key)) continue
          const path = [...current.path, key]
          add('json', path)
          if (value && typeof value === 'object') pending.push({ value, path })
        }
      }
    }
  }
  return { targets, jsonBodies }
}

/** 汇总动态请求及所绑定公共接口的参数；公共选项明确标识影响全部绑定组件。 */
export const buildParameterTargetOptions = (
  config: ComponentDataConfig | null | undefined,
  publicRequests: readonly PublicRequestConfig[] = [],
) =>
  collectParameterTargets(config, publicRequests).targets.map(({ value, label }) => ({
    value,
    label,
  }))

/** 仅复制将被改动的请求配置；参数表独立复制，原数据集与绑定不被无意义深拷贝。 */
const cloneRequest = (config: AjaxRequestConfig): AjaxRequestConfig => ({
  ...config,
  requestQuery: { ...config.requestQuery },
  requestHeaders: { ...config.requestHeaders },
  requestSQLContent: { ...config.requestSQLContent },
  requestParams: {
    Params: { ...config.requestParams?.Params },
    Header: { ...config.requestParams?.Header },
    Body: {
      json: config.requestParams?.Body?.json || '',
      xml: config.requestParams?.Body?.xml || '',
      'form-data': { ...config.requestParams?.Body?.['form-data'] },
      'x-www-form-urlencoded': { ...config.requestParams?.Body?.['x-www-form-urlencoded'] },
    },
  },
})

/**
 * 将一次动作中的赋值批量应用到新配置，然后返回需要重发的请求编号。
 * 只有仍然存在且仍然启用的参数能够写入；删除的请求、旧组件属性路径与缺失来源安全跳过。
 * 同一请求仅复制一次、请求体仅解析和序列化一次，上层提交后再统一重发，避免半更新请求。
 * 公共参数按共享编号合并后单独返回，由场景调度器保存会话覆盖；组件公共引用保持不变。
 */
export const applyInteractionRequestParameters = (
  config: ComponentDataConfig,
  assignments: InteractionRequestParameterAssignment[],
  publicRequests: readonly PublicRequestConfig[] = [],
): {
  config: ComponentDataConfig
  requestIds: string[]
  publicRequests?: PublicRequestConfig[]
} => {
  if (!assignments.length) return { config, requestIds: [] }
  const requests = getDataConfigRequests(config)
  const { targets, jsonBodies } = collectParameterTargets(config, publicRequests)
  const index = new Map(targets.map((target) => [target.value, target]))
  const changed = new Map<string, AjaxRequestConfig>()
  const changedJson = new Set<string>()
  const changedPublic = new Map<string, PublicRequestConfig>()
  const changedRequestIds = new Set<string>()
  for (const assignment of assignments) {
    if (assignment.value === undefined) continue
    const target = index.get(assignment.targetProperty)
    if (!target) continue
    let text: string
    let jsonValue: unknown
    try {
      // 参数表是字符串协议；结构化请求体则保留数值、布尔值、数组及对象的真实类型。
      text =
        typeof assignment.value === 'object'
          ? JSON.stringify(assignment.value)
          : String(assignment.value)
      if (text === undefined) continue
      if (target.location === 'json') jsonValue = JSON.parse(JSON.stringify(assignment.value))
    } catch {
      // 环状对象等不可序列化数据不能影响同一动作内其它有效参数。
      continue
    }
    const { requestId, storageKey, location, path } = target
    let jsonParent: Record<string, unknown> | undefined
    if (location === 'json') {
      let current = jsonBodies.get(storageKey)
      for (const segment of path.slice(0, -1)) {
        current =
          current && typeof current === 'object' && hasOwn(current, segment)
            ? (current as Record<string, unknown>)[segment]
            : undefined
      }
      if (!current || typeof current !== 'object' || !hasOwn(current, path[path.length - 1]))
        continue
      jsonParent = current as Record<string, unknown>
    }
    const request = changed.get(storageKey) || cloneRequest(target.request)
    changed.set(storageKey, request)
    if (target.publicRequest) changedPublic.set(storageKey, target.publicRequest)
    else changedRequestIds.add(requestId)
    const key = path[0]
    if (location === 'Params') {
      request.requestParams.Params[key] = text
      // 旧别名在真实发送时优先；同时覆盖两处，防止旧值重新盖掉本次传参。
      request.requestQuery![key] = text
    } else if (location === 'Header') {
      request.requestParams.Header[key] = text
      request.requestHeaders![key] = text
    } else if (location === 'json') {
      // 经序列化再解析隔离来源对象引用，避免目标配置后续编辑反向修改来源数据。
      jsonParent![path[path.length - 1]] = jsonValue
      changedJson.add(storageKey)
    } else if (location === 'sql') {
      request.requestSQLContent.sql = text
    } else {
      request.requestParams.Body[location][key] = text
    }
  }
  if (!changed.size) return { config, requestIds: [] }
  for (const requestId of changedJson) {
    const request = changed.get(requestId)!
    request.requestParams.Body.json = JSON.stringify(jsonBodies.get(requestId))
    request.requestBody = request.requestParams.Body.json
  }
  const nextConfig = {
    ...config,
    requests: requests.map((item) =>
      changedRequestIds.has(item.id)
        ? {
            ...item,
            request: { ...item.request, config: changed.get(JSON.stringify(['ajax', item.id]))! },
          }
        : item,
    ),
  }
  return {
    // 公共引用保持原样，运行时统一保存共享覆盖，绝不复制完整接口到组件持久化配置。
    config: changedRequestIds.size ? syncDataConfigRequestMirror(nextConfig) : config,
    requestIds: [...changedRequestIds],
    ...(changedPublic.size
      ? {
          publicRequests: [...changedPublic].map(([key, original]) => ({
            ...original,
            ...changed.get(key)!,
          })),
        }
      : {}),
  }
}
