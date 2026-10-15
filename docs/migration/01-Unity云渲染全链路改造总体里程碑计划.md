# 01 Unity 云渲染全链路改造总体里程碑计划

> 文档定位：跨仓库、跨团队的总体实施基线  
> 覆盖范围：独立前端、后端控制面、信令服务、Launcher、Unity 云渲染程序、网关与运维  
> 关联前端专项规划：`docs/migration/02-Unity云渲染独立前端迁移实施规划.md`  
> 当前状态：规划评审稿；具体排期需在 GM0 完成后冻结

## 1. 文档目的

本计划用于统一以下工程的改造顺序、接口边界、里程碑和验收口径：

- `Web/web-unity`：独立 Vue 场景编辑器。
- `Server/jtyf-cloud`：用户、场景、权限、资源、保存发布和云渲染会话控制面。
- `Web/jtyf-signaling`：现有 Node.js WebSocket 信令服务。
- `Launcher/jtyf-pixelstreamlauncher`：渲染节点代理和 Unity 进程管理器。
- `Unity/jtyf-pixelstreamurp`：Unity Render Streaming、三维编辑和运行时。
- `jtyf-gateway`、Redis/Nacos、日志监控和部署设施。

本计划不是某一端的功能清单，而是完整链路的主计划。任何一端的专项计划都应以本文的系统边界、协议版本、里程碑退出标准和回滚规则为上位约束。

## 2. 总体目标

完成一条可鉴权、可观测、可恢复、可灰度的 Unity 云渲染编辑链路：

```text
用户进入 web-unity
  -> 后端校验场景权限并分配云渲染会话
  -> 前端使用短期票据连接统一 WSS 信令入口
  -> 信令匹配可用 Launcher
  -> Launcher 幂等启动指定版本的 Unity EXE
  -> Unity 使用渲染端票据注册并建立 WebRTC
  -> 前端显示视频并建立 input/rpc DataChannel
  -> Web 与 Unity 完成能力协商和场景加载
  -> 双向选择、Transform、Gizmo、对象编辑
  -> Web 组装四包并由后端保存/发布
  -> 预览会话只读取不可变发布快照
```

最终必须满足：

1. Web 是编辑状态、命令历史和四包组装的唯一事实来源。
2. Unity 是三维渲染、拾取、Gizmo、动画和运行表现的唯一执行端。
3. 后端是权限、场景版本、资源版本、编辑锁、会话记录和发布快照的唯一持久化来源。
4. 信令只负责连接编排和 WebRTC 消息转发，不承担场景业务。
5. Launcher 只负责节点注册、容量上报、版本校验和渲染进程生命周期。
6. 浏览器不引入 Cesium/Three 作为三维兜底。
7. 全链路使用稳定身份、短期票据和统一关联字段，不依赖固定 IP、Unity 层级路径或明文长期凭据。

## 3. 当前基线与主要问题

### 3.1 独立前端

已有基础：

- Vue 3、TypeScript、Vite、Pinia、Vue Router、Vitest 项目骨架。
- 编辑器布局、SceneStore、CommandBus、四包最小投影。
- `UnityTransport`、`UnityCloudRuntime`、`editor.v1` 协议类型和基础校验。
- 当前构建和单元测试状态记录在 `docs/migration/03-Unity云渲染迁移状态.md`。

主要缺口：

- 尚未接入真实 WebSocket 信令、WebRTC Peer、视频轨道、输入和 DataChannel。
- 尚未调用后端会话分配接口。
- Unity 尚未实现 `editor.v1`。
- 保存、发布、编辑锁和真实四包兼容尚未完成。

### 3.2 后端控制面

已有基础：

- `jtyf-cloud` 已具备 Gateway、Nacos、Redis、安全框架和 WebSocket 基础设施。
- `dimensions-server` 已有信令地址查询和场景相关业务基础。
- Gateway 已具备 WebSocket 路由案例。

主要缺口：

- 当前只返回固定信令地址，没有真正的云渲染会话分配、租约和票据。
- 信令地址保存在 `signal_ling` 表中，存在环境固定 IP 配置。
- 用户、场景、会话、Launcher、Unity 进程之间缺少统一审计记录。
- 浏览器可以直接构造 `connectionId`、`appId`、`sceneKey` 和机器选择参数。

### 3.3 信令服务

已有基础：

- 已实现 Client、Launcher、Renderer 注册。
- 已实现 Launcher 匹配、`StartProcess`、`StopProcess`。
- 已实现 `offer`、`answer`、`candidate` 转发。
- 已实现 Renderer/Launcher 退出通知。

主要缺口：

- Client、Launcher、Renderer 状态均保存在单进程内存 Map 中，只能可靠单实例运行。
- 无票据校验、机器身份认证、连接限流和来源限制。
- `MaxLink` 和高优先级机器写死在代码中。
- 无标准健康检查、指标、会话审计和优雅下线。
- 当前协议缺少版本号、统一错误码、幂等键和关联字段。

### 3.4 Launcher

已有基础：

- 可连接信令服务并注册机器。
- 可接收 `StartProcess`、`StopProcess`。
- 可向 Unity 传递 `ClientID`、`ProjectID`、`WsUrl`、API 和资源地址。
- 有基础重连、心跳和进程存活检查。

主要缺口：

- 信令地址和 API 地址写在本地配置中。
- 进程表只在内存中，重启后无法恢复或清理孤儿进程。
- 启停确认不完整，缺少启动超时、失败原因、退出码和状态机。
- 信令断开时直接结束全部进程，缺少可配置的保护策略。
- 缺少机器凭据、版本上报、容量指标、资源指标和远程排障信息。
- Unity 程序版本、发布包校验和升级/回滚机制不明确。

### 3.5 Unity 云渲染程序

已有基础：

- Unity Render Streaming 和 WebRTC 信令接入。
- `input`、`rpc` DataChannel。
- `BusinessChannel` JSON-RPC、响应订阅和 10 KB 分片。
- `SceneService` 等旧 RPC 服务和场景、资源、Gizmo 基础。

