import { inject, provide, type InjectionKey } from 'vue'

export interface WidgetRuntimeValueContext {
  getRuntimeValue: (widgetId: string | undefined, field: string) => unknown
  setRuntimeValue: (widgetId: string | undefined, field: string, value: unknown) => void
}

const noopWidgetRuntimeValueContext: WidgetRuntimeValueContext = {
  getRuntimeValue: () => undefined,
  setRuntimeValue: () => undefined,
}

const WIDGET_RUNTIME_VALUE_CONTEXT_KEY: InjectionKey<WidgetRuntimeValueContext> = Symbol(
  'WidgetRuntimeValueContext',
)

/**
 * 提供二维部件运行时值读写上下文。
 * 读取能力用于组件局部重挂载时恢复刚刚显示的值，写入能力继续服务状态规则；
 * 组件包只依赖这个轻量上下文，避免直接导入当前编辑器的 Pinia 仓库。
 */
export const provideWidgetRuntimeValueContext = (context: WidgetRuntimeValueContext) => {
  provide(WIDGET_RUNTIME_VALUE_CONTEXT_KEY, context)
}

/**
 * 读取二维部件运行时值上报上下文。
 * 未挂载在编辑器画布中时返回空实现，保证组件在预览、截图或独立调试时不会报错。
 */
export const useWidgetRuntimeValueContext = () =>
  inject(WIDGET_RUNTIME_VALUE_CONTEXT_KEY, noopWidgetRuntimeValueContext)
