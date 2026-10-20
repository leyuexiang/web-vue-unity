import type { PlatformType } from '@/auth/authTypes'
import type { Dim3dResourceBelong } from '@/servers/manual/dim3d/api/model'

/** 资源管理顶部页签使用前端语义值，避免把后端大写枚举直接泄漏到展示组件。 */
export type ResourceScopeValue = 'all' | 'system' | 'mine'

/** 模型管理与图片管理共用同一组资源归属页签，确保文案、顺序和筛选值始终一致。 */
export const RESOURCE_SCOPE_TABS = [
  { label: '全部', value: 'all' as const },
  { label: '系统资源', value: 'system' as const },
  { label: '我的资源', value: 'mine' as const },
] as const

/**
 * 新增模型和图片弹窗的资源归属选项。
 * 运营端保留两项；租户端只能创建属于当前租户的我的资源。
 */
export const RESOURCE_BELONG_OPTIONS = [
  { label: '系统资源', value: 'SYSTEM' as const },
  { label: '我的资源', value: 'MINE' as const },
] as const

export type ResourceBelongOption = (typeof RESOURCE_BELONG_OPTIONS)[number]

/** 根据已校验的平台类型裁剪新增弹窗可见的资源归属选项。 */
export function getResourceBelongOptions(
  platformType: PlatformType | null | undefined,
): readonly ResourceBelongOption[] {
  // 独立访问或未完成鉴权时按运营端兼容，租户端则强制只显示“我的资源”。
  return platformType === 'tenant' ? [RESOURCE_BELONG_OPTIONS[1]] : RESOURCE_BELONG_OPTIONS
}

/**
 * 将页面页签值转换为三维资源接口的归属枚举。
 * “全部”必须返回 undefined，使请求省略该参数；不能向后端发送仅供界面使用的 all。
 */
export function toDim3dResourceBelong(scope: ResourceScopeValue): Dim3dResourceBelong | undefined {
  if (scope === 'system') return 'SYSTEM'
  if (scope === 'mine') return 'MINE'
  return undefined
}

/**
 * 分类数量统一使用最小分页请求，只读取 total，不下载无关卡片数据。
 * category 为空时表示当前资源归属下的“全部”数量，非空时表示对应分类数量。
 */
export function createResourceCategoryTotalRequestParams(
  scope: ResourceScopeValue,
  category?: string,
) {
  return {
    resourceBelong: toDim3dResourceBelong(scope),
    category: category?.trim() || undefined,
    pageNum: 1,
    pageSize: 1,
  }
}
