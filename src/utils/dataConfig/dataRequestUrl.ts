import { evaluateTemplateString } from '@/utils/dynamicCode'

/**
 * 将查询参数表中的值填入请求地址，例如 `/info/${params.id}`。
 * 只接受直接字段引用，不执行参数表达式；值按地址片段编码，避免斜杠、问号等改变请求结构。
 * 已使用的字段只从本次发送的查询参数副本移除，原配置仍保留，供交互传参和下次请求复用。
 * 旧的全局模板表达式继续走已有求值器；参数值先编码再替换，不会被当作脚本再次执行。
 */
export const resolveDataRequestUrl = (
  template: string,
  params: Record<string, unknown>,
): { url: string; params: Record<string, unknown> } => {
  if (!template.includes('${')) return { url: template, params }

  const usedKeys = new Set<string>()
  const substituted = template.replace(
    /\$\{\s*params\.([A-Za-z_$][\w$]*)\s*\}/g,
    (_placeholder, key: string) => {
      // 不读取原型链字段；缺失、空值和复杂对象应在发送前明确报错，避免请求错误的详情。
      if (
        ['__proto__', 'prototype', 'constructor'].includes(key) ||
        !Object.prototype.hasOwnProperty.call(params, key)
      ) {
        throw new Error(`请求地址占位参数“${key}”未配置，请在查询参数中添加同名字段`)
      }
      const value = params[key]
      if (
        !['string', 'number', 'boolean'].includes(typeof value) ||
        (typeof value === 'number' && !Number.isFinite(value)) ||
        !String(value).trim()
      ) {
        throw new Error(`请求地址占位参数“${key}”必须是非空文本、有限数值或布尔值`)
      }
      usedKeys.add(key)
      return encodeURIComponent(String(value))
    },
  )

  // 参数占位使用固定语法；拼写错误或计算表达式不能回退为未替换的地址并继续发送。
  if (/\$\{\s*params\b/.test(substituted)) {
    throw new Error('请求地址参数占位格式错误，请使用 ${params.id} 形式的直接字段引用')
  }
  const url = evaluateTemplateString(substituted)
  if (!usedKeys.size) return { url, params }

  const remainingParams = { ...params }
  for (const key of usedKeys) delete remainingParams[key]
  return { url, params: remainingParams }
}
