import type {
  AssetRef,
  ModelAssetKind,
  ModelMaterialAlphaMode,
  ModelMaterialProfile,
  ModelMaterialProfileState,
  ModelMaterialRule,
  ModelMaterialRuleSource,
} from './types'
import type { GltfMaterialInspectionResult, GltfMaterialInspectionItem } from './gltfMaterialInspection'

/** 裁切透明规则未指定阈值时的统一默认值，与既有叶片预览保持一致。 */
export const DEFAULT_MODEL_MATERIAL_ALPHA_CUTOFF = 0.1

/**
 * 根据材质诊断结果生成推荐的材质档案。
 *
 * - 显式声明的材质原样写入，source = 'declared'
 * - 检测到二值透明的候选材质写入推荐值，source = 'detected'
 * - 全部是显式声明且无需修复时，state = 'ready'
 * - 有检测修复的候选材质时，state = 'needs-confirmation'，等人工确认
 */
export function buildRecommendedMaterialProfile(
  inspection: GltfMaterialInspectionResult,
  options?: { defaultAlphaCutoff?: number },
): ModelMaterialProfile | null {
  const cutoff = options?.defaultAlphaCutoff ?? DEFAULT_MODEL_MATERIAL_ALPHA_CUTOFF
  const rules: ModelMaterialRule[] = []
  let hasDetected = false

  for (const item of inspection.materials) {
    const selector: ModelMaterialRule['selector'] = { materialIndex: item.materialIndex }
    if (item.materialName) selector.materialName = item.materialName

    if (item.autoFixCandidate) {
      // 自动检测到的二值透明：推荐改为裁切 + 双面
      rules.push({
        selector,
        alphaMode: 'mask',
        alphaCutoff: item.declaredAlphaCutoff ?? cutoff,
        doubleSided: true,
        source: 'detected',
      })
      hasDetected = true
    } else if (item.declaredAlphaMode !== 'OPAQUE') {
      // 显式声明的透明材质，原样归档用于回显
      rules.push({
        selector,
        alphaMode: mapAlphaModeToPlatform(item.declaredAlphaMode),
        alphaCutoff: item.declaredAlphaCutoff,
        doubleSided: item.declaredDoubleSided,
        source: 'declared',
      })
    }
  }

  if (rules.length === 0) return null

  const state: ModelMaterialProfileState = hasDetected ? 'needs-confirmation' : 'ready'

  return {
    version: 1,
    state,
    rules,
  }
}

/** 从 glTF 原始 alphaMode 映射到平台统一枚举。 */
function mapAlphaModeToPlatform(mode: 'OPAQUE' | 'MASK' | 'BLEND'): ModelMaterialAlphaMode {
  if (mode === 'MASK') return 'mask'
  if (mode === 'BLEND') return 'blend'
  return 'opaque'
}
/**
 * 获取应由 Runtime 加载的模型地址。
 *
 * 只有上传后处理已经确认生成可用派生资产时才替换原地址；待人工确认、预检失败或派生地址非法时始终
 * 回退源 `AssetRef.url`，确保材质诊断不会阻断模型打开。
 */
export function resolveModelMaterialAssetUrl(asset: Readonly<AssetRef>): string {
  const derivedUrl = asset.materialProfile?.state === 'ready'
    ? asset.materialProfile.derivedAsset?.url.trim()
    : ''
  return derivedUrl || asset.url
}

/**
 * 为一个已知 GLTF 材质定位最匹配的统一规则。
 *
 * 材质索引优先于名称，避免同名材质误匹配；即使拿到了索引没有命中时继续回退到名称兼容
 * Three Runtime。规则数组通常很小且仅在模型加载、实例化等低频边界调用，不在渲染循环建立额外索引。
 */
export function findModelMaterialRule(
  profile: ModelMaterialProfile | undefined,
  materialIndex: number | undefined,
  materialName: string | undefined,
): ModelMaterialRule | null {
  if (!profile || profile.state === 'unavailable') return null
  const normalizedName = materialName?.trim()
  let matchedByName: ModelMaterialRule | null = null
  for (const rule of profile.rules) {
    if (materialIndex !== undefined && rule.selector.materialIndex === materialIndex) return rule
    if (!matchedByName && normalizedName && rule.selector.materialName?.trim() === normalizedName) {
      matchedByName = rule
    }
  }
  return matchedByName
}

/** 将统一透明模式转换为 Three / Cesium 都可理解的透明混合开关语义。 */
export function isModelMaterialBlendMode(alphaMode: ModelMaterialAlphaMode): boolean {
  return alphaMode === 'blend'
}

/**
 * 基于预检结果创建材质档案。
 *
 * 结果为 null 表示当前资产没有任何透明相关规则可归档，调用方应保持 `materialProfile` 缺失，避免
 * 给普通实体模型凭空增加一份空档案。`state` 仅在全部规则都来自显式声明时为 `ready`；只要存在
 * 自动检测候选，就保持 `needs-confirmation`，必须走人工确认或服务端派生模型后才能进入发布清单。
 */