主要缺口：

- 新编辑器所需 `editor.v1.*` 聚合协议尚未实现。
- 旧 RPC 方法数量多、缺少明确版本和能力协商。
- 缺少统一 `sessionId`、`sceneGeneration`、`requestId`、错误码和迟到事件拒绝。
- 缺少面向新四包 DTO 的加载和增量同步边界。
- 构建版本、协议版本和运行能力尚未统一上报。

## 4. 目标架构

```text
web-unity
  ├─ HTTPS -> jtyf-gateway -> dimensions-server
  │                           └─ 会话/票据/权限/场景/资源/保存发布
  ├─ WSS   -> jtyf-gateway -> cloud-render-signaling
  │                           ├─ WSS -> Launcher（节点注册、启停任务）
  │                           └─ WSS -> Unity EXE（Renderer 注册、SDP/ICE）
  └─ WebRTC <----------------> Unity EXE
       视频/input/rpc            ▲
       直连或 TURN 中继           │ 本机启动、停止、进程监督
                               Launcher
```

视频和 DataChannel 的端点始终是浏览器与 Unity，不经过 Launcher、业务后端或信令服务。必要时由独立 TURN 服务中继。

### 4.1 控制面与数据面分离

控制面：

- 登录用户和场景权限。
- 会话申请、续租、释放和审计。
- Launcher/Unity 版本策略和机器分配约束。
- 编辑锁、四包保存、发布快照和资源解析。

信令面：

- 长连接注册。
- Client—Launcher—Renderer 会话配对。
- `offer`、`answer`、`candidate` 转发。
- 连接状态和异常事件。

媒体与交互数据面：

- WebRTC 视频轨道。
- `input` DataChannel。
- `rpc` DataChannel 和 JSON-RPC。

信令服务不得代理视频流，也不得保存场景四包。

### 4.2 服务部署边界

推荐将信令作为 `jtyf-cloud` 服务体系中的独立部署单元，但不合并进 `dimensions-server`：

```text
Server/jtyf-cloud/                    # 服务治理和统一入口
Web/jtyf-signaling/                  # 第一阶段继续作为独立 Node 服务源码
Launcher/jtyf-pixelstreamlauncher/   # 每台渲染节点部署
Unity/jtyf-pixelstreamurp/           # 生成版本化 CloudRender 构建
Web/web-unity/                       # 独立前端部署
```

第一阶段不以“重写成 Java”为目标。先保持旧协议兼容并完成服务治理；协议稳定、运行数据充分后，再单独决策是否迁移语言或仓库位置。

## 5. 跨端核心契约

### 5.1 统一身份

全链路至少统一以下字段：

| 字段 | 含义 | 生成方 | 生命周期 |
| --- | --- | --- | --- |
| `sessionId` | 后端云渲染会话编号 | 后端 | 一次会话 |
| `connectionId` | WebRTC 配对编号 | 后端或会话服务 | 一次 Runtime 连接 |
| `sceneId` | 场景稳定编号 | 后端 | 长期 |
| `sceneRevision` | 当前编辑或发布版本 | 后端 | 一次版本 |
| `sceneGeneration` | 同一连接内的场景加载代次 | Web | 一次加载 |
| `requestId` | RPC 请求编号/幂等键 | 调用方 | 一次请求 |
| `instanceId` | 场景对象稳定编号 | Web/后端 | 对象生命周期 |
| `launcherId` | 渲染节点稳定编号 | 运维/Launcher | 机器生命周期 |
| `rendererInstanceId` | Unity 进程实例编号 | Launcher | 一次进程 |
| `traceId` | 跨服务日志关联编号 | Gateway/后端 | 一次业务链路 |

MAC 地址只能作为机器特征之一，不能继续作为唯一安全身份。

### 5.2 会话分配接口目标形态

建议由后端提供：

```text
POST /admin-api/dimensions/cloud-render/sessions
POST /admin-api/dimensions/cloud-render/sessions/{sessionId}/renew
DELETE /admin-api/dimensions/cloud-render/sessions/{sessionId}
GET /admin-api/dimensions/cloud-render/sessions/{sessionId}
```

申请结果至少包含：

```json
{
  "sessionId": "crs_...",
  "connectionId": "rtc_...",
  "signalUrl": "wss://example.com/cloud-render/ws",
  "accessTicket": "short-lived-ticket",
  "expiresAt": 0,
  "sceneId": "...",
  "sceneRevision": "...",
  "mode": "editor",
  "rendererType": "u3d",
  "preferredLauncherId": null
}
```

这里是目标契约草案，字段和 URL 必须在 GM0 评审后冻结。

### 5.3 凭据边界

- Web 用户 Token 只用于调用后端，不直接传给 Launcher 或 Unity。
- Web 连接信令使用短期、单会话 `accessTicket`。
- Launcher 使用机器凭据注册，不能使用浏览器票据。
- Unity 使用 Launcher 下发的一次性 Renderer 票据注册。
- 所有票据必须包含过期时间、用途、会话和主体约束。
- Token、票据、签名资源 URL 不进入四包，不写入普通日志。

### 5.4 协议演进

采用兼容迁移而不是一次切断：

1. 兼容阶段：保留现有 `connect`、`launcherConnect`、`rendererConnect`、`StartProcess` 和 WebRTC 消息。
2. 增量阶段：增加 `protocolVersion`、`sessionId`、`requestId`、`traceId`、错误码和能力字段。
3. 安全阶段：新客户端必须携带票据，旧环境通过功能开关暂时兼容。
4. 收口阶段：停止无票据接入，删除固定 IP 和旧地址发现方式。

### 5.5 状态机

#### 云渲染会话

```text
requested
  -> allocated
  -> waiting-launcher
  -> starting-renderer
  -> signaling
  -> connected
  -> runtime-ready
  -> active
  -> releasing
  -> released

任意中间状态 -> failed / expired
```

