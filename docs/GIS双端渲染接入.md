# GIS 双端渲染接入

场景管理中的 GIS 场景现在可以选择 Unity 云渲染或 Unity WebGPU。两端共用 `editor.v1` 草稿协议，由 Unity 内的 Cesium 加载 GIS；网页继续持有场景状态、保存数据和撤销历史。

两种场景都加载完整的 Unity `Assets/Scenes/StartScene.unity`。网页保存的业务配置不是另一个 Unity Scene：GIS 对象挂到 StartScene 已有的地理根，非 GIS 对象使用独立的本地坐标根。无显式 GIS 数据图层覆盖时，地表、影像、地理原点和初始相机直接使用 StartScene 配置。

当前 StartScene 默认影像为 Cesium ion **Sentinel-2，资源 ID 3954**。原 Google 影像 3830182 的 429 调查记录保留在后文；当前临时切换到另一份 ion 影像，不使用内网或 CesiumJS。

## 前端与 Unity GIS 的边界

前端不安装或加载 CesiumJS，不创建 Cesium Viewer。GIS 地表、影像、地形及三维瓦片由 Unity 工程内的 Cesium for Unity 实现；云端和 WebGPU 只是 Unity 播放器的两种运行方式。

已删除前端旧 Cesium Gizmo 分支、相关交互接口、Cesium 画布样式以及新建 GIS 的 `settings.cesium` 配置。保存元数据的 `runtimeEngine` 对 GIS 和普通三维均写为 `unity`，同时保留 `sceneType` 区分坐标体系。旧相机存档中的 `kind: 'cesium'`、旧兜底底图地址的识别仅用于数据兼容与清理，不会加载浏览器引擎或选择渲染器。

## 数据与坐标

- 场景类型保持 `gis`，不转成 `local3d`。草稿额外携带 `geospatial.origin`、`terrainEnabled` 和数据图层。
- GIS 对象使用 `transform.space=wgs84`，`position=[经度,纬度,椭球高]`，经纬度单位为度，高度单位为米；地理位置保留双精度。
- 协议四元数采用右手 ENU（东、北、天）坐标。Unity 显式转换到 Cesium GlobeAnchor 的左手 EUN（东、天、北），编辑完成再反向转换。原场景中的 heading/pitch/roll 仍使用弧度。
- GIS 业务对象复用 StartScene 的 Georeference；不会另建地理世界或用网页默认原点覆盖它。校验或资源加载失败时保留原有可见场景。
- 空 GIS 场景复用 StartScene 中的地表与影像。显式配置 GIS 数据图层时，在同一地理根下应用覆盖；退出覆盖时恢复原始地表。没有显式影像覆盖时保留启动场景的影像配置。
- GIS / 非 GIS 按 `sceneType` 切换：GIS 显示地理世界并关闭本地底板、网格；非 GIS 隐藏 GIS 地表而不销毁它，显示本地底板、网格，关闭地理原点漂移。相机视角分别保留，切回 GIS 后恢复原来的 GIS 视角。StartScene 共用主相机的本地高度约 6 米；首次进入 GIS 时，若该位置低于地理原点上方 1000 米，运行时将其提升到约 2000 米并朝向原点，避免落到真实高程以下。这不写回 Unity 场景或网页存档。

## 已接入的渲染范围

- 绝对高度的模型、基础几何体和分组；模型仍需在对应端的 Unity 美术发布中存在。
- 本地影像目录 `local`，支持 Geographic 切片和 TMS/XYZ 的 Y 方向。
- 影像提供者 `xyz`、`wms`、`wmts`。XYZ 地址使用浏览器常见的 `{z}/{x}/{y}` 模板；转换层处理 Unity 的 Y 方向差异。
- 地形通过 `terrain` 图层 URL 加载，场景的 `terrainEnabled` 控制是否使用；关闭地形时仍显示椭球面。
- 3D Tiles 通过 `tileset` 图层 URL 加载。
- 图层新增、显隐和删除通过共享 Store 同步。当前版本通过重载草稿应用 GIS 数据图层变更，同场景保留当前视角。
- 瓦片异步加载错误通过 `editor.v1.runtime.error` 回传，网页显示具体原因。草稿加载成功表示对象及图层已创建，后续瓦片继续按视口流式加载。

