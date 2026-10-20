import type {
  SceneDependenciesPackage,
  SceneDependencyOwner,
  SceneFourPackageDocuments,
  ScenePackageJsonObject,
  ScenePackageJsonValue,
  SceneResourcePackage,
} from './sceneFourPackage'
import { cloneScenePackageJsonValue, isScenePackageRecord } from './sceneFourPackage'
import type { Dim3dSceneTemplateSaveScope } from '@/servers/manual/dim3d/api/scene'

type TemplateDomain = SceneDependencyOwner['domain']

interface TemplateTargetIndex {
  twoDInstanceIds: ReadonlySet<string>
  threeDInstanceIds: ReadonlySet<string>
}

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined

const getRecord = (value: unknown): ScenePackageJsonObject =>
  isScenePackageRecord(value) ? value : {}

const includesDomain = (saveScope: Dim3dSceneTemplateSaveScope, domain: TemplateDomain) =>
  saveScope === 'all' || (saveScope === 'twoD' ? domain === 'twoD' : domain === 'threeD')

/**
 * 判断结构化拥有者是否仍属于模板保留域。
 * 普通实例必须同时存在于所选槽位；植被、图层等聚合拥有者按域保留，避免误删其必要依赖。
 */
const isRetainedOwner = (
  ownerValue: unknown,
  saveScope: Dim3dSceneTemplateSaveScope,
  targets: TemplateTargetIndex,
): ownerValue is SceneDependencyOwner => {
  const owner = getRecord(ownerValue)
  const domain = owner.domain
  if ((domain !== 'twoD' && domain !== 'threeD') || !includesDomain(saveScope, domain)) {
    return false
  }
  if (owner.ownerType !== 'instance') return Boolean(getString(owner.ownerKey))
  const instanceId = getString(owner.instanceId)
  if (!instanceId) return false
  return domain === 'twoD'
    ? targets.twoDInstanceIds.has(instanceId)
    : targets.threeDInstanceIds.has(instanceId)
}

const isRetainedInstanceReference = (
  value: unknown,
  saveScope: Dim3dSceneTemplateSaveScope,
  targets: TemplateTargetIndex,
) => {
  const reference = getRecord(value)
  const domain = reference.domain
  if (domain !== 'twoD' && domain !== 'threeD') return true
  if (!includesDomain(saveScope, domain)) return false
  const instanceId = getString(reference.instanceId)
  if (!instanceId) return true
  return domain === 'twoD'
    ? targets.twoDInstanceIds.has(instanceId)
    : targets.threeDInstanceIds.has(instanceId)
}

/**
 * 清理行为及场景动作中的越界目标，但保留动作、条件和条件组本身。
 * 同时处理当前结构化字段与旧编辑器私有字段，防止 contentJson 在重新打开后恢复出越界引用。
 */
const sanitizeCrossDomainReferences = (
  value: unknown,
  saveScope: Dim3dSceneTemplateSaveScope,
  targets: TemplateTargetIndex,
): ScenePackageJsonValue => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeCrossDomainReferences(item, saveScope, targets))
  }
  /** 叶子值只校验当前节点，避免递归过程中对已校验子树反复深拷贝。 */
  if (!isScenePackageRecord(value)) return cloneScenePackageJsonValue(value)

  const result: ScenePackageJsonObject = {}
  for (const [key, rawValue] of Object.entries(value)) {
    if ((key === 'targets' || key === 'observationTargets') && Array.isArray(rawValue)) {
      result[key] = rawValue
        .filter((item) => isRetainedInstanceReference(item, saveScope, targets))
        .map((item) => sanitizeCrossDomainReferences(item, saveScope, targets))
      continue
    }
    if (key === 'actionTargetWidgetIds' && Array.isArray(rawValue)) {
      result[key] = includesDomain(saveScope, 'twoD')
        ? rawValue.filter(
            (item): item is string => typeof item === 'string' && targets.twoDInstanceIds.has(item),
          )
        : []
      continue
    }
    if (key === 'actionTargetWidgetGroupIds' && Array.isArray(rawValue)) {
      result[key] = includesDomain(saveScope, 'twoD')
        ? rawValue.filter((item): item is string => typeof item === 'string' && Boolean(item))
        : []
      continue
    }
    if (key === 'actionTargetUuid' || key === 'observationTargetUuid') {
      const instanceId = getString(rawValue)
      result[key] =
        instanceId &&
        includesDomain(saveScope, 'threeD') &&
        targets.threeDInstanceIds.has(instanceId)
          ? instanceId
          : ''
      continue
    }
    if (key === 'sourceModelValue' || key === 'targetModelValue') {
      const instanceId = getString(rawValue)
      result[key] =
        instanceId &&
        includesDomain(saveScope, 'threeD') &&
        targets.threeDInstanceIds.has(instanceId)
          ? instanceId
          : ''
      continue
    }
    result[key] = sanitizeCrossDomainReferences(rawValue, saveScope, targets)
  }

  /** 新结构化条件把模型引用放在 left/right 的 value 中，越界时仅清空当前一侧。 */
  if (value.kind === 'modelValue') {
    const instanceId = getString(value.value)
    if (
      !instanceId ||
      !includesDomain(saveScope, 'threeD') ||
      !targets.threeDInstanceIds.has(instanceId)
    ) {
      result.value = null
    }
  }
  return result
}