#### Launcher 任务

```text
accepted
  -> validating
  -> starting
  -> process-running
  -> renderer-registered
  -> active
  -> stopping
  -> stopped

任意中间状态 -> start-failed / crashed / timed-out
```

#### Web Runtime

```text
idle
  -> allocating
  -> signaling
  -> negotiating
  -> runtime-ready
  -> loading-scene
  -> ready
  -> reconnecting
  -> failed / disposed
```

每个状态必须有唯一拥有者、超时、用户提示、日志事件和允许的下一状态。

## 6. 总体实施策略

### 6.1 原则

- 先建立可复现基线，再改协议。
- 先保持单实例正确，再做多实例。
- 先兼容现有 Launcher/Unity，再启用强制票据。
- 先完成 20 对象最小闭环，再做大场景和高级能力。
- 各端使用同一组 JSON fixture 和错误码表。
- 所有里程碑必须有可运行证据，不能只以代码合并作为完成标准。

### 6.2 计划周期

建议按 12～16 周评估完整灰度 MVP：

- 2 名前端。
- 2 名 Unity。
- 1 名后端。
- 1 名信令/基础设施，可由后端兼任一部分。
- 1 名 Launcher/客户端工程师，可由后端或 Unity 工程师兼任一部分。
- 0.5～1 名测试。

如果只有 1 名前端、1 名 Unity，且其他角色兼职，建议按 18～24 周规划。

周期不是承诺值。GM0 完成前，不应冻结上线日期。

## 7. 全链路里程碑

为避免与前端专项规划中的 M0～M7 冲突，本文使用 `GM`（Global Milestone）编号。

| 里程碑 | 计划窗口 | 牵头角色 | 核心交付 |
| --- | --- | --- | --- |
| GM0 | 第 1 周 | 技术负责人，各端共同评审 | 架构、范围和契约基线 |
| GM1 | 第 1～2 周 | 前端 + Unity，信令/Launcher 支持 | 真实视频、输入、RPC 和链路基线 |
| GM2 | 第 2～4 周 | 信令 + 运维 | 独立服务、统一 WSS、STUN/TURN |
| GM3 | 第 3～5 周 | 后端 | 会话 API、权限、票据和审计 |
| GM4 | 第 4～6 周 | Launcher | 幂等启停、超时、节点状态和恢复 |
| GM5 | 第 3～7 周 | Unity | editor.v1、身份映射和会话隔离 |
| GM6 | 第 5～8 周 | 前端 | 生产连接状态机和重连释放 |
| GM7 | 第 7～11 周 | 前端 + Unity + 后端 | 编辑、保存、发布和预览闭环 |
| GM8 | 第 10～13 周 | 信令 + 运维，Launcher 支持 | 双实例、容量和故障恢复 |
| GM9 | 第 11～14 周 | 测试 + 运维，各端支持 | 安全、性能、告警和运维手册 |
| GM10 | 第 14～16 周 | 发布负责人，各端签字 | 灰度、回滚演练和旧链路退役计划 |

以上为并行工作窗口，不是各阶段工期相加；具体人员和日历日期在 GM0 落实。

本次规划不代表已批准所有扩展需求：GM1～GM7 形成单实例功能 MVP；GM8～GM10 形成完整生产治理与迁移闭环。双实例是本文完整目标，若首发选择单实例，必须另行记录可用性风险并调整上线门禁，不能默认为已通过 GM8。

### GM0：范围、架构和契约冻结

建议周期：第 1 周。  
目标：消除会导致各端返工的核心不确定性。

全链路任务：

- 冻结目标拓扑和各系统职责。
- 确认 MVP 只做 `local3d`，或明确 GIS 范围。
- 确认编辑态和预览态是否复用同一 Unity 构建。
- 冻结会话身份、票据类型、过期和续租规则。
- 冻结 WebSocket 消息、JSON-RPC envelope、错误码和兼容规则。
- 冻结 Transform、旋转、缩放、父子层级和资源引用规范。
- 冻结 Unity 构建版本与 Launcher 版本管理策略。
- 建立开发、测试、预生产、生产环境矩阵。

交付物：

- 云渲染协议 v1 草案。
- 会话 API 草案。
- 信令消息和错误码表。
- Launcher—Unity 启动参数表。
- 四包—Unity DTO 映射表。
- 架构决策记录和不做清单。

退出标准：

- Web、后端、信令、Launcher、Unity、测试共同评审通过。
- 每个 P0 字段有唯一生成方和解释。
- 不再依赖 Unity GameObject 路径作为持久化身份。
- 不存在“由前端直接指定任意渲染机但后端无法授权”的设计。

### GM1：旧链路基线化和端到端可观测

建议周期：第 1～2 周。  
目标：在不改变现有协议语义的前提下，稳定复现完整链路并获得基线数据。

前端：

- 实现最小 TypeScript WebSocket/WebRTC 客户端。
- 连接地址、`appId`、`sceneKey`、机器偏好全部配置化。
- 展示信令、Peer、视频、DataChannel 和 Runtime 状态。

信令：

- 增加 `/health`、版本信息、连接数和会话数指标。
- 日志增加角色、`connectionId`、消息类型和远端地址。
- 保持现有协议兼容，不立即引入强制鉴权。

Launcher：

- 日志输出 Launcher 版本、机器标识、启动参数摘要和进程 PID。
- 对 `StartProcess`、进程启动、Unity 注册、进程退出建立时序日志。

Unity：

- 上报构建版本、协议版本、DataChannel 建立和首个 RPC 时间。
- 实现最小 `editor.v1.session.initialize` 能力协商。

后端/运维：

- 准备一套固定测试账号、测试场景、Launcher 和 Unity 构建。
- 建立跨端时间同步要求。

退出标准：

