# 04 测试服务器SSH登录与发布授权

## 1. 已实施边界

- 测试服务器：`192.168.10.148`，CentOS 8。
- 开发 Windows GPU 节点：`192.168.10.169`。
- 本次建立 SSH 登录与信令发布授权，未部署信令服务、Node 运行时或修改其他业务配置。
- 初始化复用现有 root 密钥通道；日常发布使用独立 `jtyf-deploy` 用户。

## 2. 本机登录

本机 SSH 配置新增独立别名，不改变原有 root 和其他项目配置：

```bash
ssh jtyf-test
```

该别名指向 `jtyf-deploy@192.168.10.148`，使用 `~/.ssh/jtyf_test_deploy_ed25519` 专用密钥，并严格校验已有服务器主机密钥。

- 专用私钥为自动化发布用途，未设口令；Windows ACL 已限制为当前账户可读写。
- 私钥不得发送、复制到仓库或共享给其他机器。
- 服务端公钥仅允许来源 `192.168.10.169`，禁用 agent、端口和 X11 转发。本机 IP 变化后需管理员更新来源限制。
- 发布账户已锁定密码，不依赖密码登录；未改变全局 root/密码登录策略。

## 3. 服务器账户与目录

| 对象 | 用途/权限 |
| --- | --- |
| `jtyf-deploy` | 发布用户，普通 shell，无任意 root 命令权限 |
| `jtyf-signaling` | 预建的信令运行用户，nologin，不使用 root 运行信令 |
| `/opt/jtyf-signaling/releases` | 发布用户写入，信令用户通过组权限读取 |
| `/opt/jtyf-signaling/shared/logs` | 信令与发布用户可写的应用日志目录 |
| `/opt/jtyf-signaling/current` | 未来部署阶段创建的版本软链接，当前未创建 |

上传示例（先创建实际版本目录）：

```bash
ssh jtyf-test 'mkdir /opt/jtyf-signaling/releases/具体版本'
scp 构建产物 jtyf-test:/opt/jtyf-signaling/releases/具体版本/
```

## 4. 限定服务管理权限

管理员所有且发布用户不可修改的脚本：`/usr/local/sbin/jtyf-signaling-control`。

仅授权以下五个明确动作：

```bash
ssh jtyf-test 'sudo -n /usr/local/sbin/jtyf-signaling-control start'
ssh jtyf-test 'sudo -n /usr/local/sbin/jtyf-signaling-control stop'
ssh jtyf-test 'sudo -n /usr/local/sbin/jtyf-signaling-control restart'
ssh jtyf-test 'sudo -n /usr/local/sbin/jtyf-signaling-control status'
ssh jtyf-test 'sudo -n /usr/local/sbin/jtyf-signaling-control logs'
```

日志固定为该服务最近 100 条，禁用 pager；不授予通配 `journalctl`、任意 `systemctl`、shell 或 `daemon-reload` 权限。

- systemd 服务单元已安装并指定 `User=jtyf-signaling`；当前服务 active/enabled。部署与回滚细节见 `docs/migration/05-测试信令部署与Launcher联调记录.md`。

## 5. 已完成验证

- `ssh jtyf-test` 非交互密钥登录成功。
- `scp` 上传到 releases 目录成功，SHA-256 与本机一致，测试文件已移除。
- 发布目录可写，systemd 配置目录、授权脚本和 shared 父目录不可写。
- 五个动作的 sudo 规则通过 `visudo` 验证；日志读取成功。
- 任意 root 命令测试被拒绝。
- 服务状态已确认 active/enabled，限定 status/logs/restart 权限可用。
- 全局 SSH 配置语法检查通过，既有管理员入口保留。

## 6. 未实施事项与下一步

- 服务器已安装独立受控 Node 18.20.8 运行时；Node 18 与 CentOS 8 的支持周期风险仍需在生产前处理。
- firewalld 当前未运行，未直接启用或修改现有防火墙，以免影响共享服务器业务；8923 目前仅按测试环境使用，生产前仍须落实内网来源限制。
- 信令服务已安装并监听 8923；Launcher 已完成调试模式注册，真实 Unity 拉起待下一阶段验证。
- CentOS 8 和 Node 18 均已过支持周期，GM1 测试与生产升级方案应分开处理。
- 既有 Redis 暴露和全局 SSH 密码/root 登录策略不在本次账户初始化范围；整改前需评估其他项目依赖，不能直接关闭共享入口。

下一步：使用编号化 Launcher 入口执行受控 Unity EXE 拉起，验证 Renderer 注册，再接入 `web-unity` 最小客户端。
