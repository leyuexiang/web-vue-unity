# Unity 云渲染与三维专项接口

日期：2026-10-20。本文覆盖后期迁移的三维能力，不代表已经接入当前正式页面。

## 1. 三种契约边界

| 类别 | 状态 | 实现责任 |
| --- | --- | --- |
| 场景/资源/植被/地理信息业务接口 | 来源已有契约和适配器；当前项目业务后端从零开发 | 业务后端，沿用原业务逻辑 |
| 信令及 Unity `editor.v1` | 当前项目保留了传输和协议实现，正式迁移页尚未接入 | 信令服务、启动器、Unity 与前端共同实现 |
| 云渲染会话控制接口与高级运行命令 | 既有迁移计划中的目标设计，尚未冻结/完整实现 | 后端与各端评审后开发；不当作现成接口 |

二维仍由浏览器运行，Unity 只承担三维；四包仍由业务后台保存。灯光、天气、材质等设计状态保存到三维包，运行效果通过 Unity 命令呈现，不必为每个参数新增后端持久化接口。

## 2. 模型与 Unity 资源交付

模型目录、压缩包上传、资源元信息、文件与字典接口沿用 [业务接口第 5 节](01-业务接口与后端实施契约.md)。模型管理页在二维阶段也需要这些接口，不能全部延期到三维。

当前 `uploadConvert` 返回网页模型资源 `resourceRelativePath`，不保证 Unity 能直接加载。旧云渲染协议资源结构有：

```json
{"resourceKey":"model-pump","assetId":"500001","kind":"model","contentHash":"摘要","delivery":{"type":"assetBundle","bundleKey":"pump-bundle","assetName":"Pump"}}
```

`delivery.type` 当前类型为 Unity 资产包（assetBundle）或可寻址资产（addressables）。这里是**已保留的旧协议结构**，不是来源正式 `AssetRef` 已具备相同字段。后续须定义源文件格式、Unity 构建版本/目标平台、转换产物、存储位置、稳定编号和失效策略。当前没有独立“转换到 Unity 资产”的正式接口路径，不捏造一个立即可用的端点。

后端需保留原模型身份和元信息，资源转换可在同一资源记录上关联派生产物或独立投影；不能直接把网页 `.gltf/.glb` 地址改后缀当 Unity 资产包。植被生成当前只接受已发布的二进制模型（GLB），其生成约束与 Unity 资产交付是两件事。

## 3. 地理信息系统数据

### 3.1 切片目录

当前代码原始请求：`GET /api/webgis/info/list?dataType={值}`。通用请求层插入平台段，运营端实际为 `/api/operation/webgis/info/list`，租户端为 `/api/tenant/web/webgis/info/list`。

来源开放接口规范（OpenAPI）相对路径曾写 `/webgis/info/list`，旧维护文档早期还写 `/admin-api/webgis/info/list`；**当前代码使用 `/api`**。新后端应按当前外部网关路径冻结，不能三种路径任意混用。当前函数没有使用 `VITE_DIM3D_SERVER_URL`，请求是网页同源，部署需代理该地址。

查询 `dataType:string` 必填，现有用途 `ELEVATION` 高程、`SATELLITE` 影像；更多枚举未确认。返回 `{code:200,msg:string,data:GisInfo[]}`，不是分页。

| 字段 | 类型 | 含义/注意事项 |
| --- | --- | --- |
| `id` | 字符串编号 | 当前旧前端声明数字；新后端仍应传字符串并安排类型修正 |
| `gisName` | 字符串 | 切片/数据名称 |
| `dataType` | 字符串 | 数据用途 |
| `coordinate` | 字符串 | 坐标系说明，完整编码格式待确认 |
| `level` | 整数 | 切片层级，最高/最低层含义待确认 |
| `tileSize` | 字符串 | 契约明确是字符串，不能未经兼容改成数字 |
| `path,fileName` | 字符串 | 切片目录及文件名；需要可在实际消费端访问 |
| `sliceFlag` | 布尔 | 是否切片的具体状态语义待确认 |
| `sliceRule` | 字符串 | 来源识别 `xyz/tms`；完整规则与大小写待冻结 |
| `latitude,longitude` | 字符串 | 数据位置，精度/坐标系待确认 |

模型/场景均保留地理坐标、垂直基准、地形/影像来源和坐标转换信息。Unity 是否支持对应地理数据格式、投影和高程查询须能力验证，不因前端曾支持浏览器地理引擎就宣称 Unity 已支持。

### 3.2 暂不创造的新接口

来源的地形高度采样、屏幕拾取、相机飞行和地理变换大量属于渲染运行时端口，不自动变成后端接口。若 Unity 需要服务器采样/坐标服务，须在三维阶段给出格式、批量大小、单位、误差与返回模型后单独冻结。

## 4. 植被静态任务与发布

### 4.1 接口清单

