/** 编辑页退出只依赖现有解锁入口与管理页导航，渲染层无需了解锁凭证或路由。 */
interface EditorSceneExitOptions {
  releaseSceneLock: () => Promise<void>
  returnToManagement: () => Promise<unknown>
}

/**
 * 合并主动退出与渲染器断开的并发退出请求，始终等待解锁完成后再关闭当前页签。
 * 即使宿主移除了 opener 也尝试关闭；浏览器拒绝脚本关页时，稍后回到管理页。
 * 单次退出只创建一个短定时器，所有调用共享同一任务，不会重复解锁或导航。
 */
export const createEditorSceneExitController = (options: EditorSceneExitOptions) => {
  let completion: Promise<void> | undefined
  return (): Promise<void> => {
    completion ??= Promise.resolve().then(async () => {
      await options.releaseSceneLock()
      window.close()
      if (window.closed) return
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100))
      if (!window.closed) await options.returnToManagement()
    })
    return completion
  }
}