- 从 `web-unity` 可拉起 Unity、显示视频、转发输入并完成一次 JSON-RPC。
- 失败时能从日志定位停在哪个环节。
- 记录会话申请到首帧、首个 DataChannel 和 Runtime Ready 的基线耗时。
- 现有旧客户端仍能使用原协议。

### GM2：信令服务治理和统一入口

建议周期：第 2～4 周。  
目标：将现有信令作为独立微服务纳入统一部署、配置和入口，不重写核心协议。

后端/网关：

- 增加 `/cloud-render/ws/**` WSS 路由。
- 配置 TLS、反向代理超时、最大消息和连接保持策略。
- 建立 STUN/TURN、UDP 端口范围、防火墙和公网地址配置；验证内网直连、跨 NAT、强制 TURN 中继及受限网络回退。
- TURN 使用短期凭据并评估中继带宽与费用，不能把 Gateway WSS 连通当作媒体链路验收。
- 明确信令使用 Nacos 注册、静态上游或基础设施 Service DNS 的方式。

信令：

- 配置迁移到环境变量/Nacos 等外部配置源。
- 移除代码中的高优先级 MAC 和固定 `MaxLink`。
- 增加优雅下线：停止接收新会话，等待或迁移已有连接。
- 增加来源限制、消息大小限制、频率限制和 JSON 校验。
- 输出标准健康、就绪和指标接口。
- 第一阶段保持单实例部署。

前端、Launcher、Unity：

- 支持统一域名 WSS 地址。
- 保留直连旧信令地址的回滚开关。
- 验证经过 Gateway 后 WebSocket Upgrade、长连接和大 SDP 正常。

退出标准：

- 测试环境所有角色通过统一 WSS 入口连接。
- 信令服务可独立部署和回滚，不随 `dimensions-server` 重启。
- Gateway 和信令任一侧重启都有明确错误和恢复行为。
- 固定 IP 不再进入新前端生产配置。

### GM3：后端会话控制面和短期票据

建议周期：第 3～5 周。  
目标：由后端控制谁可以为哪个场景申请何种云渲染会话。

后端：

- 实现会话申请、查询、续租、释放接口。
- 校验租户、用户、场景、编辑/预览权限和编辑锁。
- 生成 Web、Launcher、Renderer 分用途短期票据。
- 记录会话状态、分配结果、失败原因和审计信息。
- 提供幂等申请和重复释放语义。

信令：

- 校验票据的签名、用途、会话、主体和过期时间。
- 禁止客户端覆盖票据中受保护的 `appId`、`sceneId`、模式和机器范围。
- 将旧 `error` 文本扩展为稳定错误码和可读消息。
- 提供兼容开关，灰度期间允许指定环境使用旧连接方式。

前端：

- 登录后先申请会话，再连接信令。
- 会话过期、无资源、无权限和编辑锁冲突分别展示。
- 页面关闭或切换场景时释放会话。

Launcher/Unity：

- Launcher 注册使用机器凭据。
- Unity 使用一次性 Renderer 票据注册。
- 启动参数不再携带用户长期 Token。

退出标准：

- 未授权用户无法为场景创建会话。
- 篡改 `sceneId`、模式、Launcher 或过期票据会被拒绝。
- 会话释放后不能用旧票据重新注册 Renderer。
- 浏览器先用用户 Token 经 HTTPS 换票；WSS 握手票据或首条认证消息的方式须在 GM0 冻结，不能依赖浏览器 WebSocket 自定义 Authorization Header。
- 日志中不出现完整票据和用户 Token；查询参数中的票据也必须在网关访问日志中脱敏。

### GM4：Launcher 节点代理可靠性改造

建议周期：第 4～6 周，可与 GM3、GM5 并行。  
目标：让 Launcher 成为可审计、可恢复、幂等的渲染节点代理。

Launcher：

- 建立明确的任务状态机和状态上报。
- `StartProcess` 使用 `sessionId`/`rendererInstanceId` 幂等处理。
- 增加启动超时、Unity 注册超时、停止超时和强制清理。
- 记录 PID、启动时间、退出码、崩溃次数和最后心跳。
- 重启后扫描并处理本机孤儿 CloudRender 进程。
- 信令短断时不立即无条件结束全部进程，改为租约和宽限期策略。
- 上报 CPU、内存、GPU、显存、会话数、最大容量和可用状态。
- 上报 Launcher 版本、Unity 构建版本和支持能力。
- 进程启动参数改为白名单模型，并隐藏敏感值。
- 持续消费或重定向 Unity stdout/stderr，避免子进程输出管道阻塞；敏感票据不得打印为完整启动命令。
- 逐进程上报实际 `ClientID`、PID、退出码；补齐当前死亡回调丢失 ClientID 和 `RegistRender` 不在信令处理表中的兼容问题。
- 增加优雅升级、版本回滚和机器维护模式。

信令/后端：

- 只把任务分配给版本和能力匹配的 Launcher。
- 容量由 Launcher 上报和租约决定，不只依赖信令内存数组长度。
- 区分启动拒绝、资源不足、版本不匹配、启动失败和注册超时。

退出标准：

- 重复 `StartProcess` 不会拉起两个相同会话进程。
- Launcher 重启后不会遗留不可管理的 Unity 进程。
- Unity 启动失败可在 Web 端得到稳定错误码。
- 机器进入维护模式后不再接收新会话，已有会话按策略结束。

### GM5：Unity `editor.v1` Runtime 和会话隔离

建议周期：第 3～7 周，可与 GM3、GM4 并行。  
目标：建立新编辑器稳定、版本化的 Unity Runtime 边界。

Unity：

- 新建独立 `editor.v1` 协议层，不继续把页面直接绑定到旧 `SceneService` 方法集合。
- 实现 `editor.v1.session.initialize`。
- 返回构建版本、协议版本、能力矩阵、会话和运行模式。
- 建立 `sessionId`、`sceneGeneration`、`requestId` 校验。
- 统一成功、业务错误、协议错误和 Runtime 错误。
- 建立 `instanceId -> GameObject` 注册表。
- 实现场景加载、清场、取消和迟到任务拒绝。
- 实现选择、高亮、Transform、Gizmo、创建、复制、删除等最小协议。
- 编辑模式和预览模式使用明确能力开关。
- 上报加载阶段、资源失败和低频性能指标。

