// @ts-nocheck
import request from '@/request.ts'
import { PREFIX } from './const'

type ManualRequestOptions = Record<string, unknown>

/** 数据源列表 */
export async function fetchDataSourceList(
  params: { current: number, size: number },
  options?: ManualRequestOptions,
) {
  return request(`${PREFIX}/api/jdbcDatasource/list`, {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  })
}

// 数据源详情
export async function fetchDataSourceDetail(
  params: { datasourceId: string, tableName: string },
  options?: ManualRequestOptions,
) {
  return request<DataMiddlewareApi.MetadataGetColumns2>(`${PREFIX}/api/metadata/getColumns2`, {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  })
}

// 查询表数据
export async function fetchDataSourceFieldDetail(
  params: { pageNo?: number, pageSize?: number, tablename: string, datasourceId: string },
  options?: ManualRequestOptions,
) {
  return request<DataMiddlewareApi.JobJdbcDatasourceListThRecord>(`${PREFIX}/api/jobJdbcDatasource/listthRecord`, {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  })
}
