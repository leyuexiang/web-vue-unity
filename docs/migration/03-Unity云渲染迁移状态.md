# 03 Unity 云渲染迁移状态

更新日期：2026-10-15

## 已完成并已验证

- 创建独立项目 `Web/web-unity` 和独立 Git 仓库。
- 建立 Vue 3、TypeScript、Vite、Pinia、Vue Router、Vitest 基础。
- 建立编辑器顶部工具栏、左侧层级树、中央 Unity 视口和右侧属性面板骨架。
- 迁移并精简引擎无关的 `SceneDefinition`、`SceneObject`、`SceneTransform` 和资源类型。
- 迁移最小 `SceneStore`、`CommandBus`、创建/删除/Transform 命令。
- 建立四包序列化和反序列化第一版，并阻断不可序列化值以及资源临时 URL、令牌、票据、运行时句柄。
- 建立 `editor.v1` Web—Unity 协议类型。
- 建立 `UnityTransport`、`UnityCloudRuntime` 和 JSON-RPC Runtime 适配器。
- 建立会话、场景代次、协议版本、requestId 和事件过滤基础。
- 已执行 `pnpm type-check`、25 个单元测试和 `pnpm build`，全部通过。
- 已扫描源码和依赖清单，未发现 Cesium/Three 引用。
- 已完成测试服务器 SSH/发布账户初始化，`ssh jtyf-test` 登录、SCP 上传哈希、最小 sudo 权限和任意 root 命令拒绝测试通过；详见 `docs/migration/04-测试服务器SSH登录与发布授权.md`。
- 已完成测试信令部署和 Launcher 基线联调；详见 `docs/migration/05-测试信令部署与Launcher联调记录.md`。
- 已完成 M4 前端部分：选择、移动、旋转、缩放工具栏接入，Gizmo 能力协商、Transform 预览/提交适配，以及连续 Transform 的 Undo/Redo 合并。
- 修复 Web 传输层丢失 Unity 主动事件会话和场景代次的问题，并增加事件信封回归测试。
- 已补齐 `editor.v1.scene.loadDraft/clear` 的 Web 请求快照和 Unity 草稿运行时骨架：支持场景代次、请求幂等、分阶段进度事件、模型/分组/基础几何实例化和失败回滚；并补上选择、Gizmo 模式和对象变换请求路径。Web 端类型检查、25 个单元测试和构建通过。

## 当前限制

