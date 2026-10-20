import { appLogger } from './logger'

export type DynamicCodeScope = 'data-filter' | 'template-string' | 'chart-option' | 'syntax-check'

type DynamicCodeArgs = Record<string, unknown>

const DYNAMIC_CODE_SCOPE_LABEL: Record<DynamicCodeScope, string> = {
  'data-filter': '数据过滤函数',
  'template-string': '请求模板字符串',
  'chart-option': '图表配置解析',
  'syntax-check': '语法校验',
}

/**
 * 受控执行历史动态脚本。
 *
 * 旧场景配置允许用户写过滤函数、模板字符串或图表配置表达式，这些能力无法直接删除。
 * 因此把 `new Function` 集中到这里，统一标记使用场景、异常回退和日志输出，
 * 避免高风险动态执行点继续分散在业务文件中。
 */
export const executeDynamicCode = <T>(
  scope: DynamicCodeScope,
  args: DynamicCodeArgs,
  body: string,
  fallback: T,
): T => {
  if (!body.trim()) return fallback

  try {
    const names = Object.keys(args)
    const values = names.map((key) => args[key])
    const fn = new Function(...names, body) as (...input: unknown[]) => T
    return fn(...values)
  } catch (error) {
    appLogger.error('DynamicCode', `${DYNAMIC_CODE_SCOPE_LABEL[scope]}执行失败`, error)
    return fallback
  }
}

/**
 * 只校验动态脚本语法，不执行脚本。
 *
 * 右侧过滤器保存前需要提前发现语法错误；这里复用同一集中入口，
 * 保证新增动态脚本能力时不会重新散落 `new Function`。
 */
export const validateDynamicCode = (
  scope: DynamicCodeScope,
  argNames: string[],
  body: string,
): string | null => {
  if (!body.trim()) return null

  try {
    new Function(...argNames, body)
    return null
  } catch (error) {
    appLogger.warn('DynamicCode', `${DYNAMIC_CODE_SCOPE_LABEL[scope]}语法校验失败`, error)
    return error instanceof Error ? error.message : '未知错误'
  }
}

/**
 * 执行模板字符串表达式。
 *
 * 请求 URL、Header、Body 等历史配置支持 `${...}` 表达式。这里单独封装，
 * 让调用方只关心“成功返回替换结果，失败回退原字符串”的稳定语义。
 */
export const evaluateTemplateString = (template: string): string => {
  if (!template.includes('${')) return template

  return executeDynamicCode<string>(
    'template-string',
    {},
    `return \`${template}\``,
    template,
  )
}