export function createMaterialProfileFromInspection(
  inspection: GltfMaterialInspectionResult,
  options?: { defaultAlphaCutoff?: number },
): ModelMaterialProfile | null {
  return buildRecommendedMaterialProfile(inspection, options)
}

/**
 * 将材质档案写入资产引用，返回新的资产引用；写入失败或资产类型不支持时保持原引用不变。
 *
 * 只有 GLB / GLTF 模型资产允许携带材质档案；图片、纹理、特效等非模型资产即使传入 profile 也会被
 * 丢弃，避免污染保存数据和后续校验。该函数是纯函数，不修改入参，也不触发任何 Runtime 行为。
 */
export function applyMaterialProfileToAsset(
  asset: Readonly<AssetRef>,
  profile: ModelMaterialProfile | null,
): AssetRef {
  if (!isModelAssetKind(asset.kind) || !profile) return asset
  return { ...asset, materialProfile: cloneMaterialProfile(profile) }
}

/**
 * 将档案中所有自动检测规则确认为人工规则，并把状态推进为 `ready`。
 *
 * 资源页“一键确认”时使用；如果原本就没有 detected 规则，只做状态归一，不改变规则内容。已存在的
 * manual / declared 规则保持原样，避免覆盖原始声明或既有历史人工结论。
 */
export function confirmDetectedMaterialRules(
  profile: Readonly<ModelMaterialProfile>,
): ModelMaterialProfile {
  const rules = profile.rules.map((rule) => (
    rule.source === 'detected'
      ? { ...rule, source: 'manual' as ModelMaterialRuleSource }
      : { ...rule }
  ))
  const nextState: ModelMaterialProfileState = 'ready'
  return { ...cloneMaterialProfile(profile), rules, state: nextState }
}

/**
 * 回填发布清单中的派生资产地址。
 *
 * 只有 state 为 `ready` 时才允许挂派生资产，避免把未确认的检测结果当成正式发布产物。派生资产只存
 * 放纯地址、版本和哈希，绝不写入运行时 Blob、纹理或材质实例。
 */
export function attachDerivedAssetToMaterialProfile(
  profile: Readonly<ModelMaterialProfile>,
  derivedAsset: Readonly<NonNullable<ModelMaterialProfile['derivedAsset']>>,
): ModelMaterialProfile | null {
  if (profile.state !== 'ready') return null
  if (!derivedAsset.url.trim()) return null
  return {
    ...cloneMaterialProfile(profile),
    derivedAsset: {
      url: derivedAsset.url.trim(),
      ...(derivedAsset.version !== undefined ? { version: derivedAsset.version } : {}),
      ...(derivedAsset.hash !== undefined ? { hash: derivedAsset.hash } : {}),
    },
  }
}

/**
 * 重置资产的材质档案。
 *
 * 上传重试或用户选择“恢复原始声明”时使用。返回值保证 materialProfile 字段被移除，序列化结果里不会
 * 残留空对象或 undefined，避免后续保存文件出现噪音字段。
 */
export function resetMaterialProfile(asset: Readonly<AssetRef>): AssetRef {
  if (!asset.materialProfile) return asset
  const next = { ...asset }
  delete next.materialProfile
  return next
}

/**
 * 将档案标记为不可用。
 *
 * 预检失败、资产损坏或后端确认无法生成派生模型时使用；Runtime 会直接回退原始资产地址，资源页可
 * 展示不可用原因文案。该状态不删除既有 rules，便于后续重试或人工诊断时保留历史快照。
 */
export function markMaterialProfileUnavailable(
  profile: Readonly<ModelMaterialProfile>,
): ModelMaterialProfile {
  return { ...cloneMaterialProfile(profile), state: 'unavailable' }
}

/** 判断资产类型是否属于可携带材质档案的模型资产。 */
function isModelAssetKind(kind: AssetRef['kind']): kind is ModelAssetKind {
  return kind === 'glb' || kind === 'gltf'
}

/**
 * 浅克隆材质档案，确保公共入口返回的对象与入参彼此独立。
 *
 * 规则数组整体重分配，单条规则保持浅拷贝；规则内 selector 与基础字段都是值类型，足够支撑纯数据
 * 场景。如果后续扩展嵌套字段，需要在这里同步加深克隆范围。
 */
function cloneMaterialProfile(profile: Readonly<ModelMaterialProfile>): ModelMaterialProfile {
  return {
    version: profile.version,
    state: profile.state,
    rules: profile.rules.map((rule) => ({
      selector: { ...rule.selector },
      alphaMode: rule.alphaMode,
      ...(rule.alphaCutoff !== undefined ? { alphaCutoff: rule.alphaCutoff } : {}),
      ...(rule.doubleSided !== undefined ? { doubleSided: rule.doubleSided } : {}),
      source: rule.source,
    })),
    ...(profile.derivedAsset ? { derivedAsset: { ...profile.derivedAsset } } : {}),
  }
}