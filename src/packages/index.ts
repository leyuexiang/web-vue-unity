import type BaseConfig from './components/BaseWidgetConfig'
import type { Component } from 'vue'
import Control from './components/Control/index'
import Chart from './components/Chart/index'
import Decorate from './components/Decorate/index'
import Widget from './components/Widget/index'
import { appLogger } from '@/utils/logger'
import { loadWithRetryableCache } from './moduleLoadCache'

export const packages = [
  { name: '控件', key: 'Control', children: Control },
  { name: '图表', key: 'Chart', children: Chart },
  { name: '装饰', key: 'Decorate', children: Decorate },
  { name: '部件', key: 'Widget', children: Widget },
]

// const indexModules: Record<string, { default: string }> = import.meta.glob(
//   './components/**/index.vue',
//   { eager: true },
// )

// const fetchComponent = (chartName: string) => {
//   const module = indexModules
//   for (const key in module) {
//     const urlSplit = key.split('/')
//     if (urlSplit[urlSplit.length - 2] === chartName) {
//       return module[key]
//     }
//   }
// }

/**
 * 装饰包的导出键名和真实目录名不完全一致。
 * 例如 `VBorder01` / `VDecorate01` / `VClock` 这些 keyName 只是注册名，
 * 实际目录名是 `Border01` / `Decorate01` / `Clock`。
 *
 * 配置类会被左侧资源列表、组件本体、配置面板静态引用。
 * 如果这里继续动态导入 config.ts，Vite 会提示“同一模块同时动态/静态导入”，
 * 且不会把它移动到独立分包。因此配置类改为 eager 静态收集；
 * 真实组件和配置面板仍保留动态加载，继续维持画布按需安装能力。
 */
const configModuleMap = import.meta.glob<{ default: new () => BaseConfig }>(
  './components/*/*/config.ts',
  { eager: true },
)
const configPanelModuleMap = import.meta.glob<{ default: Component }>(
  './components/*/*/ConfigPanel.vue',
)
const widgetModuleMap = import.meta.glob<{ default: Component }>('./components/*/*/index.vue')

const resolveComponentFolderCandidates = (packageName: string, keyName: string) => {
  const candidates = [keyName]
  /**
   * 当前仓库里一部分组件目录名去掉了注册名里的 `V` 前缀。
   * 例如 `VBorder01` 实际目录是 `Border01`，`VNumber` 实际目录是 `Number`。
   * 这里统一把“去掉前缀 V 的目录名”作为回退候选，避免拖拽到画布后找不到真实组件。
   */
  if (keyName.startsWith('V')) {
    candidates.push(keyName.slice(1))
  }
  return [...new Set(candidates)]
}

const getModulePathCandidates = (packageName: string, keyName: string, fileName: string) =>
  resolveComponentFolderCandidates(packageName, keyName).map(
    (folderName) => `./components/${packageName}/${folderName}/${fileName}`,
  )

const loadModuleFromMap = async <T>(
  moduleMap: Record<string, () => Promise<T>>,
  packageName: string,
  keyName: string,
  fileName: string,
) => {
  for (const modulePath of getModulePathCandidates(packageName, keyName, fileName)) {
    const loader = moduleMap[modulePath]
    if (!loader) continue
    return loader()
  }

  appLogger.error('Packages', `加载 ${packageName}/${keyName}/${fileName} 失败: 未找到可用模块路径`)
  return undefined
}

const loadEagerModuleFromMap = <T>(
  moduleMap: Record<string, T>,
  packageName: string,
  keyName: string,
  fileName: string,
) => {
  for (const modulePath of getModulePathCandidates(packageName, keyName, fileName)) {
    const module = moduleMap[modulePath]
    if (!module) continue
    return module
  }

  appLogger.error(
    'Packages',
    `加载 ${packageName}/${keyName}/${fileName} 失败: 未找到可用静态模块路径`,
  )
  return undefined
}

const configCacheMap = new Map<string, Promise<{ default: new () => BaseConfig } | undefined>>()
export const loadConfig = (packageName: string, keyName: string) => {
  const key = `${packageName}${keyName}config`
  return loadWithRetryableCache(configCacheMap, key, async () =>
    loadEagerModuleFromMap(configModuleMap, packageName, keyName, 'config.ts'),
  )
}

const configPanelCacheMap = new Map<string, Promise<{ default: Component } | undefined>>()
export const loadConfigPanel = (packageName: string, keyName: string) => {
  const key = `${packageName}${keyName}configPanel`
  return loadWithRetryableCache(configPanelCacheMap, key, () =>
    loadModuleFromMap(configPanelModuleMap, packageName, keyName, 'ConfigPanel.vue'),
  )
}

const widgetCacheMap = new Map<string, Promise<{ default: Component } | undefined>>()
export const loadWidget = (packageName: string, keyName: string) => {
  const key = `${packageName}${keyName}widget`
  return loadWithRetryableCache(widgetCacheMap, key, () =>
    loadModuleFromMap(widgetModuleMap, packageName, keyName, 'index.vue'),
  )
}
