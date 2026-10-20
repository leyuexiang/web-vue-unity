// @ts-nocheck
/* eslint-disable */
import request from '@/request.ts'

/** 复制场景并修改名称 GET /admin-api/dimensions/project-engineering/copy-scene/${param0} */
export async function copySceneOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.copySceneOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<DimensionsApi.CommonResultObject>(
    `/admin-api/dimensions/project-engineering/copy-scene/${param0}`,
    {
      method: 'GET',
      params: {
        ...queryParams,
      },
      ...(options || {}),
    }
  )
}

/** 删除场景 POST /admin-api/dimensions/project-engineering/delete-scene */
export async function deleteSceneOfProjectEngineering(
  body: DimensionsApi.ProjectEngineeringDeleteVO,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultBoolean>(
    '/admin-api/dimensions/project-engineering/delete-scene',
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

/** 单个或者批量下载场景 POST /admin-api/dimensions/project-engineering/down-load */
export async function downLoadOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.downLoadOfProjectEngineeringParams,
  body: number[],
  options?: { [key: string]: any }
) {
  return request<any>('/admin-api/dimensions/project-engineering/down-load', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    params: {
      ...params,
    },
    data: body,
    ...(options || {}),
  })
}

/** 查询子场景信息 GET /admin-api/dimensions/project-engineering/get-childrenScene-list/${param0} */
export async function getChildrenSceneListOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.getChildrenSceneListOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  const { parentId: param0, ...queryParams } = params
  return request<DimensionsApi.ListResultProjectEngineeringVO>(
    `/admin-api/dimensions/project-engineering/get-childrenScene-list/${param0}`,
    {
      method: 'GET',
      params: { ...queryParams },
      ...(options || {}),
    }
  )
}

/** 查询已发布场景 GET /admin-api/dimensions/project-engineering/get-isPublish-list */
export async function getIsPublishListOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.getIsPublishListOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.ListResultIsPublishVO>(
    '/admin-api/dimensions/project-engineering/get-isPublish-list',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 查询场景信息 GET /admin-api/dimensions/project-engineering/get-scene-info */
export async function getSceneInfoOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.getSceneInfoOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.ListResultProjectEngineeringVO>(
    '/admin-api/dimensions/project-engineering/get-scene-info',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 查询场景列表 GET /admin-api/dimensions/project-engineering/get-scene-list */
export async function getSceneListOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.getSceneListOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.ListResultProjectEngineeringVO>(
    '/admin-api/dimensions/project-engineering/get-scene-list',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 返回场景id是否已锁定状态 ，key为场景id，value为是否锁定 GET /admin-api/dimensions/project-engineering/get-scene-locked/${param0} */
export async function getSceneLockedOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.getSceneLockedOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  const { sceneId: param0, ...queryParams } = params
  return request<DimensionsApi.CommonResultMapIntegerBoolean>(
    `/admin-api/dimensions/project-engineering/get-scene-locked/${param0}`,
    {
      method: 'GET',
      params: { ...queryParams },
      ...(options || {}),
    }
  )
}

/** 判断场景名称是否存在 GET /admin-api/dimensions/project-engineering/judge-scene-name */
export async function judgeSceneNameOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.judgeSceneNameOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultBoolean>(
    '/admin-api/dimensions/project-engineering/judge-scene-name',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 新建场景 POST /admin-api/dimensions/project-engineering/new-scene */
export async function newSceneOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.newSceneOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultObject>(
    '/admin-api/dimensions/project-engineering/new-scene',
    {
      method: 'POST',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 发布设置 POST /admin-api/dimensions/project-engineering/set-publish */
export async function setPublishOfProjectEngineering(
  body: DimensionsApi.ProjectEngineeringPublishVO,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultBoolean>(
    '/admin-api/dimensions/project-engineering/set-publish',
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

/** 场景解锁 GET /admin-api/dimensions/project-engineering/unlock-scene/${param0} */
export async function unlockSceneOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.unlockSceneOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  const { sceneId: param0, ...queryParams } = params
  return request<DimensionsApi.CommonResultVoid>(
    `/admin-api/dimensions/project-engineering/unlock-scene/${param0}`,
    {
      method: 'GET',
      params: { ...queryParams },
      ...(options || {}),
    }
  )
}

/** 修改场景 POST /admin-api/dimensions/project-engineering/update-scene-info */
export async function updateSceneInfoOfProjectEngineering(
  body: DimensionsApi.ProjectEngineeringVO,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultBoolean>(
    '/admin-api/dimensions/project-engineering/update-scene-info',
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

/** 修改场景名称 POST /admin-api/dimensions/project-engineering/update-scene-name */
export async function updateSceneNameOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.updateSceneNameOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultBoolean>(
    '/admin-api/dimensions/project-engineering/update-scene-name',
    {
      method: 'POST',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 前端修改场景 POST /admin-api/dimensions/project-engineering/update-web-scene-info */
export async function updateWebSceneInfoOfProjectEngineering(
  body: DimensionsApi.ProjectEngineeringUpdateVO,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultBoolean>(
    '/admin-api/dimensions/project-engineering/update-web-scene-info',
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

/** 上传场景或者编辑场景 GET /admin-api/dimensions/project-engineering/upload-update */
export async function uploadUpdateOfProjectEngineering(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.uploadUpdateOfProjectEngineeringParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultInteger>(
    '/admin-api/dimensions/project-engineering/upload-update',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 上传场景或者编辑场景 POST /admin-api/dimensions/project-engineering/upload-update */
export async function uploadUpdateOfProjectEngineering2(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.uploadUpdateOfProjectEngineeringParams,
  body: {},
  jsonFile?: File,
  options?: { [key: string]: any }
) {
  const formData = new FormData()

  if (jsonFile) {
    formData.append('jsonFile', jsonFile)
  }

  Object.keys(body).forEach((ele) => {
    const item = (body as any)[ele]

    if (item !== undefined && item !== null) {
      if (typeof item === 'object' && !(item instanceof File)) {
        if (item instanceof Array) {
          item.forEach((f) => formData.append(ele, f || ''))
        } else {
          formData.append(ele, new Blob([JSON.stringify(item)], { type: 'application/json' }))
        }
      } else {
        formData.append(ele, item)
      }
    }
  })

  return request<DimensionsApi.CommonResultInteger>(
    '/admin-api/dimensions/project-engineering/upload-update',
    {
      method: 'POST',
      params: {
        ...params,
      },
      data: formData,
      requestType: 'form',
      ...(options || {}),
    }
  )
}
