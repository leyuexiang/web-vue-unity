type LoggerPayload = readonly unknown[]

/**
 * 项目统一日志出口。
 *
 * 生产环境默认关闭 info/debug 级别日志，避免调试输出污染控制台或泄露运行时细节；
 * warn/error 保留，用于保留真实异常链路。后续需要排查线上问题时，可通过
 * `VITE_ENABLE_DEBUG_LOG=true` 临时开启调试输出。
 */
const canPrintDebugLog = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_LOG === 'true'

const printLog = (
  level: 'debug' | 'info' | 'warn' | 'error',
  scope: string,
  payload: LoggerPayload,
) => {
  if ((level === 'debug' || level === 'info') && !canPrintDebugLog) {
    return
  }

  const prefix = scope ? `[${scope}]` : '[App]'
  console[level](prefix, ...payload)
}

/**
 * 统一封装 console。
 *
 * 业务代码只调用这里，便于后续接入远程日志、错误上报或按模块开关，
 * 不再让裸 `console.log` 分散在渲染核心和数据运行时里。
 */
export const appLogger = {
  debug: (scope: string, ...payload: LoggerPayload) => printLog('debug', scope, payload),
  info: (scope: string, ...payload: LoggerPayload) => printLog('info', scope, payload),
  warn: (scope: string, ...payload: LoggerPayload) => printLog('warn', scope, payload),
  error: (scope: string, ...payload: LoggerPayload) => printLog('error', scope, payload),
}
