import { onScopeDispose, watch } from 'vue'

import { useManageTheme, type ManageThemeController } from './manageTheme'

export const MANAGE_THEME_ATTRIBUTE = 'data-manage-theme'

export interface ManageThemeRootTarget {
  getAttribute(name: string): string | null
  removeAttribute(name: string): void
  setAttribute(name: string, value: string): void
}

/**
 * 将响应式主题绑定到一个根节点，并返回幂等清理函数。
 * 独立函数便于在不挂载整页组件的情况下验证 50 次切换、属性更新和卸载清理。
 */
export const syncManageThemeRoot = (
  controller: ManageThemeController,
  root: ManageThemeRootTarget,
) => {
  const stopSync = watch(
    controller.theme,
    (theme) => {
      root.setAttribute(MANAGE_THEME_ATTRIBUTE, theme)
    },
    {
      immediate: true,
      flush: 'sync',
    },
  )

  return () => {
    stopSync()

    // 只删除当前控制器写入的值，避免覆盖宿主在卸载过程中设置的新属性。
    if (root.getAttribute(MANAGE_THEME_ATTRIBUTE) === controller.theme.value) {
      root.removeAttribute(MANAGE_THEME_ATTRIBUTE)
    }
  }
}

/**
 * 只在管理布局生命周期内把主题同步到 html 根节点。
 * Element Plus 的下拉、对话框和消息框会传送到 body，根属性能让它们与页面共用变量；
 * 离开管理布局时立即清理属性，避免场景编辑器继承管理端视觉。
 */
export const useManageThemeRootSync = (
  controller: ManageThemeController = useManageTheme(),
  root: ManageThemeRootTarget | null = typeof document === 'undefined'
    ? null
    : document.documentElement,
) => {
  controller.initialize()

  if (!root) return controller

  onScopeDispose(syncManageThemeRoot(controller, root))

  return controller
}