前端：

- 只通过 `UnityCloudRuntime` 使用协议，不直接访问 DataChannel。
- 不支持的能力应禁用 UI，而不是调用后等待报错。
- 新 Runtime 建立后发送当前 SceneStore 完整基线，不盲目回放旧增量队列。

退出标准：

- Web 与 Unity 完成能力协商。
- 旧会话和旧场景代次的消息不会污染当前场景。
- Unity 可以重复加载和释放测试场景且无残留对象。
- 同一组协议 fixture 在 TypeScript 和 C# 两端通过。

### GM6：独立前端真实云渲染接入

建议周期：第 5～8 周。  
目标：`web-unity` 完成从会话申请到 Runtime Ready 的生产级连接生命周期。

前端：

- 实现后端会话客户端。
- 实现版本化信令客户端和 WebRTC Peer 管理。
- 接入视频轨道、`input` 和 `rpc` DataChannel。
- 实现 BusinessChannel 一字节 `PacketMark` 和 10 KB 分包兼容。
- 实现指针、键盘、焦点、全屏和输入坐标映射。
- 建立超时、取消、重试、释放和重连状态机。
- 区分信令断开、Peer 失败、视频中断、DataChannel 中断和 Unity Runtime 错误。
- 页面卸载、场景切换和登录失效时可靠释放资源。
- 补充 Vitest、浏览器 E2E 和无 Cesium/Three 构建门禁。

信令/Launcher/Unity：

- 提供前端自动化所需的测试环境和稳定错误注入方式。

退出标准：

- 连续建立和释放 50 次会话无明显连接或事件监听泄漏。
- 常见窗口比例、浏览器缩放和 DPI 下输入坐标准确。
- Unity 进程更换后前端能建立新 Runtime 并恢复当前 Store。
- 不存在占位状态被错误显示为“Unity 已就绪”。

### GM7：场景编辑、保存和发布闭环

建议周期：第 7～11 周。  
目标：完成可交付的编辑业务闭环。

前端：

- 接入真实场景详情、四包、编辑锁、心跳和 `saveAll`。
- 完成层级树与 Unity 双向选择。
- 完成属性 Transform 与 Unity Gizmo 双向同步。
- 完成创建、复制、删除、名称、显隐、锁定和分组。
- Unity 操作最终提交转换为 Web Command，一次拖动只产生一条历史。
- 保存失败、版本冲突和失锁时保留本地编辑状态。
- 发布后使用只读会话打开不可变快照。

Unity：

- 加载规范场景 DTO 和版本化资源。
- 实现增量对象操作和编辑辅助器。
- 资源失败不导致整场静默清空。
- 预览模式关闭 Gizmo、创建和删除能力。

后端：

- 保证四包 `saveAll` 原子性、乐观锁和幂等。
- 保证发布快照不可变并可由 Unity 解析。
- 稳定资源编号映射到版本化 Unity 资源包。

退出标准：

- 完成“加载—选择—变换—创建/删除—撤销/重做—保存—刷新重开”。
- 两个页签并发保存不会静默覆盖。
- 发布后继续编辑草稿不会改变当前预览。
- Unity 加载失败不会使 Web 保存空场景。

### GM8：高可用、容量和故障恢复

建议周期：第 10～13 周。  
目标：从单实例正确性升级到可承载生产流量。

信令：

- Redis 保存会话元数据、Launcher 租约、容量和连接所属实例。
- 使用 Redis Pub/Sub、Stream 或消息总线转发跨实例消息。
- 实际 WebSocket 对象只保存在连接所属实例内。
- `connectionId`、Renderer 注册和 Launcher 分配使用原子占位。
- 支持至少两个信令实例，不依赖永久粘性会话。

Launcher：

- 心跳使用 TTL 租约。
- 节点失联、进程崩溃和机器重启后会话最终收敛。

前端/Unity：

- 网络短断、信令实例替换、Unity 进程重启都有明确恢复策略。
- 恢复后用完整基线校准，不重复创建对象。

运维：

- 建立并发会话和容量压测。
- 建立 Chaos 场景：杀信令、杀 Launcher、杀 Unity、断 Redis、断 Gateway。

退出标准：

- 两个信令实例下 Client、Launcher、Renderer 可跨实例配对。
- 单个信令实例退出不会使所有新会话不可用。
- 宕机后的会话、容量和进程状态能在规定时间内收敛。
- 不会为同一 `connectionId` 重复启动 Unity。

### GM9：安全、监控和运维闭环

建议周期：第 11～14 周。  
目标：满足灰度发布前的安全和可运维要求。

安全：

- 全链路 HTTPS/WSS。
- 最小权限票据和机器凭据轮换。
- Origin、连接频率、消息大小和方法白名单。
- 防止伪造 Launcher、Renderer、重复注册和重放攻击。
- 日志脱敏和敏感配置密钥化管理。

监控：

- 会话申请成功率、分配耗时、启动耗时、首帧时间、Runtime Ready 时间。
- 在线 Launcher、在线 Unity、各节点容量、进程崩溃率。
- 信令连接数、消息速率、错误码、跨实例转发积压。
- RPC P50/P95、场景加载耗时、Unity FPS/内存/GPU 指标。
- 保存冲突、编辑锁丢失、资源下载失败和发布失败。

运维：

- 部署、升级、回滚、扩容、维护模式和故障排查手册。
- 前端、信令、Launcher、Unity 构建和后端接口的兼容矩阵。
- 告警分级和责任人。

退出标准：

- 关键失败可通过 `traceId + sessionId + connectionId` 跨端定位。
- 关键告警经过至少一次演练。
- 票据过期、重放、越权和伪造机器测试通过。
- 运维可独立完成 Launcher/Unity 版本回滚。

