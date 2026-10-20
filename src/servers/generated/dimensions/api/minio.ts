// @ts-nocheck
/* eslint-disable */
import request from '@/request.ts'

/** 批量下载文件 POST /admin-api/dimensions/minio/file/batchDownloadFile */
export async function fileOfMinio4(
  body: DimensionsApi.MinioFileVO[],
  options?: { [key: string]: any }
) {
  return request<any>('/admin-api/dimensions/minio/file/batchDownloadFile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

/** 复制一个文件 GET /admin-api/dimensions/minio/file/copyObject */
export async function fileOfMinio17(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultString>('/admin-api/dimensions/minio/file/copyObject', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  })
}

/** 删除一个桶 GET /admin-api/dimensions/minio/file/deleteBucket */
export async function fileOfMinio16(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultString>(
    '/admin-api/dimensions/minio/file/deleteBucket',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 删除一个文件 GET /admin-api/dimensions/minio/file/deleteFile */
export async function fileOfMinio15(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultString>('/admin-api/dimensions/minio/file/deleteFile', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  })
}

/** 下载文件（分片） GET /admin-api/dimensions/minio/file/download/${param0} */
export async function fileOfMinio14(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<string>(`/admin-api/dimensions/minio/file/download/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  })
}

/** 下载一个文件 GET /admin-api/dimensions/minio/file/downloadFile */
export async function fileOfMinio13(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  return request<any>('/admin-api/dimensions/minio/file/downloadFile', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  })
}

/** 获取文件信息 GET /admin-api/dimensions/minio/file/getObjectInfo */
export async function fileOfMinio12(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultStatObjectResponse>(
    '/admin-api/dimensions/minio/file/getObjectInfo',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 获取一个连接以供下载 GET /admin-api/dimensions/minio/file/getPresignedObjectUrl */
export async function fileOfMinio11(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultString>(
    '/admin-api/dimensions/minio/file/getPresignedObjectUrl',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 获取数据库全部文件列表 GET /admin-api/dimensions/minio/file/list */
export async function fileOfMinio6(options?: { [key: string]: any }) {
  return request<DimensionsApi.ListResultFilesMinio>('/admin-api/dimensions/minio/file/list', {
    method: 'GET',
    ...(options || {}),
  })
}

/** 获取minio中所有的文件 GET /admin-api/dimensions/minio/file/listAllFile */
export async function fileOfMinio10(options?: { [key: string]: any }) {
  return request<DimensionsApi.ListResultFileInfoBase>(
    '/admin-api/dimensions/minio/file/listAllFile',
    {
      method: 'GET',
      ...(options || {}),
    }
  )
}

/** 列出所有的桶 GET /admin-api/dimensions/minio/file/listBuckets */
export async function fileOfMinio9(options?: { [key: string]: any }) {
  return request<DimensionsApi.ListResultString>('/admin-api/dimensions/minio/file/listBuckets', {
    method: 'GET',
    ...(options || {}),
  })
}

/** 递归列出一个桶中的所有文件和目录 GET /admin-api/dimensions/minio/file/listFiles */
export async function fileOfMinio7(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.ListResultFileInfoBase>(
    '/admin-api/dimensions/minio/file/listFiles',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 列出指定目录下的所有文件 GET /admin-api/dimensions/minio/file/listFilesInDirectory */
export async function fileOfMinio8(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.ListResultString>(
    '/admin-api/dimensions/minio/file/listFilesInDirectory',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  )
}

/** 检查文件是否存在 GET /admin-api/dimensions/minio/file/multipart/check/${param0} */
export async function fileOfMinio5(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  const { md5: param0, ...queryParams } = params
  return request<DimensionsApi.CommonResultFileUploadInfo>(
    `/admin-api/dimensions/minio/file/multipart/check/${param0}`,
    {
      method: 'GET',
      params: { ...queryParams },
      ...(options || {}),
    }
  )
}

/** 初始化文件分片地址及相关数据 POST /admin-api/dimensions/minio/file/multipart/init */
export async function fileOfMinio3(
  body: DimensionsApi.FileUploadInfo,
  options?: { [key: string]: any }
) {
  return request<DimensionsApi.CommonResultUploadUrlsVO>(
    '/admin-api/dimensions/minio/file/multipart/init',
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

/** 文件合并（单文件不会合并，仅信息入库） POST /admin-api/dimensions/minio/file/multipart/merge/${param0} */
export async function fileOfMinio2(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  options?: { [key: string]: any }
) {
  const { md5: param0, ...queryParams } = params
  return request<DimensionsApi.CommonResultString>(
    `/admin-api/dimensions/minio/file/multipart/merge/${param0}`,
    {
      method: 'POST',
      params: { ...queryParams },
      ...(options || {}),
    }
  )
}

/** 上传一个文件 POST /admin-api/dimensions/minio/file/uploadFile/${param0} */
export async function fileOfMinio(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: DimensionsApi.fileOfMinioParams,
  body: {},
  uploadFile?: File,
  options?: { [key: string]: any }
) {
  const { object: param0, ...queryParams } = params
  const formData = new FormData()

  if (uploadFile) {
    formData.append('uploadFile', uploadFile)
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

  return request<DimensionsApi.CommonResultString>(
    `/admin-api/dimensions/minio/file/uploadFile/${param0}`,
    {
      method: 'POST',
      params: { ...queryParams },
      data: formData,
      requestType: 'form',
      ...(options || {}),
    }
  )
}
