import { get } from 'lodash-es'
import type { RecordPaginationBinding } from './config'

export interface RecordPaginationState {
  page: number
  index: number
  rows: Record<string, unknown>[]
  total: number
  loading: boolean
  error: string
}

/** 只保留当前页。全局位置用乘法直接计算，不扫描整个列表。 */
export const getRecordPaginationPosition = (
  state: RecordPaginationState,
  binding: RecordPaginationBinding,
) => (state.page - binding.firstPage) * binding.pageSize + state.index

/** 禁用优先于按压状态；错误后的有效旧记录仍可重试跨页。 */
export const canMoveRecord = (
  state: RecordPaginationState,
  binding: RecordPaginationBinding,
  direction: -1 | 1,
) => {
  if (state.loading || !state.rows.length) return false
  const position = getRecordPaginationPosition(state, binding)
  return direction === -1 ? position > 0 : position < state.total - 1
}

/**
 * 原始响应的总数决定全列表边界，过滤后的标准行决定可浏览数据。
 * 不接受丢弃记录的过滤器，否则页内位置与服务端总数不再对应。
 */
export const validateRecordPaginationPage = (
  raw: unknown,
  rows: Record<string, unknown>[],
  binding: RecordPaginationBinding,
  page: number,
) => {
  const list = binding.listPath.trim() ? get(raw, binding.listPath.trim()) : raw
  const rawTotal = binding.totalPath.trim() ? get(raw, binding.totalPath.trim()) : undefined
  const total =
    typeof rawTotal === 'number' || (typeof rawTotal === 'string' && rawTotal.trim())
      ? Number(rawTotal)
      : NaN
  if (!Array.isArray(list)) throw new Error('列表路径未指向数组，请检查分页适配配置。')
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('总条数路径未返回有效的非负整数。')
  if (
    list.length !== rows.length ||
    rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
  )
    throw new Error('列表必须是对象数组，过滤器不能改变每页记录数量。')
  const expected = Math.min(
    binding.pageSize,
    Math.max(0, total - (page - binding.firstPage) * binding.pageSize),
  )
  if (rows.length !== expected)
    throw new Error('当前页记录数量与总数不一致，请检查页码及每页条数参数。')
  return total
}