### GM10：灰度上线和旧链路退役

建议周期：第 14～16 周。  
目标：以可回滚方式将生产流量迁移到新链路。

灰度步骤：

1. 仅测试租户和复制场景开放新编辑器。
2. 指定 Launcher 池和指定 Unity 构建承载灰度。
3. 按用户、租户、场景或比例扩大流量。
4. 观察至少一个完整业务周期。
5. 冻结旧协议新增功能，只处理阻断缺陷。
6. 确认无回滚需求后，逐步停止固定地址和无票据接入。

退出标准：

- 新编辑器完成生产场景保存、重开、发布和预览验证。
- 连续运行达到约定稳定周期，无 P0/P1 未解决问题。
- 旧前端和旧信令入口有明确退役日期及数据兼容结论。
- 回滚演练通过后才能扩大到全部流量。

## 8. 并行工作流与依赖

```text
GM0
 ├─ GM1 基线连通
 ├─ GM2 信令治理 ───────────────┐
 ├─ GM3 会话控制面 ─────────────┤
 ├─ GM4 Launcher 可靠性 ────────┤
 └─ GM5 Unity editor.v1 ─────────┤
                                 ▼
                         GM6 前端真实接入
                                 ▼
                         GM7 编辑保存闭环
                           ├──────────┐
                           ▼          ▼
                        GM8 HA      GM9 安全运维
                           └────┬─────┘
                                ▼
                             GM10 灰度
```

关键路径：

- GM0 未完成，禁止各端自行定义冲突字段。
- GM1 可使用旧信令协议先打通，不必等待 GM3。
- GM3、GM4、GM5 应并行推进。
- GM6 的生产验收依赖 GM2、GM3、GM5；开发联调可提前进行。
- GM7 依赖真实四包和资源契约，不只依赖 Web/Unity。
- GM8 多实例不得早于单实例链路稳定。

## 9. 各端任务编号

### 9.1 前端 FE

| 编号 | 任务 | 里程碑 |
| --- | --- | --- |
| FE-001 | 最小 WebSocket/WebRTC 客户端 | GM1 |
| FE-002 | 视频、输入、rpc DataChannel | GM1/GM6 |
| FE-003 | 云渲染会话 API 客户端 | GM3/GM6 |
| FE-004 | 连接、重连、释放状态机 | GM6 |
| FE-005 | `editor.v1` RuntimeBridge | GM5/GM6 |
| FE-006 | Scene Core、四包和后端恢复 | GM7 |
| FE-007 | 双向选择和 Transform/Gizmo | GM7 |
| FE-008 | 对象生命周期和 Undo/Redo | GM7 |
| FE-009 | 保存、发布、预览 | GM7 |
| FE-010 | E2E、指标和灰度开关 | GM9/GM10 |

### 9.2 后端 BE

| 编号 | 任务 | 里程碑 |
| --- | --- | --- |
| BE-001 | 会话数据模型和 API | GM3 |
| BE-002 | 权限、编辑锁和会话策略 | GM3 |
| BE-003 | 票据签发、续租和撤销 | GM3 |
| BE-004 | 会话审计和状态查询 | GM3/GM9 |
| BE-005 | 四包原子保存和版本冲突 | GM7 |
| BE-006 | 发布快照和只读访问 | GM7 |
| BE-007 | Unity 资源版本解析 | GM7 |
| BE-008 | 管理端会话/节点查询 | GM9 |

### 9.3 信令 SG

| 编号 | 任务 | 里程碑 |
| --- | --- | --- |
| SG-001 | 健康检查、版本、指标和关联日志 | GM1 |
| SG-002 | 外部配置和统一 Gateway 路由 | GM2 |
| SG-003 | JSON Schema、限流、Origin 和大小限制 | GM2 |
| SG-004 | 会话票据和机器凭据校验 | GM3 |
| SG-005 | 版本化消息和错误码 | GM3 |
| SG-006 | 优雅下线和维护模式 | GM2/GM9 |
| SG-007 | Redis 会话元数据和租约 | GM8 |
| SG-008 | 跨实例消息路由和原子分配 | GM8 |

### 9.4 Launcher LA

| 编号 | 任务 | 里程碑 |
| --- | --- | --- |
| LA-001 | 机器身份、版本和能力注册 | GM3/GM4 |
| LA-002 | 幂等进程任务状态机 | GM4 |
| LA-003 | 启动/注册/停止超时和错误码 | GM4 |
| LA-004 | PID、退出码、孤儿进程恢复 | GM4 |
| LA-005 | 资源和容量指标 | GM4/GM9 |
| LA-006 | Unity 构建版本校验与选择 | GM4 |
| LA-007 | 安全启动参数和 Renderer 票据 | GM3/GM4 |
| LA-008 | 升级、回滚和维护模式 | GM9 |

### 9.5 Unity UN

| 编号 | 任务 | 里程碑 |
| --- | --- | --- |
| UN-001 | `editor.v1` 程序集和 DTO | GM5 |
| UN-002 | `session.initialize` 和能力协商 | GM1/GM5 |
| UN-003 | 会话、代次、requestId 校验 | GM5 |
| UN-004 | 场景 DTO 加载和取消 | GM5/GM7 |
| UN-005 | 对象注册表、选择和高亮 | GM5/GM7 |
| UN-006 | Transform/Gizmo 预览和提交 | GM7 |
| UN-007 | 创建、复制、删除和资源释放 | GM7 |
| UN-008 | 编辑/预览能力隔离 | GM7 |
| UN-009 | 构建信息、指标和错误上报 | GM1/GM9 |
| UN-010 | EditMode/PlayMode/协议测试 | GM5～GM9 |

### 9.6 运维与测试 OP/QA

