# 双端 Unity 渲染接入

场景列表的“进入”先选择 `Unity 云渲染` 或 `Unity WebGPU`，编辑器地址只携带 `renderMode=cloud|webgpu`。场景锁、SceneStore、二维画布、保存和发布流程保持共用；渲染选择只影响本次页签的三维 Runtime。缺少部署配置的 Unity 入口禁用；“现有编辑模式”保留原有入口，GIS 场景仍可进入。

## 云渲染配置

在前端构建环境配置 `VITE_UNITY_CLOUD_SIGNAL_URL`、`VITE_UNITY_CLOUD_APP_ID`、`VITE_UNITY_CLOUD_SCENE_KEY`。Unity Editor 固定 ClientID 联调时再填 `VITE_UNITY_CLOUD_CLIENT_ID`；正式 Launcher 自动分配时留空。当前连接沿用现有 `LegacyUnityTransport`，要求部署侧已有信令、Launcher 和 Unity 云渲染进程；后端云渲染会话申请接口尚未完成，因此这些字段是现有直连信令的部署参数。HTTPS 页面必须使用 WSS。

## Unity Web 构建与配置

Unity 工程为 `D:\UnityProject\jtyf-dts-webgpu`，版本 `6000.6.7f1`。工程已将 WebGPU 配为 Web 平台图形 API。本机当前 Web 构建位于 `D:\UnityProject\jtyf-dts-webgpu\.tmp\dual-render\player-rpc-fix`，资源发布位于同级 `art-webgl-split-release`，启动描述为同级 `ArtStartupRelease-split.json`。构建报告为 `Succeeded`、0 个错误；资源发布包含 35 个模型、24 个 WebGL 资源包，`build-plan.json` 确认图形 API 为 `WebGPU`。正式部署应将这些构建文件和资源包发布到可由编辑器页面访问的地址，并由受控部署服务返回 `VITE_UNITY_WEB_BOOTSTRAP_URL` 指向的 JSON。字段示例见 `public/config/unity-web-bootstrap.example.json`；构建文件名应填写真实产物，不能直接使用示例占位符。

该 JSON 必须针对当前已授权用户生成 `userId` 和固定美术发布描述。前端带当前登录的 Bearer/ClientId 请求该地址，不把访问令牌写入 URL 或场景包。`art` 由可信部署层提供已确认的发布描述、摘要与 HTTPS 资源源站；`business` 提供与项目一致的业务 API 地址。Unity 的启动门禁要求这两组信息先通过校验，才会开放业务 RPC；开发环境只有 HTTP 业务接口时，Unity Web 启动会明确失败。

Unity Web 端通过 `BusinessChannel.ReceiveMessage` 接收与云端相同的 JSON-RPC，借 `jtyf-message` 向页面发出响应。`jtyf-business-ready` 以及当前 canvas 上的 `jtyfBusinessChannelTarget` 标记接收器已就绪。每个 Unity canvas 只消费属于自己的事件。

2026-10-28 的本机 WebGPU 修复给 canvas 分配了稳定的唯一 DOM ID，并将 4 MiB 内的 JSON 元数据通过有界文本回传，资源包仍通过二进制通道进入 WASM。WebGL 构建时会从场景实例移除云渲染专用组件；`player-diagnostics` 构建报告中无 `RenderStreamingCtrl` 缺失脚本警告。原发布的 `model/pack007.ab` 为 70.4 MiB，超过 Web 资源会话 32 MiB 的单包上限，导致元数据校验后创建快照失败；新发布将其中五个模型拆为独立包，最大包为 19.9 MiB。WebGL 首次发布构建现在也会拒绝超限资源包。已用 Unity 编辑器加载实际发布描述和三个元数据文件，并成功创建资源快照。元数据启动现在会报告具体失败阶段，网关只记录三个元数据文件的路径和 HTTP 状态；浏览器中的完整资源启动流程需重新进入场景验证。

## 目前的 Unity 草稿协议边界

两端复用 Unity 工程的 `editor.v1` 协议，现支持 `local3d` 与 `gis`。GIS 的 WGS84 原点、图层和地理对象变换均由 Unity Cesium 消费，具体范围与部署见 [GIS 双端渲染接入](../GIS双端渲染接入.md)。对象类型仍为 `model`、`primitive`、`group`；不支持的三维对象或几何体会报明确错误，避免静默丢失。场景选择、变换提交与撤销历史经共享 SceneStore 同步。对象新增和删除目前通过重载 Unity 草稿同步；场景较大时应在 Unity 端补 `object.create/delete` 增量命令。云端旧 RPC 入站仍有 10 KB 单条请求上限，大型草稿需升级传输或改为后端按 sceneId 拉取。

模型资源引用保留四包中的 `resourceKey` 与 `assetId`，Unity 的美术发布必须包含对应 `assetId`。普通 GLB/GLTF URL 不会自动变成 Unity AssetBundle；缺少对应发布资源时 Unity 会返回资源加载失败。

WebGPU 路径要求安全上下文以及浏览器暴露 `navigator.gpu`。当前 Unity 工程只配置了 WebGPU，没有 WebGL 回退；不满足条件的浏览器不能进入。浏览器首屏还必须下载 Unity Web 构建并等待资源门禁，通常比云渲染连接更慢。

## 本机双端联调

前端的 `.env.development.local` 已写入现有信令、appId、sceneKey、固定 ClientID，以及 `VITE_UNITY_WEB_BOOTSTRAP_URL=https://localhost:5191/bootstrap`。本机证书使用 `scripts/createUnityWebDevCertificate.ps1` 创建，仅对 `localhost` 有效，期限 30 天。运行 `scripts/startUnityWebDevGateway.ps1` 可从 D 盘产物启动网关；网关监听 `https://localhost:5191`，只接受本机 `http://localhost:5180` 页面的跨域请求。`/health` 可检查网关是否运行。