当前材质最多支持三个可见影像图层，图层不透明度须为 1。GeoJSON/KML/CZML 矢量图层、其他影像提供者、贴地/相对地形高度尚未接通，会给出明确错误。局部影像的 `rectangleDegrees` 裁剪及供应商专属配置尚未接入；已保存配置保持在原场景数据中。

Unity 草稿目前只实例化 `model`、`primitive`、`group`。场景中的 `camera`、`effect`、`image`、`tileset`、`light`、`annotation` 等其余对象继续保存在 SceneStore、属性数据和原保存包里，画布顶部逐项提示尚未接入。它们的新增、更新、选择和删除不会向 Unity 发送不存在的对象编号，也不会中断 GIS 基础场景加载；这不代表其渲染能力已经实现。GIS `tileset` 数据图层仍走独立的图层加载链路。Unity 的天气、云、雾、热力图等能力声明保持关闭，不能把旧 Cesium Runtime 的能力默认值当作已实现能力。

## 部署

前端和两端 Unity 播放器需要一起更新。旧播放器只声明 `local3d` 时，前端会提示更新对应端，避免发送不兼容的 GIS 草稿。现有云信令、资源发布和 Web bootstrap 配置继续使用。

WebGPU 页面的 GIS 服务必须能被浏览器访问，HTTPS 页面须使用 HTTPS GIS 源或部署侧的 HTTPS 代理，并配置正确的跨域响应。云渲染进程则须能从渲染机访问相同 GIS 服务。

本次云端播放器已安装到 Unity 工程的 `cloud/player/CloudRender.exe`，原版本保存在 `cloud/player.before-gis-20261028-1732/`。浏览器端已安装到 `webgpu/player/`，原版本保存在 `webgpu/player.before-gis-20261028-1813/`。资源发布描述与美术目录保持各自平台的版本；不要混用 Windows 和 Web 资源包。

本机 WebGPU 验证包使用未压缩文件，数据约 305 MB、WASM 约 90 MB；这是本机验证产物，首屏下载量较大。正式压缩构建可选择 Brotli，并配置服务器的 Content-Encoding。Web 平台图形 API 确认为 WebGPU。最初的 Brotli 验证构建因压缩耗时被主动终止，该轮未压缩成功包为 `build_507fd6ffee21`。`StreamingAssets/Config` 与 `StreamingAssets/Windows` 已从 Web 验证包排除。

## 验证

前端验证：`node node_modules/vue-tsc/bin/vue-tsc.js -b`；`node node_modules/vitest/vitest.mjs run`。GIS 投影测试覆盖经纬高、姿态往返和坐标类型隔离；RPC 测试覆盖 GIS 字段传递和旧播放器拒绝；桥接测试覆盖影像显隐与删除。

Unity 的 `MainFramework.Editor.EditorDraftGisVerification.RunAsync()` 使用临时草稿检查地理原点、双精度位置、Gizmo 变换回传、失败保留场景、切回普通场景及四种影像组件构造，不保存用户场景或调用业务写接口。另已在 Editor Play 模式中验证地球瓦片、在线影像和地理位置上的几何体实际显示，帧数持续推进。

2026-10-28 的验证中，73 个前端测试文件共 506 项测试、类型检查和前端生产构建通过；Unity GIS 专项 13 项检查通过。最终 Windows 云端构建 `build_ba3d8a4806a2` 成功，0 个错误、330 个警告；最终 WebGPU 构建 `build_507fd6ffee21` 成功，0 个错误、132 个警告。验证摘要在 Unity 工程 `.tmp/dual-render/gis-cloud-build-summary.json`、`gis-webgpu-build-summary.json` 和 `gis-runtime-verification.json`。Editor 中已观察到真实影像与几何体，尚未完成用户真实 GIS 场景通过云端 WebRTC 和浏览器 WebGPU 的双端端到端验收。

