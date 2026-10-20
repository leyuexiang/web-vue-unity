import {
  getDim3dPublishedDependencies,
  getDim3dPublishedSceneBasic,
  getDim3dPublishedThreeD,
  getDim3dPublishedTwoD,
  type Dim3dParsedPublishedFragment,
  type Dim3dPublishedFragment,
  type Dim3dPublishedFragmentListResponse,
  type Dim3dPublishedResourceMeta,
  type Dim3dVegetationRuntimeResourcesData,
} from '@/servers/manual/dim3d/api/sceneRuntime'

/** 发布运行态单次批量请求的上限；相机移动不会触发区块描述接口。 */
const DEFAULT_BATCH_SIZE = 100

export interface SceneRuntimeFragmentLoaderApi {
  getSceneBasic: typeof getDim3dPublishedSceneBasic
  getThreeD: typeof getDim3dPublishedThreeD
  getTwoD: typeof getDim3dPublishedTwoD
  getDependencies: typeof getDim3dPublishedDependencies
  /** 公开预览专用植被资源接口；编辑态或旧测试数据源可以不提供。 */
  getVegetationResources?: (
    publicationId: string,
    resourceKeys?: readonly string[],
    options?: Record<string, unknown>,
  ) => Promise<Dim3dVegetationRuntimeResourcesData>
}

export interface SceneRuntimeFragmentLoaderOptions {
  /** 发布接口返回的不可变 publicationId，禁止传入草稿 sceneId。 */
  publicationId: string
  maxBatchSize?: number
  api?: Partial<SceneRuntimeFragmentLoaderApi>
}

export interface SceneRuntimeInitialFragments {
  sceneBasic: Dim3dParsedPublishedFragment
  threeD: Dim3dParsedPublishedFragment
  twoD: Dim3dParsedPublishedFragment
  /** 发布植被资源接口返回的聚合描述，只在当前预览会话内存中使用。 */
  vegetationResources?: Dim3dVegetationRuntimeResourcesData
}

export interface SceneRuntimeActivatedFragments {
  /** 实例依赖接口返回的统一片段，内部可同时包含资源、数据绑定、行为和设备绑定。 */
  behaviors: readonly Dim3dParsedPublishedFragment[]
  /** 发布级资源元数据字典；模型相对路径和图片地址均由同一次实例依赖响应提供。 */
  resourceMetas: readonly Dim3dPublishedResourceMeta[]
}

export interface SceneRuntimeFragmentLoader {
  /** 首次进入时读取完整场景基础包、三维包和二维包。 */
  loadInitial: () => Promise<SceneRuntimeInitialFragments>
  /** 目标首次激活后读取资源描述、数据绑定、状态、事件和设备绑定；同一目标在会话内只请求一次。 */
  activateTargets: (targetIds: readonly string[]) => Promise<SceneRuntimeActivatedFragments>
  getBehavior: (key: string) => Dim3dParsedPublishedFragment | undefined
  dispose: () => void
}

type JsonRecord = Record<string, unknown>
type FragmentRequest = (keys: readonly string[]) => Promise<Dim3dPublishedFragmentListResponse>
type FragmentRequestKeyResolver = (fragment: Dim3dParsedPublishedFragment) => readonly string[]

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const normalizeKeys = (values: readonly string[]): string[] => [
  ...new Set(
    values
      .filter((value) => typeof value === 'string' && value.trim())
      .map((value) => value.trim()),
  ),
]

const trimString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

/**
 * 从已发布三维包提取物种模型资源编号，供预览资源接口查询模型地址。
 * 发布清单、根瓦片、图层瓦片和密度入口由 publicationId + ticket 唯一确定，
 * 后端从发布快照读取，不作为 resourceKeys 重复传入。
 */
const collectVegetationResourceKeys = (content: unknown): string[] => {
  if (!isRecord(content) || !isRecord(content.vegetation)) return []
  const vegetation = content.vegetation
  if (vegetation.enabled === false || !isRecord(vegetation.publication)) return []
  const keys: string[] = []
  const appendAsset = (value: unknown) => {
    if (!isRecord(value)) return
    const id = trimString(value.id) ?? trimString(value.assetId) ?? trimString(value.resourceKey)
    if (id) keys.push(id)
    const variants = Array.isArray(value.modelLodVariants) ? value.modelLodVariants : []
    variants.forEach((variant) => appendAsset(variant))
  }

  const speciesCatalog = Array.isArray(vegetation.speciesCatalog) ? vegetation.speciesCatalog : []
  speciesCatalog.forEach((speciesValue) => {
    if (!isRecord(speciesValue)) return
    appendAsset(speciesValue.modelAsset)
  })
  return normalizeKeys(keys)
}