均采用业务前缀 `/api/operation` 或 `/api/tenant/web`，登录头与公共业务规则相同。

| 方法与相对路径 | 请求 | `data` |
| --- | --- | --- |
| `POST /dim3d/vegetation/generation-task/create` | 正文 `GenerationRequest` | `Task` |
| `GET /dim3d/vegetation/generation-task/{taskId}` | 路径非空字符串任务号 | `Task` |
| `POST /dim3d/vegetation/generation-task/{taskId}/cancel` | 无正文 | `Task`，不是空响应 |
| `POST /dim3d/vegetation/generation-task/{taskId}/publish` | 无正文 | `Publication` |
| `GET /dim3d/vegetation/generation-task/scene/{sceneId}/current` | 场景编号 | `Publication` |
| `GET /dim3d/vegetation/generation-task/scene/{sceneId}/history` | 场景编号，无分页 | `Publication[]` |
| `POST /dim3d/vegetation/generation-task/scene/{sceneId}/rollback` | 查询 `publicationVersion:string`，无正文 | `Publication` |
| `POST /dim3d/vegetation/dynamic-tile/window` | 正文 `DynamicWindowRequest` | `DynamicWindowResponse` |

统一外层 `{code:200,msg,data}`。`taskId` 可能由不同生成器产生，不限纯数字；`publicationVersion` 是植被产物版本，不等于场景 `publicationId`。

### 4.2 生成请求

来源任务传输类型在当前项目保留，规则组装适配器仍在参考项目，后续迁移；附录明确各自来源。

| 字段 | 类型 | 必填/来源约束 |
| --- | --- | --- |
| `sceneId` | 非空字符串 | 必填 |
| `ruleVersion` | 非空字符串 | 必填，冻结规则快照版本 |
| `rules` | `Rule[]` | 必填，至少 1 项有效规则 |
| `generatorVersion` | 字符串 | 可选，服务端冻结实际版本 |
| `seed` | 整数 | 随机种子，前端只接受安全整数；不是编号 |
| `gridSizeM` | 数字 | 网格边长，米 |
| `originLongitude,originLatitude` | 数字 | 投影原点经纬度 |
| `elevationSource` | `{url,version,verticalDatum}` | 来源海拔规则需可供后端访问的高程数据，具体条件必填由规则校验 |
| `generationRegion` | `{polygon:GeoPoint[]}` | 冻结业务生成范围，不是浏览器瞬时视口缓存 |
| `densityProfiles` | 密度档位字典 | 当前组装发送三档，见下文 |
| `clipToGenerationRegion` | 布尔 | 动态地块为真；静态按明确规则设置 |
| `dynamicTileId` | 字符串 | 单块动态任务适用；九块批量用各自 `tileId` |
| `idempotencyKey` | 字符串 | 可选，长度 0—128；空时按规范化快照生成 |

`GeoPoint={longitude:number,latitude:number}`，经度 −180—180、纬度 −90—90。多边形需闭合、有足够不同点且非零面积；规范导出的数组最小 1 项不代表单点多边形可生成。编辑器控制点第三项人工高度不进入正式高程采样输入。

`ElevationSource`：`url,version,verticalDatum` 均非空；来源领域常见 `ellipsoid/orthometric`，`unknown` 不可作为已确认高程生成来源。后端/生成器必须能访问地址，不能只提供浏览器临时令牌 URL。

### 4.3 规则、物种和密度

规则公共字段：`ruleId:string,type:polygon或corridor或altitude-zonation,layerId:string,seedOffset:number`。来源导出只强制 `ruleId`，但业务应根据类型验证下列字段；不要放任一个无几何规则进入生成器。

| 类型/分组 | 字段 |
| --- | --- |
| 多边形 | `polygon:GeoPoint[],distribution:poisson或grid或random,densityPerHectare:number,minimumSpacingM:number,minimumSlopeDegrees:number,maximumSlopeDegrees:number,species:Species[]` |
| 走廊 | `path:GeoPoint[],side:left或right或both,offsetM,spacingM,startOffsetM,endOffsetM,alignToPath:boolean,species:Species[]` |
| 海拔分带 | `scope:polygon或camera-view,polygon?:GeoPoint[],gapPolicy:leave-empty或reject,zones:AltitudeZone[]` |
| 分带项 | `zoneId:string,species:Species[],minimumAltitudeM,maximumAltitudeM,minimumSlopeDegrees,maximumSlopeDegrees,densityPerHectare,minimumSpacingM,upperTransitionWidthM` |

`Species` 必须带 `speciesId,assetId,assetUrl,assetKind`，当前只允许 `assetKind=glb`；可有 `assetVersion,weight,minimumScale,maximumScale`。编辑器规则 `id/kind` 映射为生成输入 `ruleId/type`，经纬度元组映射对象，混合条目需与物种目录合并；不能直接把整个 `VegetationSystemDefinition` 原样当生成请求。

