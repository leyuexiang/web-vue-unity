import { inject, provide, type InjectionKey } from 'vue'
import type { RecordPaginationState } from './model'

/** 组件包只认识轻量上下文，请求、仓库与交互事件由宿主集成层提供。 */
export interface RecordPaginationContext {
  getState: (widgetId: string) => RecordPaginationState | undefined
  move: (widgetId: string, direction: -1 | 1) => Promise<void>
  retry: (widgetId: string) => Promise<void>
}
const key: InjectionKey<RecordPaginationContext> = Symbol('RecordPaginationContext')
export const provideRecordPaginationContext = (context: RecordPaginationContext) =>
  provide(key, context)
export const useRecordPaginationContext = () =>
  inject(key, {
    getState: () => undefined,
    move: async () => undefined,
    retry: async () => undefined,
  } satisfies RecordPaginationContext)
