/**
 * 向运行时 Vue 应用注册一个全局组件。
 *
 * @param key - 组件注册名；用于后续通过动态组件名解析实例。
 * @param node - 组件定义对象；为空时不执行注册。
 * @returns 是否已经具备可解析的全局组件；创建部件前必须用它阻断空壳节点。
 */
export const componentInstall = <T>(key: string, node: T) => {
  const vueWindow = window as unknown as Window & {
    $vue?: { component: (name: string, component?: unknown) => unknown }
  }

  if (!vueWindow.$vue) return false
  if (!vueWindow.$vue.component(key) && node) {
    vueWindow.$vue.component(key, node)
  }

  return Boolean(vueWindow.$vue.component(key))
}

export enum COMPONENT_TYPE {
  WIDGET = 'widget',
  CONFIG_PANEL = 'configPanel',
}

/**
 * 按约定生成部件或配置面板的全局组件名。
 *
 * @param type - 组件用途类型，决定后缀是 `widget` 还是 `configPanel`。
 * @param packageName - 业务组件所属包名，例如 `Chart`、`Control`。
 * @param keyName - 包内具体组件键名，用于区分同包下的不同实现。
 * @returns 可直接传给动态组件解析器的全局组件名。
 */
export const getComponentName = (type: COMPONENT_TYPE, packageName: string, keyName: string) => {
  const map: Record<COMPONENT_TYPE, string> = {
    [COMPONENT_TYPE.WIDGET]: `${packageName}_${keyName}_widget`,
    [COMPONENT_TYPE.CONFIG_PANEL]: `${packageName}_${keyName}_configPanel`,
  }

  return map[type]
}