单位：距离/高度米，坡度度，密度每公顷；边界顺序、权重和、过渡宽度、无效物种等需业务校验。来源领域模型缩放范围有约束，详见附录；不能把缺失条件值自动补成任意默认生成。

密度档位 `high/balanced/performance`，每项 `{densityRatio:number,selection:"stable-subset",tileSizeM:number}`；比例 0.0001—1，边长 1—10000 米。三档是同一确定性结果的稳定子集，不是三次独立随机生成。

### 4.4 任务与发布结果

`Task` 必须有 `taskId:string,status`，状态为 `PENDING/RUNNING/SUCCESS/PARTIAL_FAILED/FAILED/CANCELED`。可选：

- `totalTileCount,completedTileCount,failedTileCount,candidateCount,instanceCount`：非负安全整数。
- `manifestUrl,errorMessage,publicationVersion,tilesetUrl,sourceHash,generatorVersion`：字符串。
- `layerTilesetUrls:Record<layerId,string>`。
- `layerDensityTilesetUrls:Record<layerId,Partial<Record<high|balanced|performance,string>>>`。
- `densityProfiles`：上述密度字典。
- `progress`：当前扩展 `{currentStage,stageStartedAt?,phaseDurationsMs?,metrics?,totalDurationMs?,createdAt?,startedAt?,finishedAt?,failedStage?,stale?}`。来源真实导出未完整声明，不能列为旧接口必须返回的已确认字段。

`Publication` 当前消费要求 `sceneId,publicationVersion,taskId,ruleVersion,generatorVersion,manifestUrl,tilesetUrl,layerTilesetUrls,sourceHash,status,instanceCount,tileCount`。`status=STABLE/ROLLED_BACK`；密度档位映射和配置可选。

静态流程：冻结规则/资源/高程 → 创建 → 查询 → 仅 `SUCCESS` 可发布 → 查询当前稳定版本。终态停止轮询，页面退出取消在途查询。用户取消后，不允许迟到的成功查询把该任务重新放开发布。生成成功不等于已发布。

发布与回滚按场景串行，重复操作需幂等；创建同键同快照复用，同键不同快照拒绝。来源有跨租户同幂等键冲突和取消竞态缺口，新实现应把租户与主体纳入约束，不复制缺陷。没有当前版本时返回空还是 404，资料不统一，开发前确认。

整场景发布时，要验证 `threeDJson.vegetation.publication` 与当前稳定植被结果的 `publicationVersion/ruleVersion/sourceHash` 一致。前端已有检查，但新后端也应在发布事务校验，避免校验与发布间的竞态。发布快照绑定的历史植被资源不可被后来的回滚或重新生成悄悄替换。

### 4.5 动态九宫格

```json
{
  "protocolVersion":1,
  "generation":{"sceneId":"100001","ruleVersion":"rules-v1","seed":1,"gridSizeM":1000,"rules":[],"densityProfiles":{}},
  "tiles":[{
    "tileId":"tile-1","latitudeRow":1,"longitudeColumn":1,"longitudeColumnCount":360,
    "polygon":[{"longitude":104,"latitude":30},{"longitude":104.01,"latitude":30},{"longitude":104.01,"latitude":30.01},{"longitude":104,"latitude":30}],
    "originLongitude":104,"originLatitude":30,
    "cacheIdentity":{"protocolVersion":1,"sceneId":"100001","ruleVersion":"rules-v1","seed":1,"tileId":"tile-1"}
  }]
}
```

该例仅展开一块结构，**真实请求必须恰好 9 块，且 `generation.rules` 必须有效非空**；不要把缩略例直接作为合法请求。`generation` 共用正式规则快照，省略静态全局范围/原点/幂等键；每块独立提供多边形、原点和缓存身份。

`cacheIdentity` 必需 `sceneId,ruleVersion,tileId`，当前前端还发送 `protocolVersion,seed,elevationSource?`。缓存等价性由服务端对规范化输入计算，不能信客户端给出任意短键就复用他人产物。

成功 `data={protocolVersion:1,tiles:[{tileId,status,taskId?,tilesetUrl?,sourceHash?,errorMessage?}]}`。固定 9 块、顺序与请求一致、编号不可重复；`status=HIT/PENDING/RUNNING/FAILED`，不要返回遗留 `READY`。命中需可用地址，未完成返回任务号供查询；单块失败不清空其他块。`PARTIAL_FAILED` 在动态单块视图折为 `FAILED`。

来源曾采用串行调用，最坏等待约 117 秒，而当前通用网络超时较短；这不是应复制的性能保证。新服务需冻结同步预算、缓存/并发、异步投递和限流，确保前端能收到有效状态；具体上限和超时属于待评审参数。

## 5. 发布预览植被资源

`POST 业务前缀/dim3d/scenePreview/published/{publicationId}/vegetation/resources?ticket={票据}`。