/** 数据映射只移除带明确结构化越界目标的映射项；旧格式无归属字段时保留原配置。 */
const sanitizeDataBindingMappings = (
  value: ScenePackageJsonValue,
  saveScope: Dim3dSceneTemplateSaveScope,
  targets: TemplateTargetIndex,
): ScenePackageJsonValue => {
  const binding = getRecord(value)
  const mappingConfig = getRecord(binding.mappingConfig)
  const mappings = Array.isArray(mappingConfig.bindings) ? mappingConfig.bindings : undefined
  if (!mappings) return value
  return {
    ...binding,
    mappingConfig: {
      ...mappingConfig,
      bindings: mappings.filter((mappingValue) => {
        const mapping = getRecord(mappingValue)
        const reference = mapping.target ?? mapping.owner
        return isRetainedInstanceReference(reference, saveScope, targets)
      }),
    },
  }
}

const filterOwnedDependencies = (
  values: readonly ScenePackageJsonValue[],
  saveScope: Dim3dSceneTemplateSaveScope,
  targets: TemplateTargetIndex,
  sanitizeReferences = false,
) =>
  values.flatMap((value) => {
    const record = getRecord(value)
    if (!isRetainedOwner(record.owner, saveScope, targets)) return []
    const cloned = cloneScenePackageJsonValue(record)
    const sanitized = sanitizeReferences
      ? sanitizeCrossDomainReferences(cloned, saveScope, targets)
      : sanitizeDataBindingMappings(cloned, saveScope, targets)
    return [sanitized]
  })

const collectResourceRefKeys = (documents: SceneFourPackageDocuments) => {
  const result = new Set<string>()
  const append = (value: unknown) => {
    const record = getRecord(value)
    const keys = Array.isArray(record.resourceRefKeys) ? record.resourceRefKeys : []
    keys.forEach((key) => {
      const normalized = getString(key)
      if (normalized) result.add(normalized)
    })
  }
  documents.threeD.objects.forEach(append)
  documents.threeD.components.forEach(append)
  documents.threeD.layers.forEach(append)
  documents.twoD.components.forEach(append)
  return result
}

/** 资源按最终消费者闭包裁剪；共享资源只保留仍有效的拥有者。 */
const filterResources = (
  resources: readonly SceneResourcePackage[],
  saveScope: Dim3dSceneTemplateSaveScope,
  targets: TemplateTargetIndex,
  referencedResourceKeys: ReadonlySet<string>,
): SceneResourcePackage[] =>
  resources.flatMap((resource) => {
    const owners = Array.isArray(resource.owners)
      ? resource.owners.filter((owner) => isRetainedOwner(owner, saveScope, targets))
      : []
    if (!owners.length && !referencedResourceKeys.has(resource.resourceKey)) return []
    return [
      {
        ...(cloneScenePackageJsonValue(resource) as SceneResourcePackage),
        owners: owners.map((owner) => cloneScenePackageJsonValue(owner) as SceneDependencyOwner),
      },
    ]
  })

const collectPublicRequestKeys = (bindings: readonly ScenePackageJsonValue[]) => {
  const result = new Set<string>()
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!isScenePackageRecord(value)) return
    for (const [key, child] of Object.entries(value)) {
      if (key === 'publicRequestKey' || key === 'publicRequestId') {
        const requestKey = getString(child)
        if (requestKey) result.add(requestKey)
      } else {
        visit(child)
      }
    }
  }
  bindings.forEach(visit)
  return result
}

const getPublicRequestKey = (value: ScenePackageJsonValue) => {
  const request = getRecord(value)
  return (
    getString(request.publicRequestKey) ?? getString(request.requestKey) ?? getString(request.id)
  )
}

const requiresRequestGlobalConfig = (bindings: readonly ScenePackageJsonValue[]) =>
  bindings.some((value) => {
    const source = getRecord(getRecord(value).source)
    return source.type !== 'static'
  })

const createEmptyThreeDPackage = (): SceneFourPackageDocuments['threeD'] => ({
  baseConfig: {},
  objects: [],
  components: [],
  layers: [],
  streaming: { groups: [], chunks: [], chunkTargets: [] },
  cameraPaths: [],
})

const createEmptyTwoDPackage = (): SceneFourPackageDocuments['twoD'] => ({
  canvas: {},
  components: [],
  layerTree: [],
})

/**
 * 模板保留植被的可编辑定义，但不能携带来源场景专属的发布产物。
 * 规则、物种、图层和显示参数继续留在 threeD.vegetation；发布引用、图层瓦片引用必须移除，
 * 否则模板应用到新场景后会继续指向来源 sceneId，且无法从新场景的发布历史安全解析地址。
 */
