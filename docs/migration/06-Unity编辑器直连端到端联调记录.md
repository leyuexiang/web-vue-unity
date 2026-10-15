# 06 Unity编辑器直连端到端联调记录

## 1. 联调拓扑

- 前端：`http://192.168.10.169:5180/editor`
- 信令：`ws://192.168.10.148:8923`
- Launcher：本机调试模式，只注册容量，不拉起 EXE。
- Renderer：Unity Editor Play Mode，场景 `Assets/Scenes/StartScene.unity`。
- 固定 ClientID：`web-unity-editor`。
- 测试 appId：`1`。
- 测试 sceneKey：`web-unity-gm1`。

Unity Editor 不接收 Launcher 命令行参数，因此场景中 `GlobalInitializer.testUser` 与前端 ClientID 必须一致。

## 2. 配置变更

Unity：

- `Assets/StreamingAssets/Config/ProConfigInfo.json` 的 `wsUrl` 切换为 `192.168.10.148`。
- `Assets/Scenes/StartScene.unity/CesiumGeoreference/SystemMainRoot` 的 `GlobalInitializer.testUser` 设置为 `web-unity-editor`。
- `SceneService` 增加 `editor.v1.session.initialize`，返回协议版本与最小能力集。
- 修复远端设备 Added 事件早于 remote 标记导致未配对的问题：等待设备标记完成后再加入 `GlobalInitializer.RemoteUser`。

前端：

- 云渲染配置增加固定 ClientID。
- 默认 ClientID 为 `web-unity-editor`。
- RPC DataChannel 打开后等待短暂稳定，再自动执行 `editor.v1.session.initialize`。
- Video、Input、RPC、editor.v1 分别显示就绪状态。
- Unity InputRemoting 设备描述改为 UTF-8 JSON，并包含 `usages` 字段。

Launcher：

- API 端口环境变量从易与 Spring 冲突的 `SERVER_PORT` 改为 `API_SERVER_PORT`。
- Launcher 本地 HTTP 端口固定为 `18080`。
- 编号化脚本使用 `pushd %~dp0`，Unity EXE 和配置路径不再依赖调用者工作目录。

## 3. 验证结果

通过：

1. Unity Editor 以 `web-unity-editor` 和物理 MAC `BC:EC:A0:49:6E:15` 注册 Renderer。
2. 浏览器 Client 使用相同 ClientID 与现有 Renderer 直接配对。
3. Offer、Answer、ICE Candidate 双向转发完整。
4. 浏览器收到 2560×1440 视频，`readyState=4` 且持续播放。
5. `input` DataChannel Open。
6. `rpc` DataChannel Open。
7. Unity 端 `InputReceiver` 和 `BusinessChannel` 均绑定 `web-unity-editor`。
8. `editor.v1.session.initialize` 自动能力协商通过。
9. Unity 返回能力：
   - sceneTypes：`local3d`
   - objectTypes：`model`、`icon`
   - gizmoModes：`translate`、`rotate`、`scale`
10. 远端 Mouse 和 Keyboard 在 Unity InputSystem 中创建，并配对到 `GlobalInitializer.RemoteUser`。
11. Unity Console 最终无错误。
12. 前端 `pnpm type-check`、15 个单元测试和生产构建通过。

## 4. 已定位并修复的问题

### 4.1 m-line 顺序冲突

相同 ClientID 在浏览器热重载、旧 Peer 未完成清理时，Unity 曾报告：

```text
The order of m-lines in subsequent offer doesn't match order from previous offer/answer.
```

全新浏览器会话并重启 Play Mode 后连接稳定。后续仍需把同 ClientID 的重连清理做成产品逻辑，避免依赖人工重启。

### 4.2 RPC 首包丢失

浏览器 `rpc.onopen` 后立即发送能力协商时，Unity 可能尚未完成 `BusinessChannel.SetChannel` 和 `OnMessage` 订阅，导致请求超时。改为通道打开后短暂等待再初始化后通过。

### 4.3 输入设备未创建/配对

旧前端实现发送了双倍长度、零填充的设备 JSON，且缺少 `usages`。改为 UTF-8 JSON 后远端设备可创建。

Unity 添加设备时，`InputDeviceChange.Added` 可能早于 Render Streaming 设置 remote 标记，导致原逻辑忽略设备。增加跨帧等待后 Mouse/Keyboard 已成功配对。

### 4.4 Launcher 端口和路径

`SERVER_PORT` 被 Spring Boot 识别为服务端口，导致 Launcher 误监听 `48092`；改为 `API_SERVER_PORT`，Launcher 本地端口固定 `18080`。

编号化脚本原先从仓库根目录启动时，Unity EXE 相对路径不稳定；改为先切换到脚本目录。

## 5. 当前边界

- 当前使用 Unity Editor 直连，尚未验证 Unity EXE 的进程启停、崩溃恢复和退出码。
- 当前仍为明文 WS，不含票据、Origin 限制、WSS 和 TURN 生产治理。
- `editor.v1` 仅实现 `session.initialize`；场景加载、清场、对象操作和事件尚未实现。
- 当前自动化使用全新浏览器 profile；同 ClientID 原地重连仍需完善清理。

## 6. 2026-10-15 增量验收

- Unity 工程 `Library/ScriptAssemblies/Assembly-CSharp.dll` 时间戳为 2026-10-15 10:39，确认已刷新到 RTG 拖拽回调和远端设备绑定修复。
- 启动前端与测试 Launcher 后，固定 ClientID `web-unity-editor` 连接恢复，Video、Input、RPC、`editor.v1` 均就绪，Runtime 状态为 `ready`。
- 添加基础体并切换“移动”，在视频画布命中 X 轴 Gizmo 拖拽；对象 X 从 `0` 更新为 `0.2779433`，撤销回到 `0`，重做恢复 `0.2779433`。
- 浏览器运行时错误日志为空；本轮未改动 Unity 源码，仅验证已刷新程序集。

## 7. 下一步

1. 实现 `editor.v1.scene.loadDraft` 和 `editor.v1.scene.clear`。
2. 将场景代次、sessionId 和 requestId 校验落到 Unity。
3. 完善同 ClientID 重连清理，自动重建 Renderer/Peer/DataChannel。
4. 用真实四包 fixture 恢复最小场景。
5. 再做选择和 Transform/Gizmo 闭环。
