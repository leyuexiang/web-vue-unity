import { set } from 'lodash-es'
import type BaseWidgetConfig from '@/packages/components/BaseWidgetConfig'
import type { ComponentDataBindingRule } from '@/types/data-config'
import { isWidgetBindingRule } from '@/types/data-config'
import { appLogger } from '@/utils/logger'
import { resolveGoviewIconItem } from '../Icon/iconCatalog'
import { normalizePageFrameMenuData, normalizePageFrameOption } from './pageFrameTypes'

const STRING_TARGETS = new Set([
  'title.text',
  'title.subtitle',
  'logo.imageUrl',
  'logo.text',
  'weather.temperature',
  'weather.condition',
  'weather.iconUrl',
  'time.date',
  'time.time',
  'account.name',
  'account.avatarUrl',
  'account.role',
])

/** 页面框架专属绑定适配；按上次有效快照应用当前请求，空菜单不覆盖静态内容。 */
export const applyPageFrameBindings = (
  component: BaseWidgetConfig,
  bindings: ComponentDataBindingRule[],
  row: Record<string, unknown> | null | undefined,
  rows: Record<string, unknown>[] = [],
) => {
  if (!row) return
  const option = normalizePageFrameOption(component.option)
  bindings.forEach((binding) => {
    if (!isWidgetBindingRule(binding) || !binding.targetPath.trim()) return
    if (!(binding.sourceField in row)) {
      appLogger.warn('PageFrameDataBindings', '页面框架绑定缺少来源字段', binding.sourceField)
      return
    }
    const rawValue = row[binding.sourceField]
    const authorization =
      rawValue && typeof rawValue === 'object'
        ? (rawValue as { authorized?: unknown; unauthorized?: unknown })
        : null
    if (authorization?.authorized === false || authorization?.unauthorized === true) {
      if (binding.targetPath.startsWith('title.')) option.title.visible = false
      else if (binding.targetPath.startsWith('logo.')) option.logo.visible = false
      else if (binding.targetPath.startsWith('weather.')) option.weather.visible = false
      else if (binding.targetPath.startsWith('time.')) option.time.visible = false
      else if (binding.targetPath.startsWith('account.')) option.account.visible = false
      else if (binding.targetPath === 'menuItems') {
        option.menuSlots.left.visible = false
        option.menuSlots.right.visible = false
      }
      return
    }
    if (binding.targetPath === 'menuItems') {
      let menus = normalizePageFrameMenuData(rawValue)
      if (menus.length === 0 && rows.length > 1) menus = normalizePageFrameMenuData(rows)
      if (menus.length > 0) {
        /**
         * 数据源刷新只替换菜单内容；相同稳定 ID 的编辑器事件和图片属于用户配置，必须继续保留。
         * 事件仍是公共 InteractionEvent 数组，不在绑定层复制执行逻辑。
         */
        const existingEventListById = new Map(
          option.menuChildren.map((menu) => [menu.id, menu.interactiveEvent]),
        )
        const existingMenuImageConfigById = new Map(
          option.menuChildren.map((menu) => [
            menu.id,
            {
              iconUrl: menu.iconUrl,
              activeIconUrl: menu.activeIconUrl,
              activeBackgroundImage: menu.activeBackgroundImage,
            },
          ]),
        )
        menus.forEach((menu) => {
          menu.interactiveEvent = existingEventListById.get(menu.id) || []
          const imageConfig = existingMenuImageConfigById.get(menu.id)
          if (imageConfig) Object.assign(menu, imageConfig)
        })
        option.menuChildren = menus
        // 接口菜单可能替换掉原默认项；保留同 ID 配置，否则回退到新的第一个可见菜单。
        if (!option.menuChildren.some((menu) => menu.id === option.defaultMenuId)) {
          option.defaultMenuId = option.menuChildren.find((menu) => menu.visible)?.id || ''
        }
      }
      return
    }
    if (binding.targetPath === 'weather.time') {
      option.time.time = rawValue == null ? '' : String(rawValue)
      return
    }
    if (binding.targetPath === 'weather.icon') {
      const value = rawValue == null ? '' : String(rawValue).trim()
      const icon = resolveGoviewIconItem(value)
      if (icon?.category === 'weather') {
        option.weather.iconName = value
        option.weather.iconUrl = ''
      } else {
        option.weather.iconName = ''
        option.weather.iconUrl = value
      }
      return
    }
    if (binding.targetPath === 'weather.iconName') {
      const value = rawValue == null ? '' : String(rawValue).trim()
      option.weather.iconName = resolveGoviewIconItem(value)?.category === 'weather' ? value : ''
      return
    }
    if (STRING_TARGETS.has(binding.targetPath)) {
      set(option, binding.targetPath, rawValue == null ? '' : String(rawValue))
    }
  })
  component.option = option
}
