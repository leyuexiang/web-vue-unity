// @ts-nocheck
/* eslint-disable */
import request from '@/request.ts'

/** 此处后端没有提供注释 GET /admin-api/dimensions/project-icon-type */
export async function getAllOfProjectIconType(options?: { [key: string]: any }) {
  return request<DimensionsApi.IconType[]>('/admin-api/dimensions/project-icon-type', {
    method: 'GET',
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 POST /admin-api/dimensions/project-icon-type */
export async function createOfProjectIconType(
  body: DimensionsApi.IconType,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.IconType>('/admin-api/dimensions/project-icon-type', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /admin-api/dimensions/project-icon-type/${param0} */
export async function getByIdOfProjectIconType(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.getByIdOfProjectIconTypeParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<DimensionsApi.IconType>(`/admin-api/dimensions/project-icon-type/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 PUT /admin-api/dimensions/project-icon-type/${param0} */
export async function updateByIdOfProjectIconType(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.updateByIdOfProjectIconTypeParams,
  body: DimensionsApi.IconType,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<DimensionsApi.IconType>(`/admin-api/dimensions/project-icon-type/${param0}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 DELETE /admin-api/dimensions/project-icon-type/${param0} */
export async function deleteByIdOfProjectIconType(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.deleteByIdOfProjectIconTypeParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<any>(`/admin-api/dimensions/project-icon-type/${param0}`, {
    method: 'DELETE',
    params: { ...queryParams },
    ...(options || {}),
  })
}

/** 根据id删除项目图标类型 POST /admin-api/dimensions/project-icon-type/create-icon-delete */
export async function createIconDeleteOfProjectIconType(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.createIconDeleteOfProjectIconTypeParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultString>(
    '/admin-api/dimensions/project-icon-type/create-icon-delete',
    {
      method: 'POST',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 新建&修改项目图标类型_id不用传 POST /admin-api/dimensions/project-icon-type/create-icon-type */
export async function createIconTypeOfProjectIconType(
  body: DimensionsApi.IconType,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultString>(
    '/admin-api/dimensions/project-icon-type/create-icon-type',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: body,
      ...(options || {}),
    }
  )
}

/** 修改项目图标类型 POST /admin-api/dimensions/project-icon-type/create-icon-update */
export async function createIconUpdateOfProjectIconType(
  body: DimensionsApi.IconType,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultInteger>(
    '/admin-api/dimensions/project-icon-type/create-icon-update',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: body,
      ...(options || {}),
    }
  )
}

/** 查询所有图标类型 GET /admin-api/dimensions/project-icon-type/find-icon-type */
export async function findIconTypeOfProjectIconType(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.findIconTypeOfProjectIconTypeParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.ListResultIconType>(
    '/admin-api/dimensions/project-icon-type/find-icon-type',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}