- Unity 视口已完成真实旧协议端到端验证：Unity Editor 以固定 `ClientID=web-unity-editor` 注册 Renderer，前端完成 SDP/ICE、2560×1440 视频首帧、`input/rpc` DataChannel 和 `editor.v1.session.initialize` 能力协商。
- 已实现本项目内的最小 TypeScript WebRTC 客户端，不再依赖迁移 `@vis/web-cloud-render`；修正旧客户端遗漏 `candidate` 及 ICE 字段顺序问题。
- 输入通道已验证创建并配对远端 Mouse/Keyboard；RPC 通道已验证 Unity `PacketMark` 接收分片和能力协商响应。
- 尚未接入真实场景详情、编辑锁和 `saveAll`；保存和预览按钮保持禁用，避免误导或覆盖数据。
- 四包实现当前是新项目最小领域投影，尚未与来源项目真实四包 fixture 做无损兼容验证。
- Unity 的 `editor.v1.session.initialize`、`scene.loadDraft`、`scene.clear`、`selection.set`、`gizmo.mode.set` 和 `object.update` 已补齐代码路径；Unity 编辑器已自动刷新并完成脚本编译，日志只有项目既有警告，基础体加载、选择、移动 Gizmo 拖拽和云输入已完成真实端到端验证。
- Playwright、鉴权、环境配置和部署流水线尚未建立，因此 M1/M2 均未达到退出标准。
- 已确认测试服务器 `192.168.10.148` 作为控制面与信令节点；本机 Windows `192.168.10.169` 作为开发 GPU 渲染节点，同时运行 Launcher 和 Unity EXE。
- 本机 Launcher 已构建并识别物理网卡 `BC:EC:A0:49:6E:15`；Unity Editor 直连时使用 Launcher 调试模式注册容量，不实际拉起 EXE。
- `192.168.10.148:8923` 已部署单实例信令并设置 systemd 开机启动；HTTP、WebSocket、Launcher 注册、心跳和 Start/StopProcess 转发验证通过。
- Unity Editor 直连已经验证 Renderer、SDP/ICE、首帧和 DataChannel；真实 Unity EXE 拉起作为后续 Launcher 生命周期验证，不再阻塞前端协议开发。
- 真实 EXE 联调时已确认 Launcher 可启动并监听本机 `18080`，但当前 `CloudRender.exe` 仍是 2025-07-15 的旧构建；它返回 `PROTOCOL_VERSION_UNSUPPORTED`，随后前端收到 `SESSION_NOT_READY`。当前 Unity 工程的 `editor.v1` 改动已在编辑器程序集编译通过，尚未重新打包进 `CloudRender.exe`。
- 调试模式 + Unity Editor Play Mode 已完成最小编辑器闭环验证：协议初始化、空场景加载、基础体加载、选择同步、移动/旋转/缩放模式切换、对象位置更新和 Unity 场景清空均返回成功。期间修复了协议版本数值比较、RPC 通道二进制帧误解析，以及 Vue 场景快照刷新时序问题。
- 真实视频画布验收时发现新草稿运行时选择对象后未复用项目既有的相机聚焦逻辑；已在 `EditorDraftRuntime` 补上 `CameraMoveHelper.FocusTargetObj` 调用，Unity 编辑器已重新编译并实测对象可聚焦到视频画布中央。
- 已追加相机飞行完成后的 `RefreshGizmoPosition`，并在程序集刷新后完成手柄命中复测。
- 聚焦补丁编译后已实测：基础体可以进入视频画布中央，视频鼠标拖拽会改变 Unity 相机视角，说明输入通道和画面内坐标映射正常；此前拖拽移动物体后前端坐标未更新，定位到 RTG 拖拽结束只记录撤销动作、没有立即调用变换回调，同时 RTG 输入缓存可能仍指向本地设备。本轮已在拖拽结束处补发提交回调，并在远端设备加入/移除时同步 RTG 的鼠标键盘引用；程序集刷新后已通过 X 轴拖拽及撤销/重做复测。
- Launcher 重启后已再次完成视频/RPC 连接；属性面板将测试对象 X 改为 2 后，前端值、撤销计数和 Runtime 状态均正常。2026-10-15 10:39 的 Unity `Assembly-CSharp.dll` 已包含本轮修复，随后完成真实视频画布 Gizmo 拖拽验收：选中基础体切换“移动”，命中 X 轴拖拽后前端 X 从 0 更新为 `0.2779433`，撤销回到 0、重做恢复 `0.2779433`，浏览器无运行时错误。

## 下一批

当前真实云渲染链路已完成基础联调，下一阶段首要确认项：

- 已补充协商失败时向信令端发送断开清理，固定 ClientID 热重载重连已实测恢复；仍需补充连续故障注入和多轮重连压力验证。
- 开放 `8923` 内网端口已完成；Nginx/WSS 和生产来源限制仍待实施。
- GM1 当前使用 `appId=1`、`sceneKey=web-unity-gm1`、`ClientID=web-unity-editor`，并支持在前端配置面板调整。
- 采用本项目内的最小 TypeScript WebRTC 客户端；不把新后端会话分配 API 作为 GM1 基线联调的前置条件。

GM1 基线打通后，再确认并实施云渲染会话接口及返回字段（至少 `sessionId`、`signalWS`、访问票据、有效期）。

确认后按以下顺序实施：

1. 已完成 Unity 编辑器程序集刷新后的 RTG 拖拽回调、远端设备绑定和选择后相机聚焦验收；已完成基础体场景加载与清场验证，后续继续补空场景/模型场景回归。
2. 使用真实四包 fixture 验证 Web `SceneStore` 恢复和 Unity 场景清理。
3. 补充同 ClientID 重连的连续故障注入、多轮 Peer/DataChannel 清理和恢复验证。
4. 完成 Web 层级树选择与 Unity 选择事件闭环。
5. 已在 Locus 的 RTG 优化基础上完成 Transform/Gizmo 真实跨端验收。
6. 已完成视频画布上的真实 Gizmo 拖拽回传验证，并确认撤销/重做闭环。
7. 最后补做真实 Unity EXE 启停、崩溃和 Launcher 进程生命周期验证，并重新构建包含当前 `editor.v1` 代码的 `CloudRender.exe`。