正文可省略，或直接为资源键字符串数组；不能包装成对象。不传读取全部；空数组是否等同全部尚未冻结。请求键未知时按原顺序返回 `available=false` 与原因，不悄悄丢项。

外层 `{code:200,msg,data}`，数据层独立结果码：

| 数据层 `code` | 含义 |
| --- | --- |
| `OK` | 资源正常 |
| `NO_VEGETATION` | 该快照无植被 |
| `NOT_READY` | 产物尚未就绪 |
| `VERSION_MISMATCH` | 快照声明与产物版本不一致 |
| `RESOURCE_MISSING` | 部分资源缺失 |
| `TICKET_INVALID/TICKET_EXPIRED/FORBIDDEN` | 票据无效/到期/无权限 |
| `PUBLICATION_NOT_FOUND` | 发布不存在或下线 |

`data`：`code,message?,publicationId,sceneId?,taskId?,status?,publicationVersion?,ruleVersion?,generatorVersion?,sourceHash?,manifestUrl?,tilesetUrl?,layerTilesetUrls?,layerDensityTilesetUrls?,instanceCount?,tileCount?,densityProfiles?,resources:Resource[],versionMismatches:对象数组,warnings:string[]`。

资源项完整字段：

| 字段 | 类型与意义 |
| --- | --- |
| `resourceType` | `SPECIES_MODEL/PUBLICATION_MANIFEST/PUBLICATION_TILESET/LAYER_MANIFEST/LAYER_TILESET/LAYER_DENSITY_TILESET/INCREMENTAL_ASSET/SUB_RESOURCE` |
| `stableId` | 必需字符串，与三维包引用原样一致 |
| `referencePath` | 在 `threeDJson.vegetation` 中的位置 |
| `kind` | `glb/json/3d-tiles` 等内容类型 |
| `publicationVersion,contentHash` | 资源版本和摘要，适用时提供 |
| `layerId,densityTier,parentStableId` | 图层、密度档位与父资源，可空 |
| `url` | 可直接访问地址，可空 |
| `subResourceBase` | 子资源相对路径解析基址，可空 |
| `expiresAt` | 带时区的地址到期时间，可空，不能据此假设永不过期 |
| `controlledAccess` | 可空 `{mode:"RELATIVE_PATH",relativePath,resourceName,resourceType,resourceFormat,assetName}` |
| `available` | 布尔 |
| `unavailableReason` | 不可用原因，例如未知资源键或缺少地址 |

`versionMismatches` 每项 `{field,expected,actual}`，字段限 `publicationVersion/ruleVersion/sourceHash`。版本错误不能回退到编辑态“当前版本”接口；缺资源按明确降级提示，不能编造地址。

当前 `scenePreviewRuntimeLoader.ts` 对已经请求到的植被资源数据，凡数据层 `code` 非 `OK` 都会中断该预览加载；它尚未实现来源文档期望的所有部分降级。因此新后端不能把一个有效可用场景无理由标为 `RESOURCE_MISSING` 后假设页面仍会展示其余内容。三维联调需一并确认部分失败展示策略。

## 6. 云渲染会话控制接口：待评审设计

### 6.1 现状与目标

当前 `LegacyUnityTransport` 通过配置直连信令；`JsonRpcUnityCloudRuntime` 在本地生成 `sessionId`。**当前没有后端会话申请/续租调用。**既有迁移计划提出以下目标地址，本节补足开发草案，评审后才能作为冻结接口。

| 方法与目标路径 | 草案请求 | 草案响应 |
| --- | --- | --- |
| `POST /admin-api/dimensions/cloud-render/sessions` | `SessionCreate` | `Session` |
| `GET /admin-api/dimensions/cloud-render/sessions/{sessionId}` | 路径会话号 | `Session` |
| `POST /admin-api/dimensions/cloud-render/sessions/{sessionId}/renew` | 续租凭证方式待冻结 | 新租约及凭证 |
| `DELETE /admin-api/dimensions/cloud-render/sessions/{sessionId}` | 释放身份与幂等请求号待冻结 | 释放结果 |

管理前缀是否继续使用、成功码采用 0 还是 200、票据在首包还是连接地址/头传输均未冻结。不要经通用平台改写自动生成多套未评审地址。

建议申请正文：`sceneId:string,mode:editor或preview,requestId:string`；编辑模式附当前 `lockToken` 和草稿书签，预览模式附 `publicationId` 与合法预览授权；可选 `rendererType:"u3d",preferredLauncherId,requestedBuildVersion`。这些新增字段是**实施建议**，来源计划没有完整请求模型。

计划已提出的响应字段：

```json
{"sessionId":"crs_example","connectionId":"rtc_example","signalUrl":"wss://render.example.invalid/cloud-render/ws","accessTicket":"短期会话票据","expiresAt":0,"sceneId":"100001","sceneRevision":"200001","mode":"editor","rendererType":"u3d","preferredLauncherId":null}
```

