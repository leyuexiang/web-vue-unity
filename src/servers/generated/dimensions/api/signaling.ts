// @ts-nocheck
/* eslint-disable */
import request from '@/request.ts'

/** 此处后端没有提供注释 GET /admin-api/dimensions/signaling/get-address */
export async function getAddressOfSignaling(options?: { [key: string]: any }) {
  return request<DimensionsApi.CommonResultMapStringString>(
    '/admin-api/dimensions/signaling/get-address',
    {
      method: 'GET',
      ...(options || {}),
    }
  )
}
