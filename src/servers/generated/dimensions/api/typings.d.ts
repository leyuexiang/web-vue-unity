export {}

declare global {
namespace DimensionsApi {
  type AlertScheme = {
    id?: number
    /** 预警名称 */
    schemeName?: string
    /** 预警类型-0：模型范围光提示（U3D用）1：全局弹窗提示（WEB用） */
    alertType?: number
    /** 颜色-JSON数据结构 */
    color?: { empty?: boolean; innerMap?: Record<string, any> }
    /** 位置 */
    location?: string
    /** 文本样式 */
    textStyle?: string
    /** 显示方式-0：直接显示;1:鼠标移入显示 */
    displayMode?: number
    /** 预警文本 */
    alertText?: string
    /** 唯一标识 */
    uniqueId?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type AlertSchemePage = {
    /** 预警名称 */
    schemeName?: string
    /** 条数 */
    size?: number
    /** 页数 */
    page?: number
  }

  type AlertSchemePageVO = {
    /** 总条数 */
    countMax?: number
    /** 总页数 */
    pageMax?: number
    /** 预警方案信息列表 */
    alertSchemeList?: AlertScheme[]
  }

  type AssociationObject = {
    valueName?: string
    labelName?: string
    leaf?: boolean
  }

  type BatchConversion = {
    id?: number
    /** 资源前端显示名称 */
    resourceWebName?: string
    /** 资源类型 */
    resourceType?: string
    /** 待下载资源目录名称 */
    resourceDirectoryName?: string
    /** 上传压缩包名字-前端显示 */
    uploadFileName?: string
    /** 上传压缩包名字-唯一处理 */
    uniqueUploadFileName?: string
    /** 资源大小 */
    resourceSize?: number
    /** 资源大小 */
    conversionStatus?: string
    /** 登陆用户名 */
    userName?: string
    /** 上传时间 */
    uploadTime?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type batchInsertUpdateTaskEventOfTaskEventParams = {
    sceneId: number
  }

  type batchInsertUpdateVirtualCameraOfVirtualCameraParams = {
    sceneId: number
  }

  type CommonResultAlertSchemePageVO = {
    code?: number
    data?: AlertSchemePageVO
    msg?: string
  }

  type CommonResultBatchConversion = {
    code?: number
    data?: BatchConversion
    msg?: string
  }

  type CommonResultBoolean = {
    code?: number
    data?: boolean
    msg?: string
  }

  type CommonResultComponentInfoPageVO = {
    code?: number
    data?: ComponentInfoPageVO
    msg?: string
  }

  type CommonResultFileUploadInfo = {
    code?: number
    data?: FileUploadInfo
    msg?: string
  }

  type CommonResultIconInfo = {
    code?: number
    data?: IconInfo
    msg?: string
  }

  type CommonResultInteger = {
    code?: number
    data?: number
    msg?: string
  }

  type CommonResultListFileInfo = {
    code?: number
    data?: FileInfo[]
    msg?: string
  }

  type CommonResultListKafkaTopicVO = {
    code?: number
    data?: KafkaTopicVO[]
    msg?: string
  }

  type CommonResultListMapResourceInfoString = {
    code?: number
    data?: Record<string, any>[]
    msg?: string
  }

  type CommonResultListVirtualCamera = {
    code?: number
    data?: VirtualCamera[]
    msg?: string
  }

  type CommonResultMapIntegerBoolean = {
    code?: number
    data?: Record<string, any>
    msg?: string
  }

  type CommonResultMapStringString = {
    code?: number
    data?: Record<string, any>
    msg?: string
  }

  type CommonResultMaterialReturnDTO = {
    code?: number
    data?: MaterialReturnDTO
    msg?: string
  }

  type CommonResultMaterialReturnWebVo = {
    code?: number
    data?: MaterialReturnWebVo
    msg?: string
  }

  type CommonResultModelSceneCountDTO = {
    code?: number
    data?: ModelSceneCountDTO
    msg?: string
  }

  type CommonResultObject = {
    code?: number
    data?: Record<string, any>
    msg?: string
  }

  type CommonResultProjectIconInfoPageVO = {
    code?: number
    data?: ProjectIconInfoPageVO
    msg?: string
  }

  type CommonResultProjectResourceInfoPageVO = {
    code?: number
    data?: ProjectResourceInfoPageVO
    msg?: string
  }

  type CommonResultProjectResourcePageVO = {
    code?: number
    data?: ProjectResourcePageVO
    msg?: string
  }

  type CommonResultResourceInfo = {
    code?: number
    data?: ResourceInfo
    msg?: string
  }

  type CommonResultStatObjectResponse = {
    code?: number
    data?: StatObjectResponse
    msg?: string
  }

  type CommonResultString = {
    code?: number
    data?: string
    msg?: string
  }

  type CommonResultTaskEventVO = {
    code?: number
    data?: TaskEventVO
    msg?: string
  }

  type CommonResultUploadUrlsVO = {
    code?: number
    data?: UploadUrlsVO
    msg?: string
  }

  type CommonResultVirtualCamera = {
    code?: number
    data?: VirtualCamera
    msg?: string
  }

  type CommonResultVoid = {
    code?: number
    data?: Record<string, any>
    msg?: string
  }

  type ComponentInfo = {
    id?: number
    /** 项目ID */
    projectId?: number
    /** 组件唯一标识 */
    componentUniqueId?: string
    /** 组件名称 */
    componentName?: string
    /** 组件展示名称 */
    componentShowName?: string
    /** 组件类型 */
    componentType?: number
    /** 组件预制名 */
    componentPrefabName?: string
    /** 组件预制相对路径 */
    componentAssetBundelName?: string
    /** 根目录 */
    componentAssetBundelRootDir?: string
    /** 组件程序集名称 */
    componentDllName?: string
    /** 组件程序集根路径 */
    componentDllRootDir?: string
    /** 组件规则JSON信息 */
    componentRule?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type ComponentInfoPageVO = {
    /** 总条数 */
    countMax?: number
    /** 总页数 */
    pageMax?: number
    /** 组件信息列表 */
    componentInfoList?: ComponentInfo[]
  }

  type ComponentInfoVO = {
    /** 组件名称 */
    componentName?: string
    /** 组件类型 */
    componentType?: number
    /** 条数 */
    size?: number
    /** 页数 */
    page?: number
  }

  type copySceneOfProjectEngineeringParams = {
    id: string
    platformType: string
  }

  type createIconDeleteOfProjectIconTypeParams = {
    id: number
  }

  type createOfFileInfoParams = {
    fileName: string
  }

  type createResourceDeleteOfProjectResourceTypeParams = {
    id: number
  }

  type createResourceDeleteOfProjectResourceVersionParams = {
    id: number
  }

  type delByUniqueIdOfProjectIconInfoParams = {
    resFromPlatform: string
    uniqueId: string
  }

  type delByUniqueIdOfProjectResourceInfoParams = {
    resFromPlatform: string
    uniqueId: string
  }

  type deleteAlertSchemeOfAlertSchemeParams = {
    uniqueId: string[]
  }

  type deleteByIdOfCommonParams = {
    id: number
  }

  type deleteByIdOfEngineeringDataParams = {
    id: number
  }

  type deleteByIdOfFileInfoParams = {
    id: number
  }

  type deleteByIdOfFileOnlyInfoParams = {
    id: string
  }

  type deleteByIdOfProjectEngineeringDataListColumnParams = {
    id: number
  }

  type deleteByIdOfProjectEngineeringDataListRowParams = {
    id: number
  }

  type deleteByIdOfProjectIconInfoParams = {
    id: number
  }

  type deleteByIdOfProjectIconTypeParams = {
    id: number
  }

  type deleteByIdOfProjectResourceDatatypeParams = {
    id: number
  }

  type deleteByIdOfProjectResourceInfoParams = {
    id: number
  }

  type deleteByIdOfProjectResourceParams = {
    id: number
  }

  type deleteByIdOfProjectResourceTypeParams = {
    id: number
  }

  type deleteByIdOfProjectResourceVersionParams = {
    id: number
  }

  type deleteByIdsOfMaterialParams = {
    ids: number[]
  }

  type deleteComponentInfoOfComponentInfoParams = {
    componentUniqueId: string
    appId: string
  }

  type deleteOfBatchConversionParams = {
    /** 主键 */
    id: number
  }

  type deleteTaskEventByCodeOfTaskEventParams = {
    command: string
    deviceCode: string
  }

  type deleteTaskEventOfTaskEventParams = {
    taskId: string
  }

  type deleteVirtualCameraOfVirtualCameraParams = {
    sceneId: number
    virtualCameraId: number
  }

  type DeviceInfoCbds = {
    id?: number
    /** 设备id */
    deviceId?: string
    /** 设备名字 */
    deviceName?: string
    /** 区域Id */
    areaId?: string
    /** 区域名字 */
    areaName?: string
    /** 栋数Id */
    buildingId?: string
    /** 栋数名称 */
    buildingName?: string
    /** 楼层Id */
    floorId?: string
    /** 楼层名称 */
    floorName?: string
    /** 地点Id */
    spaceId?: string
    /** 地点名称 */
    spaceName?: string
    /** 设备类型 */
    type?: string
    /** 设备类型名称 */
    typeName?: string
    /** lon */
    lon?: number
    /** lat */
    lat?: number
  }

  type DeviceStatusCbds = {
    id?: number
    /** 设备id */
    deviceId?: string
    /** 设备名字 */
    deviceName?: string
    /** 温度 */
    temperature?: number
    /** 湿度 */
    humidity?: number
    /** co */
    co?: number
    /** co2 */
    co2?: number
    /** 状态码 */
    state?: number
    /** 状态名 */
    stateName?: string
    /** 是否预警 */
    warning?: number
  }

  type doPostUploadOfFileInfoParams = {
    url: string
  }

  type downloadComponentOfFileInfoParams = {
    uploadPath: string
  }

  type downloadOfFileInfoParams = {
    uploadPath: string
  }

  type downLoadOfProjectEngineeringParams = {
    platformType: string
  }

  type downloadResourceOfFileInfoParams = {
    uploadPath: string
  }

  type EngineeringData = {
    id?: number
    /** 3D场景唯一标识 */
    engineeringId?: string
    /** 3D场景名称 */
    engineeringName?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type EngineeringDataListColumn = {
    id?: number
    /** 行Id */
    rowId?: number
    /** String */
    columnData?: string
    /** Integer */
    columnSort?: number
    /** Integer */
    status?: number
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type EngineeringDataListRow = {
    id?: number
    /** 场景id */
    projectEngineeringId?: number
    /** 列名称 */
    rowName?: string
    /** 列序号 */
    rowSort?: number
    /** 状态1正常 0删除 */
    status?: number
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type EngineGroupInfoVO = {
    /** 分组ID */
    id?: number
    /** 场景ID */
    engineeringId: number
    /** 分组名称 */
    groupName: string
    /** 分组类型 */
    groupType: string
    /** 父分组ID （0表示根分组） */
    parentId?: number
    /** 模型ID列表 */
    modelIds: string
    /** 子分组ID列表 */
    childrenIds?: string
  }

  type FileInfo = {
    id?: number
    /** 文件名 */
    fileName?: string
    /** 文件等级，在多少层 */
    fileLevel?: number
    /** 文件类型 0文件夹 1文件 */
    fileType?: number
    /** 父文件id */
    parentId?: number
    /** 文件大小 */
    fileSize?: string
    /** 上传时间 */
    uploadTime?: string
    /** 上传用户Id */
    uploadUserId?: number
    /** 上传用户名 */
    uploadUserName?: string
    /** 文件状态 */
    status?: number
    /** 是否有下一层目录 0没有，1有 */
    hasNext?: number
    /** 文件的唯一号,目录及子文件一致 */
    uniqueId?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type FileInfoBase = {
    filename?: string
    directory?: boolean
  }

  type FileInfoUpdateNameVO = {
    fileName?: string
    newFileName?: string
    parentId?: number
    id?: number
  }

  type fileOfMinioParams = {
    object: string
  }

  type fileOfMinioParams = {
    md5: string
  }

  type fileOfMinioParams = {
    md5: string
  }

  type fileOfMinioParams = {
    bucket: string
  }

  type fileOfMinioParams = {
    bucket: string
    directoryPath: string
    recursive: boolean
  }

  type fileOfMinioParams = {
    bucket: string
    objectName: string
    expires: number
  }

  type fileOfMinioParams = {
    bucket: string
    objectName: string
  }

  type fileOfMinioParams = {
    bucket: string
    objectName: string
  }

  type fileOfMinioParams = {
    id: number
  }

  type fileOfMinioParams = {
    bucket: string
    objectName: string
  }

  type fileOfMinioParams = {
    bucket: string
  }

  type fileOfMinioParams = {
    sourceBucket: string
    sourceObject: string
    targetBucket: string
    targetObject: string
  }

  type FileOnlyInfo = {
    id?: number
    /** 文件名 */
    fileName?: string
    /** 上一级id */
    parentId?: number
    /** 上一级名称 */
    parentName?: string
    /** 项目Id */
    projectId?: string
    /** 文件码 */
    fileCode?: string
    /** 状态 */
    status?: number
    /** 文件的唯一号,目录及子文件一致 */
    uniqueId?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type FilesMinio = {
    id?: number
    uploadId?: string
    md5?: string
    url?: string
    bucket?: string
    object?: string
    originFileName?: string
    size?: number
    type?: string
    chunkSize?: number
    chunkCount?: number
    isDelete?: string
    createTime?: string
  }

  type FileUploadInfo = {
    md5: string
    uploadId: string
    originFileName: string
    url?: string
    object?: string
    type?: string
    size: number
    chunkCount: number
    chunkSize: number
    contentType?: string
    listParts?: number[]
  }

  type FindByIdsQueryPayload = {
    ids?: string[]
    uniqueField?: string
    targetFields?: string[]
  }

  type findIconTypeOfProjectIconTypeParams = {
    typeName: string
  }

  type findResourceTypeOfProjectResourceDatatypeParams = {
    typeName: string
  }

  type findResourceTypeOfProjectResourceTypeParams = {
    typeName: string
  }

  type findResourceVersionOfProjectResourceVersionParams = {
    versionName: string
  }

  type getByIdOfCommonParams = {
    id: number
  }

  type getByIdOfEngineeringDataParams = {
    id: number
  }

  type getByIdOfFileInfoParams = {
    id: number
  }

  type getByIdOfFileOnlyInfoParams = {
    id: string
  }

  type getByIdOfProjectEngineeringDataListColumnParams = {
    id: number
  }

  type getByIdOfProjectEngineeringDataListRowParams = {
    id: number
  }

  type getByIdOfProjectIconInfoParams = {
    id: number
  }

  type getByIdOfProjectIconInfoParams = {
    id: number
  }

  type getByIdOfProjectIconTypeParams = {
    id: number
  }

  type getByIdOfProjectResourceDatatypeParams = {
    id: number
  }

  type getByIdOfProjectResourceInfoParams = {
    id: number
  }

  type getByIdOfProjectResourceParams = {
    id: number
  }

  type getByIdOfProjectResourceTypeParams = {
    id: number
  }

  type getByIdOfProjectResourceVersionParams = {
    id: number
  }

  type getByParamOfProjectIconInfoParams = {
    /** 是否收藏 */
    isCollection?: number
    /** 图标类型id */
    typeId?: number
    /** 图标名称 */
    iconName?: string
    /** 平台类型:'BIM','BABYLON_WEB','U3D_WEB','U3D','U3D_ALL' */
    resFromPlatform: string
    /** 排序规则1最后更新时间升序,2最后更新时间降序 */
    sort?: number
    /** 页数 */
    page?: number
    /** 长度 */
    size?: number
  }

  type getByParamOfProjectResourceInfoParams = {
    /** 是否收藏 */
    isCollection?: number
    /** 资源类型编码 */
    typeCode?: string
    /** 资源名称 */
    resourceName?: string
    /** 排序规则1最后更新时间升序,2最后更新时间降序 */
    sort?: number
    /** 页数 */
    page?: number
    /** 长度 */
    size?: number
    /** 类型 */
    artResType?: string
    /** 平台类型:'BIM','BABYLON_WEB','U3D_WEB','U3D','U3D_ALL' */
    resFromPlatform: string
  }

  type getByParamOfProjectResourceParams = {
    /** 是否收藏 */
    isCollection?: number
    /** 资源类型Code */
    typeCode?: any
    /** 资源名称 */
    resourceName?: string
    /** 排序规则1最后更新时间升序,2最后更新时间降序 */
    sort?: number
    /** 页数 */
    page?: number
    /** 长度 */
    size?: number
    /** 类型 */
    artResType?: string
    /** 资源数据类型id */
    resourceDataTypeId?: number
    /** 文件根目录 */
    rootDirName?: string
  }

  type getByProjectIdOfFileOnlyInfoParams = {
    projectId: string
  }

  type getByProjectIdOfProjectIconInfoParams = {
    resFromPlatform: string
    projectId: string
  }

  type getByProjectIdOfProjectResourceInfoParams = {
    resFromPlatform: string
    projectId: string
  }

  type getByProjectIdOfProjectResourceParams = {
    projectId: string
  }

  type getByUniqueIdOfProjectIconInfoParams = {
    resFromPlatform: string
    uniqueId: string
  }

  type getByUniqueIdOfProjectResourceInfoParams = {
    resFromPlatform: string
    uniqueId: string
  }

  type getByUniqueIdOfProjectResourceParams = {
    uniqueId: string
  }

  type getChildrenSceneListOfProjectEngineeringParams = {
    parentId: number
  }

  type getDeviceInfoOfAssociationObjectParams = {
    type: string
  }

  type getFileInfoByParentIdOfFileInfoParams = {
    parentId: number
  }

  type getImgOfFileInfoParams = {
    uploadPath: string
  }

  type getIsPublishListOfProjectEngineeringParams = {
    platformType: string
  }

  type getLabelByNameOfAssociationObjectParams = {
    tableName: string
  }

  type getLabelByTypeOrSpaceOfAssociationObjectParams = {
    typeOrSpace: string
  }

  type getModelSceneCountOfProjectResourceInfoParams = {
    resFromPlatform: string
  }

  type getProjectIdComponentInfoOfComponentInfoParams = {
    projectId: string
  }

  type getSceneInfoOfProjectEngineeringParams = {
    platformType: string
    id: number
  }

  type getSceneListOfProjectEngineeringParams = {
    platformType: string
    sort?: string
    id?: number
    project?: string
    name?: string
    nodes?: string
    comsInstance?: string
    type?: string
    isPublish?: number
    findType?: string
  }

  type getSceneLockedOfProjectEngineeringParams = {
    sceneId: number
  }

  type getTaskEventCodeOfTaskEventParams = {
    command: string
    deviceCode: string
  }

  type getTaskEventOfTaskEventParams = {
    id: number
  }

  type getTaskEventSceneIdOfTaskEventParams = {
    sceneId: number
  }

  type getTaskEventTaskIdOfTaskEventParams = {
    taskId: string
  }

  type getTaskEventUniqueIdOfTaskEventParams = {
    uniqueId: string
  }

  type getUniqueIdComponentInfoOfComponentInfoParams = {
    componentUniqueId: string
  }

  type getVirtualCameraOfVirtualCameraParams = {
    virtualCameraId: number
  }

  type getVirtualCameraSceneIdOfVirtualCameraParams = {
    sceneId: number
  }

  type Glass = {
    colorHex?: string
    metallic?: number
    smoothness?: number
    refractionModel?: number
    indexOfRefraction?: number
    thickness?: number
  }

  type groupOfEngineeringParams = {
    engineeringId: number
    /** 分组ID */
    id?: string
  }

  type Header = {
    elements?: HeaderElement[]
    name?: string
    value?: string
  }

  type HeaderElement = {
    name?: string
    value?: string
    parameterCount?: number
    parameters?: NameValuePair[]
  }

  type HttpEntity = {
    content?: Record<string, any>
    contentLength?: number
    contentType?: Header
    contentEncoding?: Header
    repeatable?: boolean
    chunked?: boolean
    streaming?: boolean
  }

  type IconInfo = {
    id?: number
    /** 项目id */
    projectId?: string
    /** 资源唯一标识 */
    uniqueId?: string
    /** 图标名称 */
    iconName: string
    /** 图标路径 */
    iconPath?: string
    /** 平台类型:'BIM','BABYLON_WEB','U3D_WEB','U3D' */
    resFromPlatform: string
    /** 是否收藏 */
    isCollection?: number
    /** 图标类型id */
    typeId?: number
    /** 图标类型名称 */
    typeName?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type IconType = {
    id?: number
    /** 类型编码 */
    typeCode?: string
    /** 图标分类名称 */
    typeName: string
    /** 状态 */
    status?: number
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type IsPublishVO = {
    /** 名称 */
    name?: string
    /** 数据库id */
    id?: number
    /** 是否发布0未发布 1发布 */
    isPublish?: number
    /** 平台类型 */
    platformType?: string
    /** 已发布场景的url路径 */
    url?: string
  }

  type judgeArtResNameOfProjectResourceInfoParams = {
    id: number
    artResName: string
  }

  type judgeIconNameOfProjectIconInfoParams = {
    resFromPlatform: string
    id?: number
    iconName: string
  }

  type judgeResourceNameOfProjectResourceInfoParams = {
    resFromPlatform: string
    id?: number
    resourceName: string
  }

  type judgeResourceNameOfProjectResourceParams = {
    id: number
    resourceName: string
  }

  type judgeSceneNameOfProjectEngineeringParams = {
    platformType: string
    id: number
    sceneName: string
  }

  type judgeUniqueIdOfProjectIconInfoParams = {
    id: number
    uniqueId: string
  }

  type judgeUniqueIdOfProjectResourceInfoParams = {
    id: number
    uniqueId: string
  }

  type KafkaMessageDTO = {
    type?: string
    version?: string
    data?: Record<string, any>
  }

  type KafkaTopicVO = {
    /** 主题名称（不带前缀） */
    topicName?: string
    /** 主题的中文描述 */
    description?: string
    /** 带前缀的主题名称 */
    prefixedTopicName?: string
  }

  type LabelVo = {
    typeOrSpace?: string
    value?: string[][]
  }

  type LicenseCreatorParam = {
    issuedTime?: string
    expiryTime?: string
    consumerType?: string
    consumerAmount?: number
    company?: string
    description?: string
    systemInfo?: SystemInfo
    csExpiryTime?: string
  }

  type ListResultAlertScheme = {
    code?: number
    data?: AlertScheme[]
    msg?: string
  }

  type ListResultAssociationObject = {
    code?: number
    data?: AssociationObject[]
    msg?: string
  }

  type ListResultBatchConversion = {
    code?: number
    data?: BatchConversion[]
    msg?: string
  }

  type ListResultComponentInfo = {
    code?: number
    data?: ComponentInfo[]
    msg?: string
  }

  type ListResultDeviceInfoCbds = {
    code?: number
    data?: DeviceInfoCbds[]
    msg?: string
  }

  type ListResultDeviceStatusCbds = {
    code?: number
    data?: DeviceStatusCbds[]
    msg?: string
  }

  type ListResultEngineeringData = {
    code?: number
    data?: EngineeringData[]
    msg?: string
  }

  type ListResultEngineGroupInfoVO = {
    code?: number
    data?: EngineGroupInfoVO[]
    msg?: string
  }

  type ListResultFileInfoBase = {
    code?: number
    data?: FileInfoBase[]
    msg?: string
  }

  type ListResultFilesMinio = {
    code?: number
    data?: FilesMinio[]
    msg?: string
  }

  type ListResultIconInfo = {
    code?: number
    data?: IconInfo[]
    msg?: string
  }

  type ListResultIconType = {
    code?: number
    data?: IconType[]
    msg?: string
  }

  type ListResultIsPublishVO = {
    code?: number
    data?: IsPublishVO[]
    msg?: string
  }

  type ListResultMapObjectObject = {
    code?: number
    data?: Record<string, any>[]
    msg?: string
  }

  type ListResultProjectEngineeringVO = {
    code?: number
    data?: ProjectEngineeringVO[]
    msg?: string
  }

  type ListResultResource = {
    code?: number
    data?: Resource[]
    msg?: string
  }

  type ListResultResourceDataType = {
    code?: number
    data?: ResourceDataType[]
    msg?: string
  }

  type ListResultResourceInfo = {
    code?: number
    data?: ResourceInfo[]
    msg?: string
  }

  type ListResultResourceType = {
    code?: number
    data?: ResourceType[]
    msg?: string
  }

  type ListResultResourceVersion = {
    code?: number
    data?: ResourceVersion[]
    msg?: string
  }

  type ListResultString = {
    code?: number
    data?: string[]
    msg?: string
  }

  type ListResultTaskEvent = {
    code?: number
    data?: TaskEvent[]
    msg?: string
  }

  type ListResultTaskEventVO = {
    code?: number
    data?: TaskEventVO[]
    msg?: string
  }

  type ListResultVirtualCamera = {
    code?: number
    data?: VirtualCamera[]
    msg?: string
  }

  type MaterialBaseDTO = {
    /** 图片名称 */
    textureName?: string
    /** 类型 */
    type?: string
    /** 分辨率 */
    resolution?: string
    /** Base64加密 */
    relativePath?: string
  }

  type MaterialDTO = {
    images?: MaterialBaseDTO[]
  }

  type MaterialPageVo = {
    /** 名字 */
    materialName?: string
    /** 类型id */
    typeId?: number
    /** 页数 */
    page?: number
    /** 长度 */
    size?: number
  }

  type MaterialReturnDTO = {
    id?: number
    /** 名字 */
    materialName?: string
    /** 类型 */
    typeId?: number
    previews?: MaterialDTO
    /** 多图片信息数组 */
    maps?: MaterialBaseDTO[]
    /** 图片地址前缀(加上文件名就可以访问) */
    photoAddressPrefix?: string
    glass?: Glass
  }

  type MaterialReturnWebVo = {
    /** 总条数 */
    countMax?: number
    /** 总页数 */
    pageMax?: number
    materialWebVos?: MaterialWebVo[]
  }

  type MaterialWebVo = {
    id?: number
    /** 名字 */
    materialName?: string
    /** 类型Id */
    typeId?: number
    /** 图片相关信息 */
    previews?: string
    /** 图片地址前缀(加上文件名就可以访问) */
    photoAddressPrefix?: string
  }

  type MinioFileVO = {
    /** bucket名称 */
    bucket?: string
    /** 文件名称 */
    objectName?: string
  }

  type ModelSceneCountDTO = {
    /** 模型数量 */
    modelSize?: number
    /** 场景数量 */
    sceneSize?: number
  }

  type NameValuePair = {
    name?: string
    value?: string
  }

  type newSceneOfProjectEngineeringParams = {
    platformType: string
    name: string
    isPublish: number
  }

  type ProjectEngineeringDeleteVO = {
    /** 数据库id */
    id: number
    /** 平台类型 */
    platformType: string
  }

  type ProjectEngineeringPublishVO = {
    /** 数据库id */
    id: number
    /** 是否发布0未发布 1发布 */
    isPublish: number
    /** 平台类型 */
    platformType: string
  }

  type ProjectEngineeringUpdateVO = {
    /** 数据库id */
    id: number
    /** 平台类型;3d-web,3d-unity,3d-ue */
    platformType: string
    /** 组件 */
    comsInstance?: string
    /** 场景配置信息，babylon用 */
    sceneConfigInfo?: string
    /** 图标信息列表 */
    iconInfos?: string
  }

  type ProjectEngineeringVO = {
    /** 平台类型 */
    platformType: string
    /** 数据库id */
    id?: number
    /** gisInfo */
    gisInfo?: Record<string, any>
    /** 项目 */
    project?: string
    /** 名称 */
    name?: string
    /** 类型 */
    type?: string
    /** 节点 */
    nodes?: Record<string, any>
    /** 组件 */
    comsInstance?: Record<string, any>
    /** 是否公开 */
    isPublish?: number
    /** 当前版本号 每修改一次增加1 */
    version?: number
    /** 状态 0 删除 1正常 2旧版本(修改遗留) */
    status?: number
    /** 状态信息 */
    stateInfos?: Record<string, any>
    /** releaseStateUuid */
    releaseStateUuid?: string
    /** 锁定的节点列表 */
    lockedGameobjectList?: Record<string, any>
    /** 摄像机初始位置 */
    cameraInitialPosition?: Record<string, any>
    /** 摄像机初始角度 */
    cameraInitialEuler?: Record<string, any>
    /** 公共组件属性列表 */
    commComJsons?: Record<string, any>
    /** U3D唯一ID */
    sceneResId?: string
    /** 更新时间 */
    updateTime?: string
    /** 编辑人 */
    editor?: string
    /** 组件信息集合 */
    comPoints?: Record<string, any>
    /** 组件-身上的脚本集合 */
    hotfixComponents?: Record<string, any>
    /** 组件-实例信息 */
    dicComSystemInfo?: Record<string, any>
    /** 上传时间 */
    uploadTime?: string
    /** 场景图片 */
    photoAddress?: string
    /** 场景配置信息，babylon用 */
    sceneConfigInfo?: Record<string, any>
    /** 图标信息列表 */
    iconInfos?: Record<string, any>
    /** 加载顺序 */
    batchConfig?: string[][]
    childSceneIds?: number[]
    /** 场景类型 */
    sceneType?: string
    /** 区块大小 */
    chunkSize?: number
    /** 区块数据 */
    validChunkCoords?: Record<string, any>
    /** 依赖AB资源 */
    dependentAssetBundles?: Record<string, any>
    /** 依赖资源 */
    dependentResources?: Record<string, any>
    /** 区块数量 */
    totalChunks?: number
    /** 场景实例数量 */
    totalInstances?: number
    /** 数据检查信息 */
    dataChecksum?: string
    /** 数据格式版本 */
    dataFormatVersion?: number
    /** 创建人 */
    createdBy?: string
    /** 场景包围盒 */
    sceneBounds?: Record<string, any>
    /** 场景中心坐标 */
    sceneCenter?: Record<string, any>
    /** 场景描述 */
    description?: string
    /** x */
    thumbnailData?: string
    /** 创建时间 */
    createTime?: string
    /** 更新人 */
    updateBy?: string
    saveEngineGroupVO?: SaveEngineGroupVO
  }

  type ProjectIconInfoPageVO = {
    /** 总条数 */
    countMax?: number
    /** 总页数 */
    pageMax?: number
    /** 图标列表 */
    projectIconInfoList?: IconInfo[]
  }

  type ProjectResourceInfoPageVO = {
    /** 总条数 */
    countMax?: number
    /** 总页数 */
    pageMax?: number
    /** 资源列表 */
    projectResourceInfoList?: ResourceInfo[]
  }

  type ProjectResourcePageVO = {
    /** 总条数 */
    countMax?: number
    /** 总页数 */
    pageMax?: number
    /** 资源列表 */
    projectResourceList?: Resource[]
  }

  type queryOfProjectEngineeringieParams = {
    /** 场景ID */
    sceneId: string
  }

  type removeOfFileInfoParams = {
    fileName: string
    parentId: number
    id: number
  }

  type Resource = {
    id?: number
    /** 资源文件目录名称 */
    artResName?: string
    /** 资源类型 */
    artResType?: string
    /** 资源文件相对路径(art_res_name/asset_name） */
    assetBundelName?: string
    /** 资源文件绝对路径 */
    previewPath?: string
    /** 资源文件名称 */
    assetName?: string
    /** String */
    previewOutPath?: string
    /** String */
    uniqueId?: string
    /** String */
    keyId?: string
    /** 资源项目Id */
    projectId?: string
    /** 是否收藏 */
    isCollection?: number
    /** 资源类型id */
    typeCode?: number
    /** 资源类型名称 */
    typeName?: string
    /** 资源名称 */
    resourceName?: string
    /** 上传时间 */
    uploadTime?: string
    /** 上传人名字 */
    uploadUserName?: string
    /** 上传人Id */
    uploadUserId?: number
    /** 展示图地址 */
    bannerAddress?: string
    /** 展示图名字 */
    bannerName?: string
    /** 上传渠道 */
    resFromPlatform?: string
    /** 修改时间 */
    updateTime?: string
    /** 资源数据类型 */
    resourceDataType?: string
    /** 资源数据类型id */
    resourceDataTypeId?: number
    /** 文件根目录 */
    rootDirName?: string
    /** gif图路径 */
    gifPath?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type ResourceDataType = {
    id?: number
    /** 类型名称 */
    typeName?: string
    /** 状态 */
    status?: number
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type ResourceInfo = {
    id?: number
    /** 平台类型:'BIM','BABYLON_WEB','U3D_WEB','U3D' */
    resFromPlatform: string
    /** 创建者Id */
    createdBy?: number
    /** 创建者 */
    createUser?: string
    /** 创建时间 */
    createTime?: string
    /** 更新者Id */
    lastModifiedBy?: number
    /** 更新人 */
    updateUser?: string
    /** 更新时间 */
    updateTime?: string
    /** 项目id */
    projectId?: string
    /** 资源名称 */
    artResName?: string
    /** 资源类型 */
    artResType?: string
    /** 资源版本号ID */
    artResVersionId?: number
    /** 资源版本号 */
    artResVersion?: string
    /** AB资源相对路径 */
    assetBundelName?: string
    /** 资源预制体名称 */
    assetName?: string
    /** 资源唯一标识 */
    uniqueId?: string
    /** 资源在文件服务器上相对路径 */
    artResRelativePath?: string
    /** 美术资源原始JSON信息 */
    artResRawData?: string
    /** 是否收藏 */
    isCollection?: number
    /** 资源类型id */
    typeCode?: string
    /** 资源类型名称 */
    typeName?: string
    /** 资源名称（支持中文、英文、数字、下划线、短横线和点号，长度1-50个字符） */
    resourceName: string
    /** 展示图地址 */
    bannerAddress?: string
    /** 展示图名字 */
    bannerName?: string
    /** 美术资源文件根目录 */
    rootDirName?: string
  }

  type ResourceType = {
    id?: number
    /** 分类编码 */
    typeCode?: string
    /** 资源分类名称 */
    typeName: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 组织机构id */
    orgIdPath?: string
    /** 应用id */
    appId?: number
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type ResourceVersion = {
    id?: number
    /** 版本号 */
    versionName?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }

  type SaveEngineGroupVO = {
    /** 删除的分组ID列表 */
    delIdList?: number[]
    /** 新增的分组信息列表 */
    addGroupList?: EngineGroupInfoVO[]
    /** 修改的分组信息列表 */
    updGroupList?: EngineGroupInfoVO[]
  }

  type saveFilePathOfFileInfoParams = {
    projectId: string
  }

  type selectByIdOfMaterialParams = {
    id: number
  }

  type sendOfCommonParams = {
    isSleep: boolean
    topic: string
  }

  type StatObjectResponse = true

  type SystemInfo = {
    uuid?: string
    cpuId?: string
    mainBoardSerial?: string
  }

  type TaskEvent = {
    id?: number
    /** 场景ID */
    sceneId?: number
    /** 外部任务ID */
    externalTaskId?: string
    /** 外部任务名称 */
    externalTaskName?: string
    /** 任务ID */
    taskId?: string
    /** 任务Code */
    command?: string
    /** 设备Code */
    deviceCode?: string
    /** 任务类型：
Path       // 路径任务   
Custom // 自定义任务
AniTimeline  //Timeline
AniSystem  //动画控制器
NodeActive //节点显隐
VehicleMovement //车辆移动
NodeBind //节点换绑
AniAxisControl //轴向控制器
StateChange //状态变更
HeavyLoadHoisting //重载吊车
ring_holding //抱环 */
    taskType?: string
    /** 对象的唯一标识 */
    uniqueId?: string
    /** 动画片段名字 */
    animationClipName?: string
    /** timeline资源名字 */
    timelineAssetName?: string
    /** 动画开始时间 */
    startTime?: number
    /** 动画结束时间 */
    endTime?: number
    /** 动画是否循环播放 */
    isLoop?: boolean
    /** 任务执行时间(毫秒) */
    executionTime?: number
    /** 路径点(可选)-JSON数据结构 */
    pathPoints?: string
    /** 显示节点-JSON数据结构 */
    activeNode?: string
    /** 隐藏节点-JSON数据结构 */
    hiddenNode?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
    /** 是否使用平滑运动 */
    useSmoothMovement?: string
    /** 平滑移动持续时间（秒） */
    moveDuration?: number
    /** 是否使用平滑旋转 */
    useSmoothRotation?: string
    /** 旋转轴约束（锁定特定轴） */
    customAxisConstraint?: string
    /** 解绑节点 */
    unbindNode?: string
    /** 解绑节点的父节点 */
    unbindSubNode?: string
    /** 解绑节点的目标节点 */
    unbindTargetNode?: string
    /** 状态颜色 */
    stateColors?: string
    /** 大车 */
    mainCar?: string
    /** 小车 */
    subCar?: string
    /** 吊钩 */
    hook?: string
    /** 大车起始坐标 */
    mainCarStartPos?: string
    /** 大车移动轴向 */
    mainCarAxis?: string
    /** 大车最大行程(米) */
    mainCarMaxTravel?: number
    /** 小车起始坐标 */
    subCarStartPos?: string
    /** 小车移动轴向 */
    subCarAxis?: string
    /** 小车最大行程(米) */
    subCarMaxTravel?: number
    /** 吊钩起始坐标 */
    hookStartPos?: string
    /** 吊钩移动轴向 */
    hookAxis?: string
    /** 吊钩最大升降高度(米) */
    hookMaxHeight?: number
    /** 坐标系 */
    coordinateSystem?: number
    /** 移动节点 */
    moveNode?: string
    /** 移动轴向 */
    moveAxis?: string
    /** 悬臂吊旋转节点 */
    nodeRotation?: string
    /** 悬臂吊滑块节点 */
    nodeSlide?: string
    /** 悬臂吊固定吊点节点 */
    nodeFixedHinge?: string
    /** 悬臂吊移动吊点1 */
    nodeMoveHinge1?: string
    /** 悬臂吊移动吊点2 */
    nodeMoveHinge2?: string
    /** 滑块节点移动方向 */
    sliderDirection?: string
    /** 移动吊点1移动方向 */
    moveHinge1Direction?: string
    /** 移动吊点2移动方向 */
    moveHinge2Direction?: string
    /** 虚拟摄像头 */
    virtualCamera?: number
    /** AGV升降节点 */
    liftingNode?: string
  }

  type TaskEventVO = {
    id?: number
    /** 场景ID */
    sceneId?: number
    /** 外部任务ID */
    externalTaskId?: string
    /** 外部任务名称 */
    externalTaskName?: string
    /** 任务ID */
    taskId?: string
    /** 任务Code */
    command?: string
    /** 设备Code */
    deviceCode?: string
    /** 任务类型：
Path       // 路径任务   
Custom // 自定义任务
AniTimeline  //Timeline
AniSystem  //动画控制器
NodeActive //节点显隐
VehicleMovement //车辆移动
NodeBind //节点换绑
AniAxisControl //轴向控制器
StateChange //状态变更
HeavyLoadHoisting //重载吊车
ring_holding //抱环 */
    taskType?: string
    /** 对象的唯一标识 */
    uniqueId?: string
    /** 动画片段名字 */
    animationClipName?: string
    /** timeline资源名字 */
    timelineAssetName?: string
    /** 动画开始时间 */
    startTime?: number
    /** 动画结束时间 */
    endTime?: number
    /** 动画是否循环播放 */
    isLoop?: boolean
    /** 任务执行时间(毫秒) */
    executionTime?: number
    /** 路径点(可选)-JSON数据结构 */
    pathPoints?: string[]
    /** 显示节点-JSON数据结构 */
    activeNode?: string[]
    /** 隐藏节点-JSON数据结构 */
    hiddenNode?: string[]
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
    /** 是否使用平滑运动 */
    useSmoothMovement?: string
    /** 平滑移动持续时间（秒） */
    moveDuration?: number
    /** 是否使用平滑旋转 */
    useSmoothRotation?: string
    /** 旋转轴约束（锁定特定轴） */
    customAxisConstraint?: string
    /** 解绑节点 */
    unbindNode?: string
    /** 解绑节点的父节点 */
    unbindSubNode?: string
    /** 解绑节点的目标节点 */
    unbindTargetNode?: string
    /** 状态颜色 */
    stateColors?: string
    /** 大车 */
    mainCar?: string
    /** 小车 */
    subCar?: string
    /** 吊钩 */
    hook?: string
    /** 大车起始坐标 */
    mainCarStartPos?: string
    /** 大车移动轴向 */
    mainCarAxis?: string
    /** 大车最大行程(米) */
    mainCarMaxTravel?: number
    /** 小车起始坐标 */
    subCarStartPos?: string
    /** 小车移动轴向 */
    subCarAxis?: string
    /** 小车最大行程(米) */
    subCarMaxTravel?: number
    /** 吊钩起始坐标 */
    hookStartPos?: string
    /** 吊钩移动轴向 */
    hookAxis?: string
    /** 吊钩最大升降高度(米) */
    hookMaxHeight?: number
    /** 坐标系 */
    coordinateSystem?: number
    /** 移动节点 */
    moveNode?: string
    /** 移动轴向 */
    moveAxis?: string
    /** 悬臂吊旋转节点 */
    nodeRotation?: string
    /** 悬臂吊滑块节点 */
    nodeSlide?: string
    /** 悬臂吊固定吊点节点 */
    nodeFixedHinge?: string
    /** 悬臂吊移动吊点1 */
    nodeMoveHinge1?: string
    /** 悬臂吊移动吊点2 */
    nodeMoveHinge2?: string
    /** 滑块节点移动方向 */
    sliderDirection?: string
    /** 移动吊点1移动方向 */
    moveHinge1Direction?: string
    /** 移动吊点2移动方向 */
    moveHinge2Direction?: string
    /** 虚拟摄像头 */
    virtualCamera?: number
    /** AGV升降节点 */
    liftingNode?: string
  }

  type TestData = {
    id?: number
    /** 用户名 */
    userName?: string
    /** 经度 */
    longitude?: number
    /** 纬度 */
    latitude?: number
    /** 位置类型 */
    posType?: string
  }

  type toGltfOfBatchConversionParams = {
    id: number
  }

  type unlockSceneOfProjectEngineeringParams = {
    sceneId: number
  }

  type updateByIdOfCommonParams = {
    id: number
  }

  type updateByIdOfEngineeringDataParams = {
    id: number
  }

  type updateByIdOfFileInfoParams = {
    id: number
  }

  type updateByIdOfFileOnlyInfoParams = {
    id: string
  }

  type updateByIdOfProjectEngineeringDataListColumnParams = {
    id: number
  }

  type updateByIdOfProjectEngineeringDataListRowParams = {
    id: number
  }

  type updateByIdOfProjectIconInfoParams = {
    id: number
  }

  type updateByIdOfProjectIconTypeParams = {
    id: number
  }

  type updateByIdOfProjectResourceDatatypeParams = {
    id: number
  }

  type updateByIdOfProjectResourceInfoParams = {
    id: number
  }

  type updateByIdOfProjectResourceParams = {
    id: number
  }

  type updateByIdOfProjectResourceTypeParams = {
    id: number
  }

  type updateByIdOfProjectResourceVersionParams = {
    id: number
  }

  type updateSceneNameOfProjectEngineeringParams = {
    id: number
    name: string
    platformType: string
  }

  type uploadsOfFileInfoParams = {
    uploadFiles: string[]
    artResName?: string
    artResType?: string
    assetBundelName?: string
    assetName?: string
    previewOutPath?: string
    uniqueId?: string
    resFromPlatform?: string
    /** 资源项目Id */
    projectId?: string
    /** 路径 */
    uploadPath?: string
    /** 文件根目录 */
    rootDirName?: string
  }

  type uploadsSaveWebOfFileInfoParams = {
    filePath: string
  }

  type uploadUpdateOfProjectEngineeringParams = {
    /** 子场景ID列表 */
    childSceneIds?: string
    /** 平台类型 */
    platformType: string
    /** 场景ID */
    id?: string
    /** 场景名称 */
    name?: string
    /** 场景图片地址 */
    photoAddress?: string
    /** 场景类型 */
    sceneType: string
  }

  type uploadUpdateOfProjectEngineeringParams = {
    /** 子场景ID列表 */
    childSceneIds?: string
    /** 平台类型 */
    platformType: string
    /** 场景ID */
    id?: string
    /** 场景名称 */
    name?: string
    /** 场景图片地址 */
    photoAddress?: string
    /** 场景类型 */
    sceneType: string
  }

  type UploadUrlsVO = {
    uploadId?: string
    urls?: string[]
  }

  type VirtualCamera = {
    id?: number
    /** 场景ID */
    sceneId?: number
    /** 外部虚拟相机ID */
    cameraExternalId?: number
    /** 相机名称 */
    cameraName?: string
    /** 相机坐标 */
    vcPos?: string
    /** 相机旋转 */
    vcRotation?: string
    /** 相机权重 */
    vcPriority?: string
    /** 是否跟随 */
    isFollowing?: boolean
    /** 相机跟随 */
    vcFollowObject?: string
    /** 跟随路径偏移 */
    vcFollowOffset?: string
    /** 朝向 */
    vcLookAt?: string
    /** 创建者 */
    createUser?: string
    /** 更新人 */
    updateUser?: string
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建者Id */
    createdBy?: number
    /** 更新者Id */
    lastModifiedBy?: number
  }
}
}