`expiresAt` 在计划示例是数字，时间单位尚未冻结；后端需明确。建议补充 `status,launcherId,rendererInstanceId,buildVersion,iceServers,error,traceId`，状态机/字段必填与刷新凭证语义评审后确定。不得直接把此示例当成已实现结果。

### 6.2 必须满足的控制面语义

- 用户令牌只调用业务后台；浏览器、启动器和渲染器使用分用途短期凭据，不把长期用户令牌传入程序启动参数。
- 后端校验租户、场景、编辑锁或发布权限、节点容量和版本兼容。MAC 地址只是机器特征，不能作为安全身份。
- 会话申请、节点进程启动、续租和释放均幂等。按会话监督单一进程，不能断线就杀掉整台机器所有会话。
- 会话租约与场景编辑锁是两个生命周期；释放云渲染不应无条件修改场景数据。
- 续租失败、发布撤销、锁失效、启动超时和资源不足须有明确错误，不能仅返回空视频。
- 新运行时建立后按唯一正式场景状态发送当前基线，丢弃旧连接消息；场景切换推进代次。
- 节点注册、启停任务和进程回执需要完整启动器/信令契约。目前本项目没有两端全部源码，不能从浏览器客户端反推完整服务端实现。

## 7. 既有信令与实时连接协议

### 7.1 连接配置

`LegacySessionConfig`：`signalUrl:string,appId:string,sceneKey:string,macAddress?:string,connectionId?:string,type?:"u3d",iceServers?:RTCIceServer[],timeoutMs?:number`。网页安全连接下必须使用安全长连接（WSS）。当前默认信令建立超时 15 秒，等待渲染端/实时通信就绪 90 秒。

浏览器长连接（WebSocket）打开后发送：

```json
{"type":"connect","name":"Client","data":{"connectionId":"rtc_example","appId":"应用编号","type":"u3d","sceneKey":"场景启动键","macAddress":"可选旧机器特征"}}
```

此处没有会话票据字段，属于旧协议事实；票据强制接入必须升级多端，不能只要求后台返回 `accessTicket` 就声称鉴权完成。

### 7.2 浏览器可核实的消息

| 方向/消息 | 结构或行为 |
| --- | --- |
| 服务端→浏览器 `connect` | `data.ClientID` 必须等于连接编号，`data.RendererPlatformID` 为渲染端特征；随后建立实时连接 |
| 双向 `offer/answer` | `{type,from,name:"Client",data:{sdp,…}}`；当前按 `from/connectionId` 校验 |
| 双向 `candidate` | `data={candidate,sdpMLineIndex,sdpMid,connectionId}`；兼容接收 `iceCandidate` |
| 心跳 | 服务端字符串 `ping`，浏览器字符串 `pong`；`config/heartbeatDetection` 是兼容消息 |
| 浏览器→服务端 `disconnect` | `{type:"disconnect",name:"Client",connectionId,teardownId}` |
| 服务端→浏览器 `disconnectAck` | 断开确认，关联字段应与请求一致；旧处理存在兼容分支，需跨端再冻结 |
| 故障通知 | `rendererUnregister/launcherUnregister/launcherTempClose/WSClose/error`，携带可读 `message` |

当前代码允许缓存最多约 256 个候选，建立远端会话描述后再应用。实时视频/音频、输入通道、业务通道由浏览器与 Unity 建立；信令和启动器只配对与监督，不转发视频帧、不保存场景四包。

`launcherConnect/rendererConnect/StartProcess/StopProcess` 在历史迁移记录出现，但其完整消息和节点鉴权不在本仓库客户端定义中。后端开发前需从实际信令与启动器工程冻结，不能凭历史消息名臆造正文。

## 8. Unity 业务命令与事件

### 8.1 传输信封

业务通道采用结构化远程调用（JSON-RPC）2.0。浏览器请求：

```json
{
  "jsonrpc":"2.0","method":"editor.v1.object.delete","id":"rpc-1",
  "params":{"envelope":{"protocolVersion":1,"sessionId":"crs_example","sceneId":"100001","sceneGeneration":2,"requestId":"rpc-1","clientSequence":5,"payload":{"instanceId":"600001"}}}
}
```

`protocolVersion=1`；`requestId` 与外层 `id` 对应；`clientSequence` 单连接递增；`sceneGeneration` 每次载入或清场递增。Unity 响应应包含 `{protocolVersion,requestId,success,payload?,error?:{code,message,details?}}`，由 JSON-RPC `result` 包装。旧传输层还兼容若干历史 `Result` 包装，新协议建议只发送明确结构。

```json
{"jsonrpc":"2.0","id":"rpc-1","result":{"protocolVersion":1,"requestId":"rpc-1","success":true,"payload":{}}}
```