网关从 Unity 工程的 `.tmp/dual-render/player-rpc-fix` 读取 Web 构建，从 `.tmp/dual-render/art-webgl-split-release` 读取 WebGL 美术发布，从 `.tmp/dual-render/ArtStartupRelease-split.json` 读取固定发布描述。`player-rpc-fix` 把 WebGL 上的 `editor.v1` JSON-RPC 改到主线程处理，避免 `Task.Factory.StartNew` 在没有工作线程时把 `editor.v1.session.initialize` 拖到超时。启动配置接口用前端当前 Bearer、ClientId 和登录平台请求现有业务服务的资料接口，取得真实 userId；随后为 Unity 分配一小时的本地 API 代理会话。令牌只保存在网关进程内，不写入构建产物或场景数据。网关拒绝访问 Unity 构建里的 `StreamingAssets/Config` 和 `StreamingAssets/Windows`，因为这些是旧桌面部署材料。

该网关仅供本机联调。正式部署需要由现有业务网关提供同一启动配置契约、HTTPS 美术源站和 HTTPS 业务 API，并把构建目录中的旧桌面配置排除在发布物外。本机生成的 Web 包已删除 `StreamingAssets/Config` 和 `StreamingAssets/Windows`。

Unity 工程已安装 Render Streaming `3.1.0-exp.9` 与其 WebRTC 依赖，并给 Standalone 平台添加 `JTYF_RENDER_STREAMING` 编译开关。插件以嵌入包形式保存在 `Packages/com.unity.renderstreaming`，其中修复了 Unity 6.6 的程序集枚举、Android API 枚举和渲染管线设置 API。`SystemMainRoot.prefab` 的 `RenderStreamingCtrl` 已恢复为 `Broadcast` 处理器，三个通道引用仍在；同时启用 `Run In Background`，把 Input System 的后台输入行为设为 `IgnoreFocus`。最终 Windows 构建位于 `D:\UnityProject\jtyf-dts-webgpu\.tmp\dual-render\cloud-player-final\CloudRender.exe`，结果 `Succeeded`、0 个错误、36 个警告，报告中已无缺失脚本警告。

云端运行还需要 Launcher 与渲染进程在线，且服务端有空闲席位。2026-10-28 本机连通信令成功，服务端返回“渲染机已满”，因此当时未能完成 WebRTC 会话验收。

## 2026-10-28 云渲染黑屏与初始化超时修复

本机 Launcher 现通过 `.tmp/dual-render/CloudRenderLaunch.exe` 启动 Unity 工程内的 `.tmp/dual-render/cloud-player-rpc-fix/CloudRender.exe`。旧启动器已备份为 `CloudRenderLaunch.before-rpc-fix.exe`。新播放器完整构建成功，0 个错误、35 个警告。不要只替换 Managed DLL：场景、预制体及 Resources 中的材质也属于本次修复。

浏览器 DataChannel 的 `open` 早于 Unity 主线程绑定接收器，原来的首条 `session.initialize` 会丢失。Unity 现在在完整资源与业务启动成功、RPC 接收器绑定后发送 `editor.v1.runtime.ready`；前端等待该握手再初始化。启动失败通过带 `fatal: true` 的 `editor.v1.runtime.error` 结束等待。`editor.v1` 的异步方法在所有平台先 await 实际结果，再序列化响应。信令改为业务启动后使用配置的地址启动，避免 Editor 先连接预制体中的 `127.0.0.1`。

本地旧资源目录的 35 个映射中有 4 个包文件缺失。已从现有源预制体生成完整的 Windows 发布 `.tmp/dual-render/art-windows-release`，含 35 个模型、24 个包。固定描述位于 `.tmp/dual-render/ArtStartupRelease-windows.json`，描述摘要及发布哈希记录在同级 `cloud-art-startup.json`。启动器仅对其子进程设置 `WX_ART_STARTUP_DESCRIPTOR`、`WX_ART_STARTUP_SHA256`、`WX_ART_RELEASE_ROOT` 与 `WX_ART_STARTUP_POLICY=RequireTarget`，通过原安装器校验安装；没有关闭完整性校验。Editor 的测试启动预约位于 `Library/Locus/tmp/ArtWorkbenchStartup.json`，隔离安装目录为 `Library/Locus/tmp/cloud-art-runtime`。这些目录均在 Unity 工程内。

`PathTools.GetProjectName()` 现优先读取当前项目，避免 Launcher 的 `-ProjectName` 被打包配置中的旧项目名称覆盖，导致固定资源启动失败。StartScene 的普通三维启动视图停用预置的 GIS 瓦片请求及未配置的 Enviro 天空，使用中性背景；推流改为 Screen 来源，保留播放器相机的屏幕输出。补充 `Resources/Materials/DefaultGroundMaterial` 的 URP 材质，同时保留运行时几何体所需的 Lit Shader。首次加载新草稿会聚焦内容，同一场景后续更新保留当前视角。

Editor Play 的场景处理回调会收到空 BuildReport，现已跳过该情形；Render Streaming 的 InputReceiver 释放前检查 InputUser 是否有效。最终验证中 Editor 业务启动成功、帧计数持续推进，进入和退出 Play 均无新增 Error。

真实 Launcher → Windows exe → WebRTC 验证已完成：初始化与含立方体、资源 ID `1` 汽车模型的测试草稿均成功，浏览器正常显示模型和地面，视频 2560×1440、约 30 FPS、0 丢包。前端云渲染相关 22 项测试及类型检查通过。测试没有写入业务场景数据；原业务场景需刷新网页重新进入。