const createPortableTemplateThreeDPackage = (
  source: SceneFourPackageDocuments['threeD'],
): SceneFourPackageDocuments['threeD'] => {
  const cloned = cloneScenePackageJsonValue(source) as unknown as SceneFourPackageDocuments['threeD']
  const vegetation = getRecord(cloned.vegetation)
  if (!Object.keys(vegetation).length) return cloned

  const { publication: _publication, ...authoringDefinition } = vegetation
  const layers = Array.isArray(vegetation.layers)
    ? vegetation.layers.map((value) => {
        const layer = getRecord(value)
        const {
          manifestAsset: _manifestAsset,
          tilesetAsset: _tilesetAsset,
          densityTilesetAssets: _densityTilesetAssets,
          deltaAsset: _deltaAsset,
          ...authoringLayer
        } = layer
        return authoringLayer
      })
    : []
  cloned.vegetation = { ...authoringDefinition, layers }
  return cloned
}

/**
 * 模板不携带任何植被资源依赖：物种模型、清单和瓦片都由目标场景的植被发布资源接口按版本返回。
 * 资源编号和拥有者判断兼容旧模板数据，避免历史资源在另存模板时重新进入 dependencies.resources。
 */
const isPortableTemplateResource = (resource: SceneResourcePackage) => {
  const usageType = getString(resource.usageType)
  if (usageType?.startsWith('vegetation-')) return false

  const resourceKey = getString(resource.resourceKey) ?? getString(resource.assetId)
  if (
    resourceKey?.startsWith('vegetation-manifest:') ||
    resourceKey?.startsWith('vegetation-tileset:') ||
    resourceKey?.startsWith('vegetation-generation-preview:')
  ) {
    return false
  }

  return resource.owners.every((owner) => {
    const ownerType = getRecord(owner).ownerType
    return ownerType !== 'vegetation-system' && ownerType !== 'vegetation-layer'
  })
}

/**
 * 按模板保存范围生成独立四包工作副本。
 * `all` 保留完整双域；`twoD` 和 `threeD` 会清空未选择槽位、过滤拥有者依赖、重算资源与公共接口闭包，
 * 并对保留行为中的越界引用做最小清理。传入文档不会被修改。
 */
export const filterSceneFourPackageDocumentsForTemplate = (
  documents: SceneFourPackageDocuments,
  saveScope: Dim3dSceneTemplateSaveScope,
): SceneFourPackageDocuments => {
  /** 植被始终属于三维包；即使保存全部域，也先转换为可跨场景复用的三维模板定义。 */
  const portableThreeD = createPortableTemplateThreeDPackage(documents.threeD)
  if (saveScope === 'all') {
    const cloned = cloneScenePackageJsonValue({
      ...documents,
      threeD: portableThreeD,
    }) as unknown as SceneFourPackageDocuments
    cloned.dependencies.resources = cloned.dependencies.resources.filter(isPortableTemplateResource)
    return cloned
  }

  const threeD = saveScope === 'twoD' ? createEmptyThreeDPackage() : portableThreeD
  const twoD = saveScope === 'threeD' ? createEmptyTwoDPackage() : documents.twoD
  const targets: TemplateTargetIndex = {
    twoDInstanceIds: new Set(twoD.components.map((component) => component.instanceId)),
    threeDInstanceIds: new Set(
      [...threeD.objects, ...threeD.components].map((target) => target.instanceId),
    ),
  }
  const selectedDocuments = { ...documents, threeD, twoD }
  const dataBindings = filterOwnedDependencies(
    documents.dependencies.dataBindings,
    saveScope,
    targets,
  )
  const behaviors = filterOwnedDependencies(
    documents.dependencies.behaviors,
    saveScope,
    targets,
    true,
  )
  const deviceBindings = filterOwnedDependencies(
    documents.dependencies.deviceBindings,
    saveScope,
    targets,
  )
  const referencedResourceKeys = collectResourceRefKeys(selectedDocuments)
  const publicRequestKeys = collectPublicRequestKeys(dataBindings)
  const publicRequests = documents.scene.publicRequests.filter((request) => {
    const requestKey = getPublicRequestKey(request)
    return Boolean(requestKey && publicRequestKeys.has(requestKey))
  })
  const dependencies: SceneDependenciesPackage = {
    resources: filterResources(
      documents.dependencies.resources.filter(isPortableTemplateResource),
      saveScope,
      targets,
      referencedResourceKeys,
    ),
    dataBindings,
    behaviors,
    deviceBindings,
  }

  return {
    scene: {
      ...documents.scene,
      requestGlobalConfig: requiresRequestGlobalConfig(dataBindings)
        ? (cloneScenePackageJsonValue(
            documents.scene.requestGlobalConfig,
          ) as ScenePackageJsonObject)
        : {},
      publicRequests: cloneScenePackageJsonValue(publicRequests) as ScenePackageJsonValue[],
      sceneActions: documents.scene.sceneActions.map((action) =>
        sanitizeCrossDomainReferences(cloneScenePackageJsonValue(action), saveScope, targets),
      ),
    },
    threeD: cloneScenePackageJsonValue(threeD) as unknown as SceneFourPackageDocuments['threeD'],
    twoD: cloneScenePackageJsonValue(twoD) as unknown as SceneFourPackageDocuments['twoD'],
    dependencies,
  }
}