不能把此 `success` 封套替换成普通业务 `{code:200,data:…}`。主动事件无请求 `id`，以 `method` 表示事件，`params.envelope={protocolVersion,sessionId,sceneId,sceneGeneration,eventId,type,payload}`；事件必须匹配当前会话和代次，旧事件丢弃。

### 8.2 已声明的方法

| 方法 | 载荷 | 当前实现状态 |
| --- | --- | --- |
| `editor.v1.session.initialize` | `{client:"web-unity",supportedProtocolVersions:[1]}` | 当前客户端会请求；返回下述能力 |
| `editor.v1.scene.loadDraft` | `{sceneId,revisionNo,sceneType,objects,resources}` | 旧三维投影，不发送二维包 |
| `editor.v1.scene.clear` | `{}` | 清场并推进代次 |
| `editor.v1.object.create` | 旧 `SceneObject` | 客户端已封装 |
| `editor.v1.object.update` | 旧 `SceneObject` | 客户端已封装 |
| `editor.v1.object.transform.set` | 预期对象编号与变换 | 类型已声明，通用运行时未独立封装；载荷需冻结 |
| `editor.v1.object.delete` | `{instanceId:string}` | 客户端已封装 |
| `editor.v1.selection.set` | `{instanceId:string或null}` | 通知，无响应等待 |
| `editor.v1.gizmo.mode.set` | `{mode:translate或rotate或scale}` | 选择模式 `select` 当前不发请求 |
| `editor.v1.runtime.mode.set` | `{mode:edit或preview}` | 客户端已封装 |

初始化响应：`{protocolVersion:1,runtimeVersion:string,capabilities:{sceneTypes:[local3d或gis],objectTypes:string[],gizmoModes:[translate或rotate或scale],features:Record<string,boolean>}}`。支持某个名字不代表对端已经实现；按真实能力启用页面功能。

旧 `SceneObject`：`instanceId,objectType,name,parentInstanceId?,visible,locked,transform,resourceRefKeys,properties`。`objectType=model/image/primitive/light/camera/group`。变换为 `{space:"local",position:[x,y,z],rotation:{kind:"quaternion",value:[x,y,z,w]},scale:[x,y,z]}`。

这与来源 `SceneObject{id,type,transform:{kind,…},asset,…}` 不同。必须显式投影，确认坐标手性、轴向、单位、欧拉旋转顺序、地理原点和缩放规则；当前 `sceneType=gis` 的类型允许值不等于已实现完整地理投影。

### 8.3 事件

| 事件 | 已知载荷/状态 |
| --- | --- |
| `editor.v1.runtime.ready` | 就绪通知；当前仅检查通知方法，完整载荷待冻结 |
| `editor.v1.scene.progress` | `{progress:number,stage?:string}`；进度刻度范围未明确，需冻结 |
| `editor.v1.scene.loaded` | `{sceneId:string}` |
| `editor.v1.scene.failed` | `{code:string,message:string}` |
| `editor.v1.selection.changed` | `{instanceId:string或null}` |
| `editor.v1.transform.preview` | `{instanceId,transform:旧SceneTransform}` |
| `editor.v1.transform.committed` | `{instanceId,transform:旧SceneTransform}`；前端转为一次正式命令 |
| `editor.v1.runtime.warning/error/metrics` | 类型已声明，完整载荷未冻结 |

错误字符串已声明：`PROTOCOL_VERSION_UNSUPPORTED,INVALID_ENVELOPE,SESSION_NOT_READY,SCENE_GENERATION_MISMATCH,SCENE_NOT_FOUND,CAPABILITY_UNSUPPORTED,RUNTIME_BUSY,RUNTIME_TEARDOWN,INVALID_PAYLOAD`。错误要带可读 `message`，不能把空应答当成功。

### 8.4 旧通道限制与输入

当前浏览器单次请求最大 10240 字节，业务通道积压超过 256 千字节即拒绝，响应等待 15 秒。浏览器请求发送完整 JSON，不支持自行新增浏览器→Unity 分包。大场景不能直接塞进此载荷上限；后续需评审升级分包或让 Unity 用短期授权读取后端三维快照的正式契约。

Unity→浏览器二进制业务包首字节标记：`2` 完整，`0` 开始，`1` 中间，`255` 结束；合并最大 4 兆字节、最长 10 秒，正文为 UTF-8。也兼容字符串 JSON。此标记属于旧传输协议，不是视频帧标记。

输入通道复用 Unity 远程输入（InputRemoting）二进制：外层 12 字节，小端整数，偏移 4 类型、偏移 8 正文长度；类型 3 为设备描述，4 为状态事件。鼠标设备 1、键盘设备 2。精确按键和状态字节布局见 `LegacyInputEncoder.ts`，不经业务后台转发。失焦、断开与预览切换需释放按键；二维控件获得输入时不能同时透传底层 Unity。