/**
 * 三个完整包的 JSON 原文偶尔把长整型 instanceId 输出为 JSON 数字。
 * JavaScript 在 JSON.parse 前必须先把这类字段改为字符串，否则超过安全整数范围后会丢失低位，
 * 进而导致实例依赖接口查询不到对应实例。这里只处理明确命名为 instanceId 的整数值，不改写
 * 图表数据、坐标和其他普通数字。
 */
const preserveLongInstanceIds = (contentJson: string): string =>
  contentJson.replace(
    /("instanceId"\s*:\s*)(-?\d{16,})(?=\s*[,}])/g,
    (_match, prefix: string, id: string) => `${prefix}"${id}"`,
  )

const parseFragment = (
  fragment: Dim3dPublishedFragment,
  label: string,
  publicationId: string,
): Dim3dParsedPublishedFragment => {
  if (fragment.publicationId && fragment.publicationId !== publicationId) {
    throw new Error(`${label} 的 publicationId 与当前运行态不一致。`)
  }
  if (!fragment.fragmentKey?.trim()) throw new Error(`${label} 缺少 fragmentKey。`)
  if (typeof fragment.contentJson !== 'string' || !fragment.contentJson.trim()) {
    throw new Error(`${label} 缺少 contentJson。`)
  }
  try {
    return {
      ...fragment,
      fragmentKey: fragment.fragmentKey.trim(),
      content: JSON.parse(preserveLongInstanceIds(fragment.contentJson)),
    }
  } catch (error) {
    throw new Error(`${label} 的 contentJson 不是合法 JSON：${String(error)}`)
  }
}

const assertSuccess = (response: { code?: number; msg?: string }, label: string) => {
  if (response.code !== undefined && response.code !== 200) {
    throw new Error(response.msg?.trim() || `${label} 请求失败，业务码：${String(response.code)}`)
  }
}

const indexFragments = (
  fragments: readonly Dim3dPublishedFragment[],
  label: string,
  publicationId: string,
): Map<string, Dim3dParsedPublishedFragment> => {
  const index = new Map<string, Dim3dParsedPublishedFragment>()
  fragments.forEach((fragment, itemIndex) => {
    const parsed = parseFragment(fragment, `${label}[${itemIndex}]`, publicationId)
    if (index.has(parsed.fragmentKey!)) {
      throw new Error(`${label} 存在重复 fragmentKey：${parsed.fragmentKey}`)
    }
    index.set(parsed.fragmentKey!, parsed)
  })
  return index
}

/**
 * 判断实例依赖逐项结果是否明确失败。
 *
 * 新接口允许同一批次同时返回成功、无权限、不存在和依赖非法等结果。失败项虽然也可能携带
 * instanceId，但不能因此进入会话缓存，否则目标重新挂载时将永远无法重试。只识别接口层明确的
 * 失败标记，避免把业务依赖正文中的普通状态字段误判为请求失败。
 */
const isDependencyResultFailure = (content: JsonRecord): boolean => {
  if (content.success === false) return true
  const resultCode = trimString(content.resultCode)?.toUpperCase()
  if (resultCode && resultCode !== 'OK' && resultCode !== 'SUCCESS') return true
  const status = trimString(content.status)?.toUpperCase()
  return Boolean(
    status &&
      [
        'NO_PERMISSION',
        'NOT_FOUND',
        'EXPIRED',
        'INVALID',
        'INVALID_DEPENDENCY',
        'FAILED',
        'ERROR',
      ].includes(status),
  )
}

/**
 * 从成功的实例依赖记录恢复本次请求键。
 *
 * 完整职责接口通常在内容根级返回 instanceId；兼容旧分片时允许从 owner 或
 * `instance:{instanceId}` 分片键读取。无法确认归属的记录不参与缓存，防止把批次结果错误地
 * 复制给所有请求实例，并让漏项在下一次激活时继续重试。
 */
const resolveDependencyRequestKeys: FragmentRequestKeyResolver = (fragment) => {
  const content = isRecord(fragment.content) ? fragment.content : undefined
  if (content && isDependencyResultFailure(content)) return []
  const owner = content && isRecord(content.owner) ? content.owner : undefined
  const instanceId = trimString(content?.instanceId) ?? trimString(owner?.instanceId)
  if (instanceId) return [instanceId]
  const fragmentKey = trimString(fragment.fragmentKey)
  return fragmentKey?.startsWith('instance:') ? [fragmentKey.slice('instance:'.length)] : []
}