`audit:frontend` 的浏览器引擎依赖检查通过，但后续第一阶段 Unity 保全哈希检查报错，首个差异是本轮开始前已修改的 `LegacyUnityTransport.ts`；原始迁移基线未重置，该项整体仍记为未通过。

## 2026-10-28 报错修复

用户现场报告了两类独立错误：

- WebGPU 已进入 Unity，但前端将 `effect` 对象交给只支持 model/primitive/group 的对象转换器，导致整场景失败。现使用上述显式保留和提示策略，新增回归测试覆盖含 GIS 特效的草稿投影与增量生命周期。
- 云端信令返回“渲染机已满”，当时本机无 CloudRender 进程。重启本机测试 Launcher 并重新注册后，独立信令探测成功申请、启动并收到新版 Renderer 的注册，退出探测时发送 disconnect 释放席位。Launcher 仍运行在正式模式，使用 `cloud/CloudRenderLaunch.exe` 入口；没有重启共享信令服务器，也没有关闭其他用户的渲染进程。该结果验证席位分配和 Renderer 注册，不能等同于浏览器 WebRTC 视频验收。

修复后 74 个测试文件共 508 项前端测试、类型检查和前端生产构建通过。随机连接编号和页面使用的固定 `web-unity-editor` 均已验证 Renderer 注册成功并释放；探测摘要位于前端 `.tmp/cloud-signal-probe.json`，Launcher 日志位于 `.tmp/gis-launcher-out.log`。电脑自动控制因不能可靠识别当前浏览器 URL 而停止，本次未通过该工具操作或截取用户当前页面。

## 2026-10-29 相机对象及模型资源缺失

相机对象与特效对象触发相同的投影问题。现统一按 Unity 支持的对象类型筛选本次运行时草稿，覆盖其余所有对象类型及编辑生命周期；对已有模型更换资源引用时重载对应草稿，避免仅更新变换后仍显示旧资产。普通三维和 GIS 场景共用该处理。

用户场景还引用了资源 `2113165756231753730`，但当前 Windows 与 WebGL 美术发布目录各只有 35 个内置模型，均无该资源。Unity 的“当前美术版本不存在资源键”错误由前端精确识别，仅在当前渲染投影中排除明确缺失的模型并重试，原模型、资产编号、变换和保存包保持不变。画布提示模型名称及缺失编号，其他已发布模型、几何体和 GIS 图层继续加载。不会创建替代模型或将网络、完整性校验等其他故障当作缺资源跳过。重新进入场景会重新验证资源，因此发布新资源后可以恢复显示。

要显示缺失模型本身，仍需把对应模型发布到 Unity 的两个平台美术目录，或提供经过确认的 Unity 资源编号映射。GLB/GLTF 资源市场编号不能自动映射为当前内置模型之一。

该轮回归测试为 75 个文件、525 项用例，全部通过，类型检查通过。测试包含普通场景/GIS 混合对象加载、相机四包配置保留、云端/WebGPU 的类型切换、缺失资源编号保真、多个资源缺失时的有界重试、非缺资源错误正常抛出，以及更正资产映射后的恢复。

## 2026-10-29 空 GIS 的 WebGPU 原生初始化修复

空 GIS 仍需要 Unity Cesium 的请求缓存和瓦片任务处理器，因此去掉模型不能绕过以下两项问题：