### 8.5 高级三维能力待补全

来源相机飞行/路径、模型高亮、材质、灯光、天气、打点、地形、地图、植被呈现、第一人称和三维条件/数据动作，当前 `editor.v1` 不完整覆盖。后端先保全对应设计数据，Unity 侧后续扩展版本化命令、事件和能力；不要虚构 `editor.v1.camera.*` 等尚不存在的方法并写成已支持。

## 9. 二维视频可选网关补充

与 Unity 云渲染不同。`/api/media/resolve` 返回的浏览器播放地址可能使用 HTTP 实时通信出口协议（WHEP）：客户端提交会话描述（SDP）`POST`，内容类型 `application/sdp`，返回 SDP 应答，可带会话 `Location`，销毁时 `DELETE`。媒体服务由已有流媒体实现提供，不应把该地址路由到 Unity 信令。

来源播放器还支持私有 `/api/rtsp/webrtc` 与 `/ws/rtsp/mse`，路径可配置。前者提交 `{rtspUrl:string,sdp:Base64编码的会话描述}`，接受 `{sdp:string}`、JSON 字符串或直接文本，并解码后要求合法 SDP 应答；后者连接查询参数 `url` 为源流地址，先发首字节 9 加 UTF-8 编码说明，随后二进制媒体分片。它们是可选网关适配，不是通用 RTSP 地址直接在浏览器播放，也不是当前业务后端已经具备的服务。

## 10. 三维后端交付验收

1. 模型身份、文件元信息、Unity 派生产物和临时访问授权可追溯，浏览器素材可用不替代 Unity 加载验证。
2. 地理坐标和高程版本正确，返回的切片/高程能被最终消费端访问，错误目录不伪造默认数据。
3. 植被同快照确定性、取消终态、发布/回滚幂等、历史快照绑定、九块部分失败和版本不一致按契约处理。
4. 云渲染会话与场景锁分开管理，容量/版本/权限失败可见，票据过期、重连和释放无孤儿进程。
5. 信令配对、首帧、输入就绪、业务通道和能力协商逐层验证，不能只测长连接成功。
6. 三维选择/变换回传不形成事件回环或第二套撤销栈；跨场景/断线的旧事件不能污染新场景。
7. 发布模式只读，Unity 不反向覆盖当前草稿；二维部件仍能独立编辑和预览。

当前业务接口、后续目标设计和对端真实能力分别登记。本次只提供开发依据，不运行生成器、不申请云渲染会话、不替换三维底层。

## 11. 来源材质派生与其他支撑服务草案

本节依据来源 2026-08-12 的《后端支撑服务需求规格》《透明材质修复后端专项规格》。它们是**早期设计草案**，路径、状态和模型彼此有差异，当前正式适配器没有接入这些 HTTP 端点。为后续三维规划完整列出，但不要求后端与现有接口一起实现所有早期方案。

### 11.1 候选接口与冲突

| 能力 | 材质专项草案 | 综合草案/备注 |
| --- | --- | --- |
| 材质预检 | `POST /api/v1/material/precheck` | 另一个草案为 `POST /api/v1/assets/precheck-material`，二选一评审 |
| 派生模型 | `POST /api/v1/material/derive` | 另一个草案为 `POST /api/v1/assets/{assetId}/derive-material` |
| 查询任务 | `GET /api/v1/tasks/{taskId}` | 与植被任务上大写状态不同，不能共用反序列化模型 |
| 取消任务 | `POST /api/v1/tasks/{taskId}/cancel` | 来源设计，尚无当前请求实现 |
| 资产任务列表 | `GET /api/v1/assets/{assetId}/tasks?taskType=material-derive&limit=20` | 综合草案使用 `derive-material`，枚举需统一 |
| 读取材质档案 | `GET /api/v1/assets/{assetId}/material-profile` | 返回档案及版本 |
| 用户确认档案 | `POST /api/v1/assets/{assetId}/material-profile/confirm` | 状态和人工规则版本更新 |
| 关联派生资源 | `POST /api/v1/assets/{assetId}/material-profile/attach-derived` | 只允许关联真实成功产物 |
| 重置档案版本 | `POST /api/v1/assets/{assetId}/material-profile/reset` | 生成新版本，不破坏历史 |
| 批量材质回填 | `POST /api/v1/material/batch-derive` | 综合草案为 `/api/v1/assets/batch-material-profile` |
| 资产变体生成 | `POST /api/v1/assets/{assetId}/generate-variants` | 压缩/瓦片等高级管线，后续评审 |
| 图层可用性检查 | `GET /api/v1/gis/layers/validate` | 查询 `providerType,url,layer,tileMatrixSet` 等；不是现有切片目录接口 |

早期 `/api/v1/project/{projectId}/scene/{sceneId}/definition`、场景批量导出和浏览器本地草稿方案，已被正式四包与详情链路取代，不再要求新后端重建第二套场景保存接口。