const chunk = <T>(values: readonly T[], size: number): T[][] => {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size) as T[])
  }
  return result
}

/**
 * 创建发布运行态分片协调器。
 * 该模块只持有不可变 JSON、缓存和请求代次，不依赖编辑器 Store，也不创建引擎对象。
 */
export const createSceneRuntimeFragmentLoader = (
  options: SceneRuntimeFragmentLoaderOptions,
): SceneRuntimeFragmentLoader => {
  const publicationId = options.publicationId.trim()
  if (!publicationId) throw new Error('publicationId 必须是非空字符串。')
  const batchSize = Math.max(1, Math.floor(options.maxBatchSize ?? DEFAULT_BATCH_SIZE))
  const api: SceneRuntimeFragmentLoaderApi = {
    getSceneBasic: getDim3dPublishedSceneBasic,
    getThreeD: getDim3dPublishedThreeD,
    getTwoD: getDim3dPublishedTwoD,
    getDependencies: getDim3dPublishedDependencies,
    ...options.api,
  }
  const behaviorCache = new Map<string, Dim3dParsedPublishedFragment>()
  /** 请求键与响应分片键可不同，保存请求键到响应集合的别名。 */
  const behaviorResultCache = new Map<string, readonly Dim3dParsedPublishedFragment[]>()
  const behaviorLoaded = new Set<string>()
  const behaviorInflight = new Map<string, Promise<readonly Dim3dParsedPublishedFragment[]>>()
  /**
   * 实例依赖接口每次会返回发布级资源字典。按 assetId 合并到会话缓存后，后续目标激活只读取
   * 内存，不需要再次调用模型详情或对象存储接口。
   */
  const resourceMetaCache = new Map<string, Dim3dPublishedResourceMeta>()
  let initialPromise: Promise<SceneRuntimeInitialFragments> | undefined
  let generation = 0
  let disposed = false

  const loadByKeys = async (
    keys: readonly string[],
    cache: Map<string, Dim3dParsedPublishedFragment>,
    loaded: Set<string>,
    requestResultCache: Map<string, readonly Dim3dParsedPublishedFragment[]>,
    inflight: Map<string, Promise<readonly Dim3dParsedPublishedFragment[]>>,
    request: FragmentRequest,
    label: string,
    resolveRequestKeys?: FragmentRequestKeyResolver,
  ): Promise<readonly Dim3dParsedPublishedFragment[]> => {
    const unique = normalizeKeys(keys)
    const missing = unique.filter((key) => !loaded.has(key) && !inflight.has(key))
    const running = unique.filter((key) => inflight.has(key)).map((key) => inflight.get(key)!)
    if (missing.length) {
      const requestGeneration = generation
      const task = (async () => {
        const responses = await Promise.all(chunk(missing, batchSize).map((part) => request(part)))
        const received = responses.flatMap((response) => {
          assertSuccess(response, label)
          return response.data ?? []
        })
        const parsed = received.map((fragment, index) =>
          parseFragment(fragment, `${label}[${index}]`, publicationId),
        )
        if (requestGeneration !== generation || disposed) throw new Error('运行态分片请求已失效。')
        indexFragments(parsed, label, publicationId)
        if (!resolveRequestKeys) {
          parsed.forEach((fragment) => cache.set(fragment.fragmentKey!, fragment))
          // 资源地址解析结果按资源键缓存；接口未返回逐项归属时保留整批结果供本会话复用。
          missing.forEach((key) => {
            loaded.add(key)
            requestResultCache.set(key, parsed)
          })
          return parsed
        }

        /**
         * 新实例依赖接口必须按实际返回的 instanceId 分区。只有能明确归属到本次
         * 请求且未显式失败的记录才标记为已加载；漏项和失败项不写缓存，后续可独立重试。
         */
        const missingSet = new Set(missing)
        const fragmentsByRequestKey = new Map<string, Dim3dParsedPublishedFragment[]>()
        parsed.forEach((fragment) => {
          resolveRequestKeys(fragment).forEach((key) => {
            if (!missingSet.has(key)) return
            const fragments = fragmentsByRequestKey.get(key) ?? []
            fragments.push(fragment)
            fragmentsByRequestKey.set(key, fragments)
          })
        })
        const cacheableFragments = new Map<string, Dim3dParsedPublishedFragment>()
        fragmentsByRequestKey.forEach((fragments, key) => {
          loaded.add(key)
          requestResultCache.set(key, fragments)
          fragments.forEach((fragment) => cacheableFragments.set(fragment.fragmentKey!, fragment))
        })
        cacheableFragments.forEach((fragment, key) => cache.set(key, fragment))
        return [...cacheableFragments.values()]
      })()
      missing.forEach((key) => inflight.set(key, task))
      task.finally(() => missing.forEach((key) => inflight.delete(key))).catch(() => undefined)
      running.push(task)
    }
    if (!running.length) {
      return unique.flatMap(
        (key) => requestResultCache.get(key) ?? (cache.get(key) ? [cache.get(key)!] : []),
      )
    }
    const batches = await Promise.all(running)
    const result = new Map<string, Dim3dParsedPublishedFragment>()
    unique.forEach((key) => {
      ;(requestResultCache.get(key) ?? (cache.get(key) ? [cache.get(key)!] : [])).forEach((item) =>
        result.set(item.fragmentKey!, item),
      )
    })
    batches.flat().forEach((item) => result.set(item.fragmentKey!, item))
    return [...result.values()]
  }

  const loadInitial = async (): Promise<SceneRuntimeInitialFragments> => {
    if (disposed) throw new Error('运行态分片协调器已释放。')
    if (!initialPromise) {
      const requestGeneration = generation
      initialPromise = (async () => {
        /**
         * 新运行态首屏一次取得三个完整职责包。后端只负责按 publicationId 原样返回四包中的
         * sceneJson、threeDJson、twoDJson，前端在组装边界解析；GIS 与 local3d 不再分叉请求。
         */
        const [sceneBasicResponse, threeDResponse, twoDResponse] = await Promise.all([
          api.getSceneBasic(publicationId),
          api.getThreeD(publicationId),
          api.getTwoD(publicationId),
        ])
        // 组件卸载后优先终止本次结果，避免把迟到响应继续解析成已失效的运行态快照。
        if (requestGeneration !== generation || disposed) throw new Error('运行态首屏请求已失效。')
        assertSuccess(sceneBasicResponse, '场景基础信息')
        assertSuccess(threeDResponse, '三维场景信息')
        assertSuccess(twoDResponse, '二维画布信息')
        if (!sceneBasicResponse.data || !threeDResponse.data || !twoDResponse.data) {
          throw new Error('运行态首屏缺少场景基础、三维或二维数据包。')
        }
        const sceneBasic = parseFragment(sceneBasicResponse.data, '场景基础信息', publicationId)
        const threeD = parseFragment(threeDResponse.data, '三维场景信息', publicationId)
        const twoD = parseFragment(twoDResponse.data, '二维画布信息', publicationId)
        const vegetationResourceKeys = collectVegetationResourceKeys(threeD.content)
        /** 只有存在已发布植被且数据源提供该能力时才请求资源，普通场景不增加额外网络请求。 */
        const vegetationResources =
          vegetationResourceKeys.length > 0 && api.getVegetationResources
            ? await api.getVegetationResources(publicationId, vegetationResourceKeys)
            : undefined
        return { sceneBasic, threeD, twoD, vegetationResources }
      })().catch((error) => {
        initialPromise = undefined
        throw error
      })
    }
    return initialPromise
  }

  const activateTargets = async (
    targetIds: readonly string[],
  ): Promise<SceneRuntimeActivatedFragments> => {
    if (disposed) return { behaviors: [], resourceMetas: [] }
    await loadInitial()
    const ids = normalizeKeys(targetIds)
    /**
     * 依赖接口按 instanceId 批量返回资源描述和其他实例依赖。资源加载器在消费这些
     * `resourceKey` 时完成运行时解析，本协调器不得再发起独立 assetsResolve 请求。
     */
    const behaviors = await loadByKeys(
      ids,
      behaviorCache,
      behaviorLoaded,
      behaviorResultCache,
      behaviorInflight,
      async (keys) => {
        const response = await api.getDependencies(publicationId, keys)
        response.resourceMetas?.forEach((meta) => resourceMetaCache.set(meta.assetId, meta))
        return response
      },
      '实例依赖',
      resolveDependencyRequestKeys,
    )
    return { behaviors, resourceMetas: [...resourceMetaCache.values()] }
  }

  return {
    loadInitial,
    activateTargets,
    getBehavior: (key) => behaviorCache.get(key),
    dispose: () => {
      if (disposed) return
      disposed = true
      generation += 1
      initialPromise = undefined
      behaviorCache.clear()
      behaviorResultCache.clear()
      behaviorLoaded.clear()
      behaviorInflight.clear()
      resourceMetaCache.clear()
    },
  }
}