- 嵌入 SQLite 3.51.3 归档使用旧 Emscripten 的文件锁常量与 `struct stat` 布局，和 Unity 6000.6.7f1 不兼容。用当前 Editor 工具链重编同版本 SQLite，修复 `disk I/O error`；仅改文件锁命令会继续出现 `file is not a database`，不能作为修复。
- 原生线程未启用时，随后会出现 `thread constructor failed`。WebGL 现启用线程与 `TRILIB_ENABLE_WEBGL_THREADS`，避免 TriLib 构建回调重新关闭线程。最终框架已检查包含 PThread 和共享 WebAssembly 内存。Unity 工程 `Tools/Cesium/RebuildWebSqlite.ps1` 固定源文件摘要并备份旧归档，操作说明见同目录 README。

主网页需要 COOP `same-origin` 与 COEP `credentialless` 或 `require-corp`。Vite 开发、预览服务已配置。bootstrap 的 `build.threadsRequired=true` 让前端在缺少隔离/共享内存时提前报错。跨源框架经 CORS 下载后使用网页自己的 Blob URL 启动线程，WASM 和数据文件仍使用原部署地址；退出后释放 Blob URL。无需 CesiumJS。

最新播放器构建 `build_f646f3dbc2ce` 使用 `Assets/Scenes/StartScene.unity`，构建成功，0 错误、327 警告。已安装到 Unity 工程 `webgpu/player/`，前一个包保存在 `webgpu/player.before-native-gis-20261029-1110/`。本机网关已更新，Web 验证包不含 Config 与 Windows StreamingAssets。

该轮隔离 Edge 使用实际 WebGPU 和未经临时脚本修改的框架，验证空 GIS、带几何体 GIS、切回普通三维及退出播放器。同源测试加载后 4.5 秒提交 498 帧，跨源测试提交 474 帧，原生初始化异常与页面异常均为 0。跨源测试使用真实 Vite 页面来源与独立 HTTPS 资源来源，验证 Blob 线程入口；业务接口为本地模拟，没有写入真实业务。该轮仍生成了无纹理椭球，未验证 StartScene 原始影像的保留，后续按下述共享启动场景规则修正。

验证记录在前端 `.tmp/gis-native-native-final.json` 与 `.tmp/gis-native-native-cross-origin-fixed.json`，截图使用同名前缀；前端 76 个测试文件、529 项测试与类型检查通过。新增测试覆盖线程隔离前置条件、跨源框架无凭据下载和退出时释放 Blob URL。

## StartScene 共享入口与 GIS / 非 GIS 区分

此前有两处错误：启动流程默认按非 GIS 删除 StartScene 的 Cesium 对象；收到 GIS 业务配置后，又创建了没有原生影像的新椭球。当前启动宿主保留 StartScene 原始地理世界，等待网页场景类型后切换显隐，不再调用旧 GIS 组件的全局删除与重建流程。

`EditorDraftStartupSceneVerification` 在隔离的临时 Unity 场景中检查 13 项行为，包括复用同一个地理根、地表和影像对象，保留原点、相机，非 GIS 隐藏地表而不删除，切回 GIS 恢复影像，加载失败保留基线，以及退出后保留原始 Unity 对象。用户打开的 StartScene 保持未修改，验证不进入 Play mode 或访问真实业务接口。

WebGPU 更新包 `build_e5d43857c1e0` 已构建成功（0 错误、118 警告），安装于 `webgpu/player/`；前一包保存在 `webgpu/player.before-startscene-20261029-1317/`。跨源隔离 Edge 复测完成 GIS、带几何体 GIS、非 GIS、切回 GIS和退出播放器；15 秒内提交 1684 帧，页面异常和原生初始化异常均为 0。实际图片显示地表已处于相机下方，非 GIS 显示本地底板和网格。

**影像服务尚未通过验收**：StartScene 原始 ion 影像资源 `3830182` 已被保留并实际发起下载，但这轮收到 `assets.ion.cesium.com` 的 155 个成功响应和 402 个 HTTP 429，影像纹理未完整显示。Unity Editor 同时也记录到同一资源的 429。当前白色区域还有这一外部服务限制，不能再解释为场景未配置影像，也不能把模式切换通过当成影像显示通过。需要原服务恢复正常响应；未擅自换成其他地图源。

