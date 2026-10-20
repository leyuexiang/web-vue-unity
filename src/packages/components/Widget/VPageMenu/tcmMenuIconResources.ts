import { getDim3dOssFileById } from '@/servers/manual/dim3d/api/oss'
import { pageDim3dIcon, type Dim3dIconPageVo } from '@/servers/manual/dim3d/api/icon'
import type { PageFrameOption } from './pageFrameTypes'

/**
 * 中医馆菜单图标的资源命名约定。
 *
 * 资源市场中的图标只保存稳定文件编号，编辑器运行时再解析成图片地址。这里按菜单文字匹配，
 * 同时识别“选中/未选中”以及常见英文状态后缀，避免把资源地址写死在页面框架预设里。
 */
export type TcmMenuIconResource = {
  normalUrl: string
  activeUrl: string
}

type TcmIconRecord = {
  name: string
  fileId: string
  url: string
}

const resourcePromiseByLabel = new Map<string, Promise<TcmMenuIconResource>>()

/** 资源库里可能使用英文模块名或更短中文名，按中医馆固定菜单补充同义匹配。 */
const TCM_MENU_LABEL_ALIASES: Record<string, string[]> = {
  总览: ['总览', 'overview', 'dashboard', '首页'],
  患者处方: ['患者处方', '处方', 'prescription', 'patient'],
  药材管理: ['药材管理', '药材', '中药', 'herbs', 'medicine'],
  商城销售: ['商城销售', '商城', '销售', 'sales', 'shop', 'mall'],
  设备监控: ['设备监控', '设备', '监控', 'equipment', 'monitor'],
}

const normalizeName = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s_\-—–·•|/\\()[\]{}:：]+/g, '')

const isInactiveName = (name: string) =>
  /(未选中|未激活|未选择|默认|普通|normal|default|inactive|off)/i.test(name)

const isActiveName = (name: string) =>
  /(选中|激活|选择|高亮|点击|active|selected|hover|on)/i.test(name) && !isInactiveName(name)

const resourceMatchesLabel = (resourceName: string, label: string) => {
  const normalizedResourceName = normalizeName(resourceName)
  const labels = TCM_MENU_LABEL_ALIASES[label] || [label]
  return labels.some((candidate) => {
    const normalizedLabel = normalizeName(candidate)
    return Boolean(normalizedLabel && normalizedResourceName.includes(normalizedLabel))
  })
}

const resolveFileUrl = async (fileId: string) => {
  try {
    const response = await getDim3dOssFileById(fileId, { suppressNotFoundNotification: true })
    if (response?.code !== 200 || !Array.isArray(response.data)) return ''
    return (
      response.data.find((item) => String(item.ossId ?? '').trim() === fileId)?.url?.trim() || ''
    )
  } catch {
    return ''
  }
}

const loadLabelResources = async (label: string): Promise<TcmMenuIconResource> => {
  const empty: TcmMenuIconResource = { normalUrl: '', activeUrl: '' }
  const normalizedLabel = normalizeName(label)
  if (!normalizedLabel) return empty

  const fetchRows = async (searchTerm: string) => {
    try {
      const response = await pageDim3dIcon({
        iconName: searchTerm,
        pageNum: 1,
        pageSize: 100,
      })
      return response.rows || []
    } catch {
      return []
    }
  }
  let rows = await fetchRows(label)
  if (!rows.length) {
    const aliases = TCM_MENU_LABEL_ALIASES[label] || []
    const fallbackRows = await Promise.all(
      aliases
        .filter((alias) => normalizeName(alias) !== normalizedLabel)
        .map((alias) => fetchRows(alias)),
    )
    rows = fallbackRows.flat()
  }

  const matchedRows = rows
    .filter(
      (row) =>
        resourceMatchesLabel(String(row.iconName ?? ''), label) &&
        String(row.iconFileId ?? '').trim(),
    )
    .map((row) => ({
      name: String(row.iconName ?? '').trim(),
      fileId: String(row.iconFileId ?? '').trim(),
    }))
    .sort((left, right) => {
      const leftExtra = normalizeName(left.name).replace(normalizedLabel, '').length
      const rightExtra = normalizeName(right.name).replace(normalizedLabel, '').length
      return leftExtra - rightExtra
    })

  if (!matchedRows.length) return empty

  const resolvedRows = (
    await Promise.all(
      matchedRows.map(async (row) => ({ ...row, url: await resolveFileUrl(row.fileId) })),
    )
  ).filter((row): row is TcmIconRecord => Boolean(row.url))
  if (!resolvedRows.length) return empty

  const normal =
    resolvedRows.find((row) => isInactiveName(row.name)) ||
    resolvedRows.find((row) => !isActiveName(row.name))
  const active = resolvedRows.find((row) => isActiveName(row.name))
  return {
    normalUrl: normal?.url || '',
    activeUrl: active?.url || '',
  }
}

const getLabelResources = (label: string) => {
  const key = normalizeName(label)
  if (!resourcePromiseByLabel.has(key)) {
    resourcePromiseByLabel.set(key, loadLabelResources(label))
  }
  return resourcePromiseByLabel.get(key) as Promise<TcmMenuIconResource>
}

/**
 * 给中医馆底部菜单补齐资源市场图片。
 *
 * 只填充空字段，用户已经在右侧基础面板手动选择的图片始终优先；返回值用于调试和面板刷新，
 * 不会把资源市场的 token 或临时请求信息写入场景配置。
 */
export const hydrateTcmMenuIconResources = async (option: PageFrameOption) => {
  if (option.layout !== 'tcm-bottom' || !option.menuChildren.length) return 0

  const resources = await Promise.all(
    option.menuChildren.map(async (menu) => ({
      menu,
      resource: await getLabelResources(menu.label),
    })),
  )
  let changedCount = 0
  resources.forEach(({ menu, resource }) => {
    if (!menu.iconUrl && resource.normalUrl) {
      menu.iconUrl = resource.normalUrl
      changedCount += 1
    }
    if (!menu.activeIconUrl && resource.activeUrl) {
      menu.activeIconUrl = resource.activeUrl
      changedCount += 1
    }
  })
  return changedCount
}
