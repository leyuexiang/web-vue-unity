# Web Unity

基于 `jtyf-web-three` 交互设计迁移的独立 Unity 云渲染场景编辑器。

## 当前边界

- Vue 负责编辑器 UI、SceneStore、命令历史和四包保存。
- Unity 负责唯一三维视口、拾取、Gizmo、模型和运行表现。
- 本项目不依赖 CesiumJS 或 Three.js。

## 开发

```bash
pnpm install
pnpm type-check
pnpm test
pnpm build
pnpm dev
```

实施资料：

- 全链路总体计划：`docs/migration/01-Unity云渲染全链路改造总体里程碑计划.md`
- 前端专项实施规划：`docs/migration/02-Unity云渲染独立前端迁移实施规划.md`
- 当前迁移状态：`docs/migration/03-Unity云渲染迁移状态.md`
- 测试服务器 SSH/发布授权：`docs/migration/04-测试服务器SSH登录与发布授权.md`
- 测试信令部署与 Launcher 联调：`docs/migration/05-测试信令部署与Launcher联调记录.md`
- Unity 编辑器直连端到端联调：`docs/migration/06-Unity编辑器直连端到端联调记录.md`