| 编号 | 任务 | 里程碑 |
| --- | --- | --- |
| OP-001 | Gateway WSS、TLS 和超时配置 | GM2 |
| OP-002 | 信令独立部署和服务发现 | GM2 |
| OP-003 | Redis、日志、指标和告警 | GM8/GM9 |
| OP-004 | Launcher/Unity 构建发布仓库 | GM4/GM9 |
| QA-001 | 跨端协议 fixture | GM0/GM5 |
| QA-002 | 真实环境端到端冒烟 | GM1/GM6 |
| QA-003 | 故障注入和恢复测试 | GM8 |
| QA-004 | 安全、容量和稳定性测试 | GM9 |
| QA-005 | 灰度和回滚演练 | GM10 |

## 10. 测试和质量门禁

### 10.1 契约测试

同一组 fixture 必须覆盖 TypeScript、Node、Java 和 C# 能消费的公共结构：

- 合法注册和信令消息。
- 缺少字段和未知字段。
- 版本不支持。
- 票据过期、用途错误和主体不匹配。
- 重复 `StartProcess`、重复 Renderer 注册和重复 RPC。
- 大 SDP、ICE Candidate 和 DataChannel 分片。
- 结构化错误响应。

### 10.2 组件测试

- 前端：状态机、分包、重连、输入坐标、Store 和四包。
- 信令：配对、容量、断开、票据、限流和跨实例路由。
- Launcher：幂等启动、超时、崩溃、重启恢复和强制停止。
- Unity：协议、代次、对象注册表、场景清理、Transform 和资源失败。
- 后端：权限、租约、幂等、锁、保存原子性和发布快照。

### 10.3 端到端核心用例

1. 用户登录并进入编辑器。
2. 申请编辑会话。
3. 匹配 Launcher 并拉起正确 Unity 版本。
4. 建立视频、输入和 RPC。
5. 加载 20 对象场景。
6. Web 选择与 Unity 高亮互通。
7. 属性 Transform 和 Gizmo 双向同步。
8. 创建、复制、锁定、隐藏、删除、撤销和重做。
9. 保存、刷新和重开。
10. 发布并打开只读预览。
11. 模拟浏览器刷新、网络短断、信令重启、Launcher 重启和 Unity 崩溃。
12. 验证会话释放、进程回收和容量恢复。

### 10.4 性能与稳定性

GM1 先采集基线，GM9 再冻结正式门槛。至少观测：

- 会话申请、Launcher 分配、Unity 启动、Renderer 注册、首帧和 Runtime Ready。
- RPC P50/P95、Transform 画面延迟和选择回传延迟。
- 信令连接数、消息率、CPU、内存和事件循环延迟。
- Launcher 节点 CPU、内存、GPU、显存和进程数。
- Unity FPS、主线程、GPU 帧时、内存、资源加载和清场耗时。
- 2 小时连续编辑、50 次会话创建释放和大场景加载。

## 11. 环境与配置管理

至少建立：

| 环境 | 用途 | 特点 |
| --- | --- | --- |
| local | 单端开发 | 可使用本地 Mock 或指定测试信令 |
| integration | 跨端联调 | 控制面/信令节点 `192.168.10.148`；开发 Windows GPU 渲染节点 `192.168.10.169`；固定 Launcher 和 Unity 构建、可注入故障 |
| staging | 上线前验证 | 与生产拓扑相同，使用隔离账号和资源 |
| production | 正式环境 | 强制 TLS、票据、监控和审计 |

当前测试环境基线：

- `192.168.10.148` 为 CentOS 8 控制面与信令节点，可承载 Nginx、Gateway/后端、Node 信令及测试 Redis。
- 当前开发机 `192.168.10.169` 为 Windows GPU 渲染节点，同时运行 Launcher 和 Unity EXE；已确认具备 NVIDIA GeForce RTX 4060 Laptop GPU。
- 本机 Launcher 仓库已包含 `UpdateProcess/U3D/CloudRender.exe` 和可运行 JAR；Launcher 测试脚本已连接 `ws://192.168.10.148:8923`。Unity Editor 直连端到端结果见 `docs/migration/06-Unity编辑器直连端到端联调记录.md`。
- 当前 `192.168.10.148:8923` 已部署并运行兼容旧协议的单实例信令，HTTP、WebSocket、Launcher 注册、心跳和 Start/StopProcess 转发已验证。详见 `docs/migration/05-测试信令部署与Launcher联调记录.md`。
- 运维原始信息位于开发机 `D:/服务器配置信息.md`，其中包含敏感凭据，只作为受控参考，不复制到项目仓库。
- 现有 Redis 无密码且对全网卡暴露，只能作为整改前的测试现状；接入云渲染协调前必须限制监听范围并启用认证。
- 对外联调端口、统一域名/WSS、TLS 证书及防火墙规则仍待确认。
- SSH/发布授权已完成：本机使用 `ssh jtyf-test` 登录 `jtyf-deploy`，发布目录 `/opt/jtyf-signaling/releases`；信令运行用户、限定 sudo 管理脚本和 systemd 服务已建立。详见 `docs/migration/04-测试服务器SSH登录与发布授权.md`、`docs/migration/05-测试信令部署与Launcher联调记录.md`。

禁止：

- 在源码中写生产信令 IP、MAC 优先列表、用户 Token 或资源签名 URL。
- 使用同一长期密钥覆盖所有 Launcher。
- 让本地调试开关进入生产默认配置。
- 通过修改数据库固定地址完成日常发布切换。

## 12. 版本和兼容策略

需要独立维护：

- Web 应用版本。
- 会话 API 版本。
- 信令协议版本。
- Launcher 协议和程序版本。
- Unity 构建版本。
- `editor.v1` Runtime 协议版本。
- 四包 schema 版本。

兼容要求：

- 新增字段默认可选，删除或改义必须升主版本。
- Launcher 必须声明可启动的 Unity 构建范围。
- Unity 必须声明支持的 `editor.v1` 次版本和能力。
- 前端根据能力矩阵关闭不可用功能。
- 灰度期间至少保留一个上一稳定组合可回滚。

