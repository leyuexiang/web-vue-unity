# 05 测试信令部署与Launcher联调记录

## 1. 部署结果

- 测试信令地址：`ws://192.168.10.148:8923`。
- HTTP 状态入口：`http://192.168.10.148:8923/`。
- 配置入口：`http://192.168.10.148:8923/config`。
- systemd 服务：`jtyf-signaling.service`，已启用开机启动并处于 active 状态。
- 当前版本：`/opt/jtyf-signaling/releases/20261013-114100-gfef0bdb-compat`。
- 当前链接：`/opt/jtyf-signaling/current`。
- 上一版本保留在 `/opt/jtyf-signaling/releases/20261013-113041-gfef0bdb`，可用于回滚。
- 服务以 `jtyf-signaling` 非登录用户运行，不使用 root。

服务管理：

```bash
ssh jtyf-test 'sudo -n /usr/local/sbin/jtyf-signaling-control status'
ssh jtyf-test 'sudo -n /usr/local/sbin/jtyf-signaling-control logs'
ssh jtyf-test 'sudo -n /usr/local/sbin/jtyf-signaling-control restart'
```

## 2. 运行时与安全边界

- 安装了独立受控 Node 18.20.8 二进制：`/opt/jtyf-signaling/runtime/node-v18.20.8/bin/node`。
- systemd 启用了非 root、只读系统、私有临时目录、禁止提权等沙箱配置。
- 初次使用 `MemoryDenyWriteExecute=true` 时，Node V8 JIT 启动产生 `Fatal javascript OOM in MemoryChunk allocation failed during deserialization`；已确认普通用户直接运行正常，并移除此项不兼容限制。
- 增加 systemd 启动限流，避免配置错误时无限高速重启。
- firewalld 当前未运行，8923 由服务器网络直接可达；这仅满足内网 GM1 联调，不代表生产网络隔离已经完成。
- 当前为明文 WS，不含 TLS、票据和 Origin 鉴权，仅用于旧协议兼容联调。

## 3. 信令代码兼容变更

- 保留原有 `src/class/launcherRoom.ts` 中同一 `connectionId` 去重逻辑，避免重复占用 Launcher 容量。
- `src/websocket.ts` 增加旧 Launcher `RegistRender` 消息兼容空操作，避免收到未知消息后无记录。
- `launcherClosedRenderer` 对空 data 使用可选访问，降低异常消息导致崩溃风险。

## 4. Launcher 构建与入口

本机 Launcher 使用 Java 17、Spring Boot 2.7.18 构建成功，运行包已同步到本地 scripts 目录（该 JAR 受 `.gitignore` 管理）：

```text
Launcher/jtyf-pixelstreamlauncher/scripts/springboot-websocket-client-1.0-SNAPSHOT.jar
```

新增编号化中文启动入口：

```text
Launcher/jtyf-pixelstreamlauncher/scripts/01-启动测试环境Launcher-调试模式.bat
Launcher/jtyf-pixelstreamlauncher/scripts/02-启动测试环境Launcher-拉起Unity.bat
```

- `01`：`debugModel=true`，接收 Start/StopProcess 但不实际启动 Unity，用于信令与机器注册验证。
- `02`：`debugModel=false`，会实际启动 `../UpdateProcess/U3D/CloudRender.exe`。
- 两个脚本均固定连接测试信令 `192.168.10.148:8923`，并通过 `%~dp0` 定位 JAR 与配置，不依赖启动时工作目录。

## 5. 已验证链路

已完成：

1. `mvn test` 通过；当前项目没有 Java 测试用例。
2. Launcher 可执行 JAR 构建成功。
3. HTTP `/` 返回“信令服务运行中”。
4. `/config` 返回 WebSocket/public/combined 配置。
5. TCP `8923` 从开发机连接成功。
6. WebSocket 握手成功并收到 `config` 消息。
7. 本机 Launcher 以真实物理网卡注册：
   - 地址：`192.168.10.169`
   - MAC：`BC:EC:A0:49:6E:15`
8. Launcher 心跳收到 `heartbeatDetection` 响应。
9. 模拟 Client 注册后，信令向 Launcher 发送 `StartProcess`；断开后发送 `StopProcess`。
10. Launcher 正确记录 Unity 启动参数；调试模式未实际拉起 Unity。
11. 编号化中文批处理通过 PowerShell 启动验证并成功注册信令。

信令检查结果：

- TypeScript 类型检查通过。
- ESLint 无错误，保留 7 个既有未使用变量警告。
- HTTP 信令测试 47 项通过。
- 旧 `websockethandler.test.ts` 已与当前重构后的 API 脱节，因调用已删除的 `reset/add/onConnect/remove` 等接口而无法编译；该问题不是本次部署回归，需后续重写测试。
- Webpack 生产构建成功，保留 Express 动态依赖警告。

## 6. 回滚

信令异常时由管理员将 current 链接切回上一版本并重启：

```bash
ln -sfn releases/20261013-113041-gfef0bdb /opt/jtyf-signaling/current.new
mv -Tf /opt/jtyf-signaling/current.new /opt/jtyf-signaling/current
systemctl restart jtyf-signaling.service
```

Launcher 可停止测试进程并恢复旧入口；原 `application.yml` 和交互式 `run.bat` 未被覆盖。

## 7. 下一步

1. 使用 `02-启动测试环境Launcher-拉起Unity.bat` 做一次受控真实 Unity EXE 拉起。
2. 检查 Unity 使用同一 ClientID 注册 Renderer，并完成浏览器端最小 Client 与 Renderer 配对。
3. `web-unity` 最小 TypeScript WebSocket/WebRTC 客户端已实现：支持视频、鼠标/键盘 InputRemoting、rpc DataChannel、PacketMark 接收分片和分层状态显示；待真实 Unity 验证。
4. 使用 `02-启动测试环境Launcher-拉起Unity.bat` 做一次受控真实 Unity EXE 拉起并修正联调问题。
5. 修复 Launcher 进程输出持续消费、退出 ClientID 上报和进程表清理问题。
6. 补充 `/health`、版本信息、Origin/消息大小限制；随后再接 Nginx/WSS。
