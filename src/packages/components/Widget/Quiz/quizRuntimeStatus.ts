import { reactive } from 'vue'

export type QuizRuntimeLoadState = 'idle' | 'loading' | 'ready' | 'error'

export interface QuizRuntimeStatus {
  state: QuizRuntimeLoadState
  message: string
}

/** 预览中的请求状态优先于配置里保留的示例题，防止旧题库遮住加载或错误提示。 */
export const shouldHideQuizQuestions = (
  isPreview: boolean,
  state: QuizRuntimeLoadState,
) => isPreview && (state === 'loading' || state === 'error')

/** 请求状态只存在当前页面运行内存中，不进入测验配置、场景保存内容或撤销记录。 */
const statusByWidgetId = reactive(new Map<string, QuizRuntimeStatus>())

/** 按组件实例更新请求反馈，保证同一场景中的多个测验互不覆盖状态。 */
export const setQuizRuntimeStatus = (
  widgetId: string,
  state: QuizRuntimeLoadState,
  message = '',
) => {
  if (!widgetId) return
  statusByWidgetId.set(widgetId, { state, message })
}

/** 组件只订阅自己的状态项，未开始请求时返回明确的空闲状态。 */
export const getQuizRuntimeStatus = (widgetId: string): QuizRuntimeStatus =>
  statusByWidgetId.get(widgetId) ?? { state: 'idle', message: '' }

/** 场景调度器停止时释放该场景测验状态，避免组件销毁后残留实例编号。 */
export const clearQuizRuntimeStatus = (widgetIds: Iterable<string>) => {
  for (const widgetId of widgetIds) statusByWidgetId.delete(widgetId)
}