## 13. 灰度和回滚边界

### 13.1 前端

- 新旧编辑器使用不同路由和功能开关。
- 回滚前端不得覆盖新版本无法理解的数据。

### 13.2 信令

- 新旧入口并存一段时间。
- 强制票据通过环境/租户开关渐进启用。
- 多实例失败时可回退到单实例，但不能回退安全数据结构。

### 13.3 Launcher

- 维护当前和上一稳定程序包。
- 升级前进入维护模式并排空会话。
- Launcher 版本回滚不应要求删除会话数据库记录。

### 13.4 Unity

- 每个构建使用不可变版本目录。
- Launcher 可按会话策略选择当前或上一稳定构建。
- Unity 回滚后，前端通过能力协商自动禁用新增功能。

### 13.5 后端

- 数据库变更采用向前兼容迁移。
- 不通过删字段、回滚历史场景或清空会话表完成回滚。
- 会话 API 新版本应与旧信令兼容一个灰度周期。

## 14. 主要风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| 各端同时重写导致无法联调 | 高 | 先保持旧消息兼容，按 GM 分阶段替换 |
| 信令直接多实例后配对丢失 | 高 | 单实例稳定后再引入 Redis 所属实例路由 |
| Launcher 重复拉起或留下孤儿进程 | 高 | sessionId 幂等、PID 记录、启动超时和重启扫描 |
| Web 与 Unity 双写场景状态 | 高 | Web Store 唯一事实源，Unity 提交转换为 Command |
| 用户 Token 泄露给渲染节点 | 高 | 分用途短期票据，禁止透传长期用户 Token |
| Unity 旧 RPC 与新协议长期混用 | 高 | 新建 `editor.v1` 聚合层和能力协商，冻结旧接口扩张 |
| 大场景通过 DataChannel 整包传输不稳定 | 高 | 压测后允许 Unity 使用短期票据读取后端快照 |
| 固定 IP/MAC 配置阻碍多环境 | 中 | 统一域名、服务发现、Launcher 稳定 ID 和外部配置 |
| 同时迁移全部高级三维能力导致延期 | 高 | 先完成 20 对象编辑闭环，高级能力单独排期 |
| 缺少全链路时间和日志关联 | 高 | 统一时间同步、traceId、sessionId、connectionId |

## 15. 决策清单

GM0 必须关闭以下决策：

| 编号 | 决策 |
| --- | --- |
| D-001 | MVP 是否仅包含 `local3d` |
| D-002 | 信令服务的部署目录、服务名和服务发现方式 |
| D-003 | 编辑与预览是否使用同一 Unity 构建 |
| D-004 | `sessionId`、`connectionId` 的生成方和关系 |
| D-005 | 票据签名方式、TTL、续租和撤销方式 |
| D-006 | Launcher 稳定身份和机器凭据方案 |
| D-007 | Unity 构建存储、版本选择和回滚方案 |
| D-008 | Transform 坐标、旋转和父子层级规范 |
| D-009 | Unity 资源交付使用 AssetBundle、Addressables 或兼容层 |
| D-010 | 大场景由 DataChannel 下发还是 Unity 按票据读取快照 |
| D-011 | 信令多实例使用 Redis Pub/Sub、Stream 或其他消息总线 |
| D-012 | 旧前端、旧信令入口和无票据协议的退役期限 |

## 16. 整体完成定义

只有以下条件全部满足，整体改造才可标记完成：

- `web-unity` 独立部署，生产包不包含 Cesium/Three。
- 后端会话 API、权限、票据、续租、释放和审计可用。
- 信令通过统一 WSS 入口运行，并完成至少双实例验证。
- Launcher 具备机器身份、容量、幂等启停、孤儿进程恢复和版本回滚。
- Unity 支持 `editor.v1`、能力协商、会话隔离和编辑/预览模式。
- 完成场景加载、选择、Transform、Gizmo、对象生命周期、撤销重做和四包保存。
- 发布快照不可变，预览只读。
- 浏览器刷新、网络短断、信令实例退出、Launcher 重启和 Unity 崩溃均有验证过的行为。
- 全链路关键日志可通过 `traceId/sessionId/connectionId/requestId` 关联。
- 安全、容量、稳定性、灰度和回滚演练通过。
- 旧链路退役时间、数据兼容和保留范围已经正式确认。

## 17. 推荐立即启动的第一批工作

第一批建议只并行启动以下事项：

1. 召开 GM0 跨端评审，关闭 D-001～D-012。
2. 前端继续实现兼容现有信令的最小 TypeScript WebRTC 客户端。
3. Unity 实现最小 `editor.v1.session.initialize`。
4. 信令补健康检查、版本、结构化日志和外部配置，不改变现有配对语义。
5. 后端设计会话 API 和短期票据模型，暂不强制上线。
6. Launcher 增加版本、PID、启动时序和退出原因日志。
7. 建立一套固定 Launcher、固定 Unity 构建和固定测试场景的集成环境。
8. 建立第一组跨 TypeScript、Node、Java、C# 的协议 fixture。

在 GM1 完成前，不启动信令多实例，不强制切断旧协议，也不迁移天气、植被、材质编辑和复杂动画等高级功能。

## 18. 与前端专项计划的映射

| 本文全链路里程碑 | 前端专项规划 |
| --- | --- |
| GM0 | M0 范围和契约冻结 |
| GM1、GM2、GM3、GM5、GM6 | M1 独立项目骨架与云渲染连通 |
| GM7 前半 | M2、M3、M4、M5 |
| GM7 后半 | M6 保存、重开、发布和预览 |
| GM8、GM9、GM10 | M7 稳定性、性能与上线准备 |

前端专项规划继续描述编辑器内部实现；本文负责跨系统依赖、顺序和统一验收。两份文档出现冲突时，应先完成跨端评审并同步修订，不能由单端自行选择解释。
