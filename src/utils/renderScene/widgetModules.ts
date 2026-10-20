import { loadConfigPanel, loadWidget } from '@/packages'
import { COMPONENT_TYPE, componentInstall, getComponentName } from '../components'
import { appLogger } from '@/utils/logger'

export const installWidget = async (packageName: string, keyName: string) => {
  try {
    const widgetModule = await loadWidget(packageName, keyName)
    const configPanelModule = await loadConfigPanel(packageName, keyName)
    const widgetInstalled = componentInstall(
      getComponentName(COMPONENT_TYPE.WIDGET, packageName, keyName),
      widgetModule?.default,
    )
    componentInstall(
      getComponentName(COMPONENT_TYPE.CONFIG_PANEL, packageName, keyName),
      configPanelModule?.default,
    )

    /**
     * 画布渲染只强依赖部件本体。
     * 配置面板可后续补加载，但部件本体没注册成功时必须阻断创建，否则会出现只有选框没有内容的空壳节点。
     */
    return widgetInstalled
  } catch (error) {
    appLogger.error('WidgetModules', `加载 ${keyName} 失败`, error)
    return false
  }
}
