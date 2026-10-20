import type { AssetRef } from '@/scene-platform'

/**
 * 编辑器随前端构建一起发布的内置资源键。
 *
 * 该注册表位于宿主集成层，因为静态文件地址属于当前应用部署细节，不能写入场景平台核心。
 * 这类资源没有后端 modelFileId 或 ossId，场景保存时只保留稳定键，加载时再恢复当前构建地址。
 */
export const BUILTIN_SCENE_RESOURCE_KEY = {
  CITY_MODEL: 'city-model',
  BILLBOARD_LOGO: 'billboard-logo',
} as const

export type BuiltinSceneResourceKey =
  (typeof BUILTIN_SCENE_RESOURCE_KEY)[keyof typeof BUILTIN_SCENE_RESOURCE_KEY]

export const BUILTIN_SCENE_ASSET_ID_PREFIX = 'builtin:'

const BUILTIN_SCENE_RESOURCE_ASSETS: Readonly<Record<BuiltinSceneResourceKey, AssetRef>> = {
  [BUILTIN_SCENE_RESOURCE_KEY.CITY_MODEL]: {
    id: `${BUILTIN_SCENE_ASSET_ID_PREFIX}${BUILTIN_SCENE_RESOURCE_KEY.CITY_MODEL}`,
    kind: 'glb',
    /** 复用旧加载器已验证的相对 public 路径；该地址只会存在于运行时 SceneObject。 */
    url: 'model/city.glb',
  },
  [BUILTIN_SCENE_RESOURCE_KEY.BILLBOARD_LOGO]: {
    id: `${BUILTIN_SCENE_ASSET_ID_PREFIX}${BUILTIN_SCENE_RESOURCE_KEY.BILLBOARD_LOGO}`,
    kind: 'image',
    /** 组件默认图标由构建工具生成哈希路径，保存包只保存 billboard-logo 键。 */
    url: new URL('../../assets/images/logo.png', import.meta.url).href,
  },
}

const isBuiltinSceneResourceKey = (value: unknown): value is BuiltinSceneResourceKey =>
  typeof value === 'string' &&
  Object.values(BUILTIN_SCENE_RESOURCE_KEY).includes(value as BuiltinSceneResourceKey)

/** 读取内置资源的运行时资产快照，返回副本以防 Runtime 修改污染注册表。 */
export const getBuiltinSceneAsset = (value: unknown): AssetRef | undefined => {
  if (!isBuiltinSceneResourceKey(value)) return undefined
  const asset = BUILTIN_SCENE_RESOURCE_ASSETS[value]
  return { ...asset }
}

/** 判断资产是否由前端内置注册表管理，用于保存时排除 dependencies 资源包。 */
export const isBuiltinSceneAssetId = (value: unknown): boolean =>
  typeof value === 'string' && value.startsWith(BUILTIN_SCENE_ASSET_ID_PREFIX)

/** 获取内置资源当前地址，仅供运行时补全看板图片等非 AssetRef 配置。 */
export const getBuiltinSceneResourceUrl = (value: unknown): string | undefined =>
  getBuiltinSceneAsset(value)?.url