### 11.2 材质预检请求与响应

草案请求：`assetId:string,assetUrl:string,originalFormat:glb或gltf或fbx或obj,options:{inspectTextures:boolean,alphaPixelSample:boolean,sampleRatio:number}`。采样比例草案 0.05—0.5，默认 0.1；源资产只读。

草案业务成功封套 `data`：`assetId,assetUrl,resolvedFormat,materialCount,materials:MaterialInspection[],summary`。

`MaterialInspection` 包括：`materialIndex:number,materialName:string,declaredAlphaMode:OPAQUE或MASK或BLEND,declaredAlphaCutoff:number或null,declaredDoubleSided:boolean,hasBaseColorTexture:boolean,baseColorTextureHasAlpha:boolean,baseColorTextureBytes:number,alphaPixelRatio:number,alphaHistogram:Record<string,number>,candidate:对象或null,warnings:对象数组`。

`candidate={kind,confidence,recommendedAlphaMode,recommendedAlphaCutoff?,recommendedDoubleSided,recommendedActions:Action[]}`。候选识别叶片裁切与玻璃混合，不能把玻璃一概改成裁切。`summary={inspectedSuccess,hasMismatch,mismatchCount,cutoutMaterialCount,blendMaterialCount,suggestDerivation,estimatedDerivationDurationSec}`，布尔/数量/秒按名称语义。

### 11.3 派生与通用任务

草案正文：`assetId:string,sourceAssetUrl:string,actions:Action[],failurePolicy:{onAnyActionFailed:"preserve-original",timeoutSec:number}`；综合草案可选 `callbackUrl`，未冻结前不启用任意回调。

动作类型：`rewriteAlphaMode`（指定材质改透明模式/裁切阈值）、`enableDoubleSided/disableDoubleSided`、`flipTextureV`、`dracoCompress`、`premultipliedAlphaFix`、`mergeMaterials`、`ktx2Compress`。按动作提供 `materialIndex,targetAlphaMode,cutoff,level,quality` 等条件参数；不可执行任意命令字符串。

创建草案返回 `{code:202,data:{taskId,taskType,status:"pending",createdAt,pollUrl,estimatedCompletionSec}}`。查询返回草案任务 `{taskId,taskType,status,progressPct,message,createdAt,startedAt,endedAt,result,error}`。状态 `pending/running/success/failed/blocked/cancelled`，与植被状态完全独立；来源对查询结果是否另包业务封套不统一，须冻结。

成功 `result.derivedAsset={assetId,assetUrl,originalSizeBytes,derivedSizeBytes,compressionRatio,originalPreserved,actionsApplied,verification}`，验证含重新预检结果、字节摘要和格式合法性。失败/阻塞返回 `errorType/message`、已执行动作、`blockedAction`、可重试标记；不覆盖源文件。按资产及规范化动作、源内容版本做幂等，产物可写区和源文件只读区隔离。

### 11.4 档案、回填与变体

档案草案：`assetId,status,rules,derivedAssets,unmappedRules,precheckSnapshot,version,updatedAt,history`。草案状态 `recommended/confirmed/derived/unavailable` 与当前领域 `ModelMaterialProfile.state=ready/needs-confirmation/unavailable` 不同；规则里 `alphaMode` 与早期 `blendMode` 也有差异，必须映射，不能直接覆盖正式场景类型。

- 确认正文：`confirmedRules:[{materialIndex,alphaMode或blendMode,alphaCutoff,doubleSided}],notes`，草案还含 `operatorId`；新后端操作者以真实认证身份为准，不能信任前端自报身份。
- 关联正文：`variant,derivedAssetId,derivedAssetUrl,generatedByTaskId,diagnostics`；后端验证来源任务成功及资产归属。
- 重置正文：`targetVersion:number,reason:string`，版本递增；并发基准版本字段在草案未定义，需补齐后冻结。
- 批量回填正文：`assetIds:string[]`（草案最多 2048）、`autoConfirm:boolean,autoDeriveIfCutout:boolean,dryRun:boolean`；返回聚合任务，结果包含总数、预检成功失败数、派生成功阻塞数、`breakdown` 及逐资产结果。
- 变体正文：`variants:[{kind,tool?,params?}]`；任务产物按格式/加载器能力登记，工具名称须服务端白名单，Unity 是否支持相应压缩和瓦片由能力矩阵验证。
- 图层检查草案结果：`{valid:boolean,sampleTileStatus:number,sampleTileBytes:number,estimatedTileSizeAvg:number,capabilitiesSummary:对象,errorType?:string}`。不得因为它能探测远端地址而开放任意内网访问，需复用受控来源规则。

这些候选服务的 URL、成功封套、状态机、权限和版本均待三维阶段冻结。可先按正式资源/场景接口存好材质和加载参数，再根据 Unity 实际需要决定哪些服务进入实施。