本轮截图与运行记录在前端 `.tmp/gis-native-startscene-safeview*`；Unity 构建和验证记录位于 `.tmp/dual-render/gis-startscene-web-build-summary.json`、`gis-startscene-web-verification.json`、`gis-startscene-ownership-checks.json`。日志中的临时鉴权查询值已脱敏。

云端在实际切换到 Windows 平台后构建 `build_4ba613296abd` 成功（0 错误、432 警告），安装于 `cloud/player/`，原包保存在 `cloud/player.before-startscene-20261029-1320/`。直接从 WebGL Editor 交叉构建时曾出现 Render Streaming 条件字段的序列化布局不一致，因此该失败产物未交付。云端与 WebGPU 使用同一个 StartScene 与同一份 GIS / 非 GIS 模式切换代码；云端 WebRTC 视频和 ion 影像完整显示仍不能由构建成功代替验收。

更新后以独立测试连接验证云端 Renderer 启动和注册成功，随即发送 disconnect 释放席位，测试进程退出。摘要保存于前端 `.tmp/cloud-signal-probe.json`，该检查只验证信令与 Renderer 注册。

Unity 专项两组共 26 项检查均通过：StartScene 复用与模式恢复 13 项，以及双精度坐标、姿态往返、失败回滚、普通场景坐标和四种图层组件构造 13 项。坐标专项在隔离临时场景中先进入空的普通场景再填入对象，避免 Edit-mode 验证启动用户相机的运行时聚焦动画。前端 529 项测试、类型检查、生产构建通过。

## 临时切换 Cesium ion Sentinel-2

按用户要求将 StartScene 中同一个 `CesiumIonRasterOverlay.ionAssetID` 从 `3830182` 改为 `3954`，并开启版权显示；场景相对切换前备份仅两处字段变化。原场景备份位于 Unity 工程 `.tmp/dual-render/StartScene.before-sentinel-20261029.unity`。地形仍使用 StartScene 的 Cesium World Terrain，不更改地理坐标根或 GIS / 非 GIS 切换逻辑。

Sentinel-2 元数据和实际 JPEG 瓦片均验证返回 HTTP 200。官方将它列为适合开发联调的约 10–60 米分辨率全球影像，近景清晰度低于原高清影像；参见 [Sentinel-2 示例](https://sandcastle.cesium.com/?label=ion+Assets&src=Sentinel-2.html) 和 [开发用量优化说明](https://cesium.com/learn/ion/optimizing-quotas/)。现有 Token 请求 Azure Maps Aerial 3891168 返回资源不存在，因此没有选择或新增该资源。

WebGPU 构建 `build_ee7b73da967c` 成功（0 错误、38 警告），已安装到 `webgpu/player/`，前一包保存在 `webgpu/player.before-sentinel-20261029-1341/`。隔离 Edge 的真实跨源 WebGPU 验证已显示成都区域卫星影像，GIS、非 GIS、切回 GIS 和退出正常，15 秒提交 1680 帧。请求的 ion 资源仅 `3954` 与地形 `1`；本轮无 HTTP 429、无页面异常或原生初始化异常。底层地形服务另有两个 HTTP 404，不影响该视野的影像显示，未将它们记作影像错误。

截图与报告位于前端 `.tmp/gis-native-sentinel*`，Unity 工程内的构建与验证摘要为 `.tmp/dual-render/gis-sentinel-web-build-summary.json`、`gis-sentinel-web-verification.json`。截图保留 Sentinel-2 数据版权信息。切换新影像的验收不表示原 Google 资源的服务限流已经解除。

云端构建 `build_464413982287` 同样成功（0 错误、38 警告），已安装于 `cloud/player/`，前一包保存在 `cloud/player.before-sentinel-20261029-1343/`。两端共用保存后的 StartScene Sentinel-2 配置。
