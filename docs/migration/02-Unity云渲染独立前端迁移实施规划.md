# 02 Unity 云渲染独立前端迁移实施规划

> 文档状态：执行中（项目骨架与基础内核已启动；M0、M1、M2 尚未完成验收）  
> 编制日期：2026-10-12  
> 来源项目：`Web/jtyf-web-three`  
> 目标项目：`Web/web-unity`  
> Unity 项目：`Unity/jtyf-pixelstreamurp`  
> 目标：复用现有场景编辑器的交互设计、二维组件和业务配置能力，移除浏览器侧 Cesium/Three 渲染链路，以 Unity 云渲染作为唯一三维视口和运行时。

关联资料保留在来源项目中，本项目实施时按以下路径查阅：

- `Web/jtyf-web-three/docs/refactorPlan/11-统一场景平台技术架构.md`
- `Web/jtyf-web-three/docs/refactorPlan/12-平台可迁移性设计.md`
- `Web/jtyf-web-three/docs/refactorPlan/24-编辑器接入与交付闭环任务清单.md`
- `Web/jtyf-web-three/docs/refactorPlan/43-场景与模板保存及运行时按需加载设计.md`
- `Web/jtyf-web-three/docs/refactorPlan/44-场景保存及后端接口设计.md`
- `Web/jtyf-web-three/docs/真实接口契约维护文档.md`

## 1. 执行结论

建议从 `Web/jtyf-web-three` 迁移出独立项目 `Web/web-unity`，而不是在原项目中删除 Cesium/Three 后直接改造。项目骨架已经创建，后续按本文里程碑迁移。

目标架构固定为：

```text
Vue 编辑器 UI
  -> SceneStore / CommandBus
  -> UnityRuntimeBridge
  -> UnityCloudRuntime
  -> WebRTC DataChannel / JSON-RPC
  -> Unity 云渲染进程

Unity 视频流
  -> WebRTC VideoTrack
  -> Web 编辑器中央视口

Unity 主动事件
  -> 选择、变换提交、加载进度、运行错误
  -> UnityEventGateway
  -> SceneStore / 编辑器瞬时状态
```

核心原则：

1. Web 是场景编辑状态和撤销历史的唯一事实来源。
2. Unity 是三维渲染、三维拾取、Gizmo、动画和运行表现的唯一执行端。
3. 后端是当前编辑四包、发布快照、权限、锁和资源版本的唯一持久化来源。
4. 浏览器项目不引入 `cesium`、`three`、`@types/three` 或其运行时适配代码。
5. Web 不保存 Unity `GameObject`、Transform、材质实例、摄像机实例或资源句柄。
6. Unity 不独立覆盖后端场景配置；所有永久编辑最终进入 Web 的 `SceneStore`，再由四包接口保存。
7. Web 与 Unity 之间只使用稳定的 `sceneId`、`revisionNo`、`instanceId`、`resourceKey` 和协议版本通信，不使用 Unity 层级路径作为持久化身份。

## 2. 目标和非目标

### 2.1 第一阶段目标

完成以下最小商业闭环：

```text
进入场景编辑器
  -> 申请云渲染会话并显示 Unity 视频流
  -> 加载后端当前编辑四包
  -> Unity 恢复三维场景
  -> 从层级树或 Unity 画面选择对象
  -> 属性面板修改名称、显隐、锁定和 Transform
  -> Unity Gizmo 拖动并向 Web 提交最终 Transform
  -> 创建、复制、删除对象
  -> 撤销/重做
  -> 保存四包
  -> 刷新并重新打开后结果一致
  -> 发布并用 Unity 只读模式预览
```

### 2.2 首期不阻塞项（不是最终不保留项）

以下内容可以不阻塞最小编辑闭环，但必须进入后续迁移范围、验收矩阵和版本计划：

- 天气、灯光、植被、体积云、体积热力场、三维地图/GIS、相机路径、动画、粒子、材质和媒体能力。
- 完整二维组件库、图表、装饰、控件、数据绑定和交互动作；M2 先建立最小闭环，后续完成全量迁移。
- 管理端、资源管理、模板管理、场景管理、场景预览和种植管理；M1 只迁移可进入编辑器所需的基础路由和鉴权。
- 多人实时协同编辑；首期使用编辑锁和版本冲突保护，后续单独评估协同能力。
- 通用时间轴和复杂三维关键帧编辑器；不得因此删除旧项目入口和配置数据。
- 在浏览器中恢复 Cesium 或 Three 的三维渲染兜底，以及浏览器端模型解析、材质渲染、射线拾取、遮挡剔除和三维 Gizmo。
- Unity 与 Web 双端各维护一套撤销栈，或把临时资源 URL、令牌、Unity 运行时状态写入四包。

### 2.3 GIS 边界

浏览器侧永久移除 Cesium/Three，不影响保留 `sceneType` 和坐标语义：

- `local3d` 表示 Unity 局部坐标场景。
- `gis` 是否纳入首期，由里程碑 M0 决策；若保留 GIS，由 Unity 内部负责地理坐标和渲染，Web 仍不加载 CesiumJS。
- 未确认 Unity GIS 产品范围前，MVP 以 `local3d` 完整闭环为必须项，`gis` 不得用浏览器旧 Runtime 临时兜底。
- 如果第一期明确不再需要 GIS，仍应先保留后端枚举兼容读取，再通过独立数据迁移版本删除，而不是直接改写历史场景。

## 3. 当前可复用基础

### 3.1 `jtyf-web-three` 可复用能力

现有项目已经具备以下有价值的引擎隔离基础：

- `src/scene-platform/store`：场景状态和命令历史。
- `src/scene-platform/commands`：对象创建、删除、变换、显隐及场景设置命令。
- `src/integrations/scene/sceneFourPackage.ts`：四包序列化、纯 JSON 校验和运行时字段清理。
- `src/servers/manual/dim3d/api/scene.ts`：场景详情、编辑锁、发布和模板接口。
- `src/views/sceneEdit`：顶部、左侧、中间、右侧的编辑器交互布局。
- `src/packages/components`：二维组件、图表、装饰和控件。
- `src/components/SceneProperty*`：属性面板基础控件。
- `src/auth`：独立页签与 iframe 鉴权基础。
- 场景保存、模板、预览、二维运行态和后端契约测试。

### 3.2 旧 Web 云渲染可参考能力

`Web/jtyf-web` 和 `Web/jtyf-web-2.0` 已存在：

- `@vis/web-cloud-render`；
- WebRTC 信令连接；
- 视频轨道和输入转发；
- WebRTC DataChannel；
- JSON-RPC 双向调用；
- 编辑/预览模式；
- 断线、渲染进程退出、Launcher 退出处理；
- Unity 场景打开及旧 API 调用。

这些代码仅作为通信和异常处理的参考实现。禁止把旧 React 页面、旧全局 Model、旧 `sceneApi` 直连模式整体迁入 Vue 新项目。

### 3.3 Unity 当前可复用能力

`Unity/jtyf-pixelstreamurp` 已存在：

- Unity Render Streaming 和 WebRTC；
- 基于 DataChannel 的 `BusinessChannel`；
- JSON-RPC 请求、响应、通知和分包；
- 场景清单、区块和实例数据模型；
- AssetBundle 加载；
- 多场景、区块调度和序列化能力；
- 对象交互、业务事件、Gizmo 和 Undo/Redo 基础；
- 前后端消息、WebSocket 和场景保存相关代码。

第一阶段应复用传输能力，但需要新增面向新编辑器的版本化协议层，不能继续无限扩展旧 `Api` 方法集合。

## 4. 目标系统边界

### 4.1 Web 负责

- 页面布局和全部二维交互。
- 场景列表、创建、复制、模板、编辑锁、保存和发布。
- `SceneStore` 及场景业务状态。
- `CommandBus`、撤销和重做。
- 层级树、资源面板和属性面板。
- 二维组件画布及二维运行态。
- 四包组装、校验和提交。
- 云渲染会话生命周期和视频容器。
- 输入坐标归一化及输入转发。
- Unity 命令请求、超时、重试和错误呈现。
- Unity 事件转换为编辑器选择或正式命令。

### 4.2 Unity 负责

- 三维场景加载和释放。
- AssetBundle/Prefab/材质/贴图解析和缓存。
- 三维对象实例化、层级和 Transform 应用。
- 三维相机、灯光、天气、粒子、动画和材质表现。
- 鼠标命中、对象选择和高亮。
- Transform Gizmo 的显示、拖动预览和最终提交。
- 运行时对象显隐、交互和数据驱动表现。
- 区块加载、卸载和运行性能管理。
- 加载进度、错误和性能指标上报。

### 4.3 后端负责

- 场景身份和版本书签。
- 当前编辑四包和不可变发布快照。
- 编辑锁、乐观锁、幂等和审计。
- 资源身份、版本、引用和临时下载地址解析。
- 云渲染会话分配、信令地址和访问授权。
- 模板实例化和发布访问控制。
- 数据源、设备绑定和敏感凭据引用。

### 4.4 明确禁止

- Web 直接调用 Unity 场景内 GameObject 名称路径。
- Unity 以自己的场景序列化结果直接覆盖 Web 四包。
- Unity 永久保存临时签名 URL 或前端令牌。
- 页面组件直接访问 DataChannel 或 JSON-RPC Client。
- 属性面板等待 Unity 成功后才更新本地输入值。
- Unity 高频拖动每一帧都生成 Web 撤销记录。
- 断线重连后继续接受旧会话的迟到事件。

## 5. 目标项目结构

```text
Web/web-unity/
├─ docs/
├─ public/
├─ scripts/
├─ src/
│  ├─ app/
│  ├─ auth/
│  ├─ components/
│  ├─ editor/
│  │  ├─ shell/
│  │  ├─ toolbar/
│  │  ├─ assets/
│  │  ├─ hierarchy/
│  │  ├─ inspector/
│  │  └─ viewport/
│  ├─ scene-core/
│  │  ├─ model/
│  │  ├─ validation/
│  │  ├─ store/
│  │  ├─ commands/
│  │  └─ persistence/
│  ├─ unity-runtime/
│  │  ├─ connection/
│  │  ├─ protocol/
│  │  ├─ runtime/
│  │  ├─ input/
│  │  └─ diagnostics/
│  ├─ widgets/
│  ├─ services/
│  ├─ views/
│  └─ test/
├─ package.json
└─ vite.config.ts
```

依赖规则：

```text
views/editor -> scene-core + unity-runtime ports
scene-core   -> 不依赖 Vue、WebRTC、Unity、DOM
unity-runtime -> 依赖协议和云渲染客户端，不依赖业务页面
widgets      -> 可依赖 Vue/ECharts，不依赖 Unity 协议实现
services     -> 后端 HTTP 适配，不依赖 Unity Runtime
```

## 6. 迁移清单

### 6.1 直接迁移并整理命名

| 模块 | 来源 | 处理方式 |
| --- | --- | --- |
| 编辑器外壳 | `src/views/sceneEdit` | 保留交互布局，中央视口替换为 Unity 视频组件 |
| 场景管理 | `src/views/SceneManage` | 保留真实接口和权限能力 |
| 二维组件 | `src/packages/components` | 保留并补充独立导出边界 |
| 属性控件 | `src/components/SceneProperty*` | 保留通用表单控件 |
| 鉴权 | `src/auth` | 保留并清理与旧部署绑定的配置 |
| 四包协议 | `src/integrations/scene/sceneFourPackage.ts` | 迁移后拆为类型、组装、校验、净化四部分 |
| 场景接口 | `src/servers/manual/dim3d` | 迁移真实契约，不复制未使用生成代码 |
| Store/命令 | `src/scene-platform/store`、`commands` | 迁移引擎中立部分并删除 Three 专属历史资源回收钩子 |

### 6.2 迁移后必须重写

| 模块 | 原因 | 目标实现 |
| --- | --- | --- |
| `ViewportHost` | 当前编排 Cesium/Three Runtime | `UnityViewportHost` |
| `RuntimeBridge` | 当前接口包含大量双引擎能力 | 精简为 Unity 命令批处理桥 |
| 拾取适配器 | 当前依赖浏览器 Runtime | 处理 Unity `selection.changed` 事件 |
| Transform 同步 | 当前可直接调用浏览器 Runtime | Web 属性命令 + Unity Gizmo 提交协议 |
| 资源拖放 | 当前 Runtime 可直接加载 URL | 后端资源引用 + Unity 资源加载命令 |
| 预览加载器 | 当前创建浏览器 Runtime | 申请只读 Unity 会话并加载发布快照 |
| 性能监视 | 当前读取浏览器渲染状态 | 展示 Unity 上报指标和 WebRTC 指标 |

### 6.3 不迁移

- `src/scene-platform/runtime/cesium`。
- `src/scene-platform/runtime/three`。
- `src/scene-platform/effects/threeMap`。
- Cesium/Three 专属 Presenter、材质和 Gizmo 实现。
- 浏览器三维流式资源缓存和三维拾取代码。
- `cesium`、`three`、`@types/three` 和 Cesium Vite 补丁。
- 依赖 Three/Cesium 真实画面的专项浏览器冒烟脚本。
- 旧 React 云渲染页面和通过 `useModel('scene.cloudRender')` 暴露全局 Unity API 的模式。

### 6.4 旧项目全量功能盘点与目标归属

本节是最终迁移范围基线。除 6.3 明确列出的浏览器 Three/Cesium 实现外，来源项目的页面、业务流程、配置语义、接口能力、二维组件和视觉设计均属于必须保留范围。首期未实现的功能只能标记为“后续迁移”，不得从产品范围删除。

| 功能域 | 来源模块 | 必须保留的能力 | 目标实现 | 优先级 |
| --- | --- | --- | --- | --- |
| 应用与权限 | `src/router`、`src/layout`、`src/auth` | 路由、布局、登录上下文、权限、模板访问校验、404 | `app`、`auth`、`router`，保留路由语义并替换部署配置 | P0 |
| 场景管理 | `src/views/SceneManage` | 列表、创建、编辑、分类、删除、发布、状态、权限、植被发布校验 | Web 管理端页面与 HTTP 服务 | P0 |
| 模型资源 | `src/views/resourceManage/modelManage` | 上传、分类、编辑、删除、预览、状态、引用 | Web 资源管理；三维预览由 Unity 或资源缩略图服务提供 | P0 |
| 图标资源 | `src/views/resourceManage/iconManage` | 上传、分类、编辑、删除、预览、引用 | Web 资源管理，运行时继续由二维组件消费 | P0 |
| 模板管理 | `src/views/resourceManage/templateManage` | 列表、创建、编辑、分类、发布/使用、权限 | Web 模板管理与四包模板服务 | P0 |
| 场景编辑壳 | `src/views/sceneEdit` | Header、左栏、中央区、右栏、操作状态和原有布局 | Web 编辑器 shell；中央三维区替换为 Unity 视频视口 | P0 |
| 层级与资源面板 | `SceneLeftPanel` | 结构树、内置/自定义模型、图标、模板、装饰、组件、图表、我的资源、拖放 | Web 面板；创建命令经 Scene Core 转发 Unity | P0 |
| 顶部工具 | `SceneHeader` | 保存、预览、发布、模板、退出、撤销、重做、旋转、缩放、手型、重置、距离/角度测量入口 | Web 工具栏；三维操作通过 Unity 能力协商执行 | P0/P1 |
| 属性与设置 | `SceneRightPanel` | 基础属性、场景、灯光、天气、植被、地图、GIS、第一人称、动画、交互、数据、Widget 配置 | Web 表单和 Scene Core；三维表现通过 Unity 专项协议 | P0/P1 |
| 三维场景运行时 | `scene-platform/runtime`、`integrations/scene` | 场景加载、对象、选择、Transform、相机、运行态表现 | Unity Cloud Runtime；Web 只保留领域状态和协议适配 | P0 |
| 二维组件 | `src/packages/components` | Widget、Chart、Decorate、Control 全部组件、配置面板、运行时和样式 | Web `widgets`，不依赖 Unity | P0/P1 |
| 数据绑定 | `src/utils/dataConfig`、`scene/widgetRuntime` | 公共接口、参数、数据集、轮询、图表映射、组件映射、结果绑定 | Web services/runtime，保留原配置语义和动作 | P0/P1 |
| 交互与动作 | `editorSceneInteraction*`、`widgetEventRuntimeService` | 点击、跳转、状态切换、请求动作、场景动作、组件事件 | Web 事件运行时；涉及三维对象的点击由 Unity 上报 `instanceId` | P0/P1 |
| 植被与种植 | `src/views/plantingManage`、vegetation adapters | 物种、规则、动态瓦片、任务进度、发布、正式预览、回滚生命周期 | Web 管理与配置；实例化、瓦片和表现由 Unity | P1/P2 |
| 预览 | `src/views/scenePreview` | 发布快照、只读、二维运行态、交互执行、三维展示 | Web 只读壳 + Unity `loadPublished` | P0 |
| 媒体与外部资源 | `useSceneMediaServer`、资源服务 | 媒体引用、授权、加载状态、错误展示 | Web 管理引用；Unity 处理三维媒体，二维媒体留在 Web | P1 |
| 主题与视觉资产 | `src/assets`、`main.css` | 字体、颜色、间距、图标、背景、水印、Logo、封面、预览图、状态图 | 原样迁移到 `assets`/主题层，做像素级视觉回归 | P0 |

### 6.5 页面与路由迁移清单

目标项目不得只保留 `/editor`。最终路由至少包括：

```text
/sceneManage
/resourceManage/model
/resourceManage/icon
/resourceManage/template
/sceneEdit
/scenePreview
/plantingManage
/:pathMatch(.*)*
```

迁移顺序为：先建立应用壳、鉴权和管理布局，再迁移场景管理与资源管理，随后迁移编辑器，最后接入预览和种植管理。模板路由必须保留来源项目的能力校验；场景编辑和预览路由必须分别支持编辑态与只读态。

### 6.6 引擎耦合分类规则

迁移每个来源文件时必须归入以下四类之一，并在迁移记录中保留来源路径：

1. **直接迁移**：页面、表单、二维组件、数据配置、HTTP 服务、纯类型和纯业务校验。
2. **重构迁移**：Store、CommandBus、四包、场景对象适配、保存和预览加载器；去除页面对旧 Runtime 的隐式依赖。
3. **Unity 替换**：三维加载、资源实例化、拾取、高亮、Gizmo、相机、灯光、天气、植被表现、GIS、粒子、动画、材质和三维性能监控。
4. **删除实现**：仅服务于浏览器 Three/Cesium 的 Runtime、Presenter、材质、射线、GPU 资源回收、三维流式缓存及其依赖。

禁止以“暂未支持 Unity”为理由删除配置入口、保存字段、接口语义或历史数据。Unity 暂不支持的能力必须显示为能力受限状态，并保留配置和迁移缺口记录。

## 7. Web—Unity 协议规划

### 7.1 协议基础

首版协议使用现有 WebRTC DataChannel 承载 JSON-RPC 2.0，协议命名与旧方法隔离：

```text
editor.v1.session.*
editor.v1.scene.*
editor.v1.object.*
editor.v1.selection.*
editor.v1.camera.*
editor.v1.runtime.*
```

每个请求必须携带：

```jsonc
{
  "protocolVersion": 1,
  "sessionId": "cloud-session-001",
  "sceneId": "2095342911956561921",
  "sceneGeneration": 3,
  "requestId": "request-uuid",
  "clientSequence": 102,
  "payload": {}
}
```

约束：

- `sceneId`、`instanceId` 和资源编号使用字符串。
- `sceneGeneration` 每次整场加载递增，用于拒绝上一场景迟到消息。
- `clientSequence` 在当前会话单调递增，用于对象更新乱序保护。
- JSON-RPC `id` 用于请求响应关联，`requestId` 用于业务幂等和日志追踪。
- 大场景完整快照不得无限依赖 10 KB 分包；M1 必须实测 DataChannel 消息上限、分包重组、超时和内存。
- 超大四包优先让 Unity 按受控后端地址读取，DataChannel 只发送加载指令和访问票据，不直接搬运任意大 JSON。

### 7.2 第一批 Web 调 Unity 方法

| 方法 | 用途 | 必须响应 |
| --- | --- | --- |
| `editor.v1.session.initialize` | 协商协议版本、能力和会话 | 是 |
| `editor.v1.scene.loadDraft` | 加载当前编辑修订 | 是 |
| `editor.v1.scene.loadPublished` | 加载不可变发布快照 | 是 |
| `editor.v1.scene.clear` | 释放当前场景 | 是 |
| `editor.v1.object.create` | 创建三维对象 | 是 |
| `editor.v1.object.update` | 更新对象基础属性 | 是 |
| `editor.v1.object.transform.set` | 应用最终 Transform | 是 |
| `editor.v1.object.visibility.set` | 设置显隐 | 是 |
| `editor.v1.object.lock.set` | 设置锁定和拾取能力 | 是 |
| `editor.v1.object.delete` | 删除对象 | 是 |
| `editor.v1.selection.set` | 同步 Web 层级树选择 | 否，可选确认 |
| `editor.v1.camera.focusObject` | 聚焦对象 | 是 |
| `editor.v1.gizmo.mode.set` | 平移/旋转/缩放模式 | 是 |
| `editor.v1.runtime.mode.set` | 编辑/预览模式切换 | 是 |
| `editor.v1.runtime.metrics.get` | 读取诊断快照 | 是 |

### 7.3 第一批 Unity 主动事件

| 事件 | 用途 | Web 处理方式 |
| --- | --- | --- |
| `editor.v1.runtime.ready` | Unity 协议层就绪 | 开始能力协商 |
| `editor.v1.scene.progress` | 场景/资源加载进度 | 更新加载界面 |
| `editor.v1.scene.loaded` | 场景真实加载完成 | 解除编辑禁用 |
| `editor.v1.scene.failed` | 场景加载失败 | 禁止保存空基线并提示重试 |
| `editor.v1.selection.changed` | Unity 画面点击选择 | 更新瞬时选择状态，不进入撤销栈 |
| `editor.v1.transform.preview` | Gizmo 拖动中预览 | 只更新面板预览，不写 Store |
| `editor.v1.transform.committed` | Gizmo 松开最终值 | 创建一条可撤销 Transform 命令 |
| `editor.v1.object.clicked` | 运行态对象点击 | 执行配置的交互事件 |
| `editor.v1.camera.changed` | 相机变化 | 低频更新只读面板；仅明确保存时入 Store |
| `editor.v1.runtime.warning` | 可恢复问题 | 展示诊断，不终止会话 |
| `editor.v1.runtime.error` | 不可恢复问题 | 中止当前操作或重建会话 |
| `editor.v1.runtime.metrics` | FPS、内存、加载统计 | 低频性能面板展示 |

### 7.4 能力协商

Unity 在初始化时返回：

```jsonc
{
  "protocolVersion": 1,
  "runtimeVersion": "1.0.0",
  "capabilities": {
    "sceneTypes": ["local3d"],
    "objectTypes": ["model", "image", "primitive", "light", "camera", "group"],
    "gizmoModes": ["translate", "rotate", "scale"],
    "features": {
      "materialEditing": false,
      "animationEditing": false,
      "particleEditing": false,
      "gis": false
    }
  }
}
```

Web 必须根据能力显隐或禁用工具，不得通过版本号猜测具体功能。

### 7.5 坐标和变换约定

M0 必须冻结以下内容：

- Web 持久化位置单位。
- 欧拉角单位和旋转顺序，或改用四元数。
- Unity 左手坐标与外部协议坐标的转换位置。
- Transform 是 local 还是 world。
- 父子层级变更时 Transform 保持规则。
- 非均匀缩放和负缩放支持边界。

推荐外部协议：

```jsonc
{
  "space": "local",
  "position": [0, 1, 0],
  "rotation": {
    "kind": "quaternion",
    "value": [0, 0, 0, 1]
  },
  "scale": [1, 1, 1]
}
```

Unity 内部转换只在协议适配层完成，Web 属性面板可继续显示欧拉角，但保存和传输使用明确的规范格式。

## 8. 数据与保存策略

### 8.1 保留四包模型

第一阶段继续使用：

```text
sceneJson
threeDJson
twoDJson
dependenciesJson
```

原因：

- 当前后端已有真实接口和联调证据。
- 二维与三维仍需独立恢复。
- 场景级请求、公共接口和场景动作已有明确归属。
- 模板和发布流程已围绕四包建立契约。

### 8.2 Unity 只消费三维和目标依赖

- Web 编辑器读取完整四包并恢复 `SceneStore` 和二维仓库。
- Unity 只获得三维渲染所需的规范快照、资源解析结果和目标行为。
- Unity 不需要理解二维组件内部配置。
- 发布运行态仍按真实激活目标批量读取实例依赖，不全量启动所有数据请求。

### 8.3 资源结构调整

场景持久化只保存稳定资源身份：

```jsonc
{
  "resourceKey": "pump-model",
  "assetId": "2095000000000000001",
  "kind": "model",
  "contentHash": "sha256:...",
  "delivery": {
    "type": "assetBundle",
    "bundleKey": "factory-equipment",
    "assetName": "Pump_A"
  },
  "owners": [
    {
      "domain": "threeD",
      "ownerType": "instance",
      "instanceId": "2095342999999999999"
    }
  ]
}
```

临时下载地址、授权头和本地缓存路径只存在于 Unity 当前会话内存。

### 8.4 保存成功条件

只有满足以下条件，Web 才清除未保存状态：

1. 场景基线已从后端成功恢复。
2. 四包组装和本地校验通过。
3. Unity 没有未确认的最终编辑提交。
4. `saveAll` 返回 `code=200` 且 `conflict=false`。
5. 返回场景编号与当前场景一致。
6. 保存书签和锁版本更新成功。

Unity 命令暂时失败时，Web 保留本地编辑状态并标记“渲染未同步”；不得自动用 Unity 当前画面覆盖 Store。

## 9. 云渲染会话与视口

### 9.1 会话状态机

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

每个状态必须定义：

- 用户可见提示；
- 是否允许编辑；
- 是否允许保存；
- 是否保留当前 Store；
- 是否重试原请求；
- 是否需要重新加载整场景。

### 9.2 重连规则

- 短暂视频轨道中断但 DataChannel 未断开：只恢复视频，不重载场景。
- DataChannel 重建且 Unity 进程未更换：重新协商能力并校验场景代次。
- Unity 进程更换或会话编号变化：视为新 Runtime，重新加载当前 Web Store 快照。
- 重连期间允许保留未保存 Web 编辑，但暂停向 Unity发送新命令。
- 恢复后发送一个完整场景基线，再继续增量命令；不能盲目重放可能重复创建对象的旧请求队列。

### 9.3 输入坐标

必须统一：

```text
DOM pointer coordinates
  -> 去除 video 容器边距
  -> 处理 object-fit 留白/裁切
  -> 归一化到 [0,1]
  -> 映射 Unity 实际 RenderTexture 分辨率
  -> 发送指针和按键事件
```

验收覆盖：

- 16:9、16:10 和自定义窗口。
- 浏览器缩放 80%、100%、125%。
- 高 DPI 屏幕。
- 全屏和非全屏。
- 编辑器左右面板伸缩。
- 视频流分辨率动态调整。

## 10. 里程碑计划

基准团队：2 名前端、2 名 Unity、后端和测试各提供持续支持。基准周期为 8 周；如果只有 1 名前端和 1 名 Unity，建议按 12～14 周评估。

### M0：范围和契约冻结

周期：第 1 周前半段。  
目标：消除后续返工最大的产品和协议不确定性。

任务：

- 确认目标项目正式名称和仓库位置。
- 确认第一期是否包含 GIS。
- 确认 Unity 资源交付格式：AssetBundle、Addressables 或两者兼容。
- 确认编辑态与预览态的云渲染进程分配策略。
- 冻结 Transform、实例编号、资源编号和父子层级协议。
- 冻结协议版本、错误码和能力协商结构。
- 建立 Web、Unity、后端三方字段映射表。

交付物：

- 协议 v1 文档。
- 能力矩阵。
- 四包到 Unity DTO 映射表。
- 首期 MVP 范围、后续 M8-M11 全量迁移范围和明确删除实现清单。

退出标准：

- 三方评审通过。
- 所有 P0 字段有唯一拥有者和唯一解释。
- 不存在需要由 Unity GameObject 名称承担持久化身份的设计。

### M1：独立项目骨架与云渲染连通

周期：第 1 周后半段至第 2 周。  
目标：独立项目可构建、可部署并稳定显示 Unity 视频流。

Web 任务：

- 创建 `Web/web-unity`，保留独立 Git 历史或以明确迁移提交起步。
- 建立 Vue、TypeScript、Vite、Pinia、Vitest 和 Playwright 基础。
- 迁移鉴权、路由、环境配置和管理界面主题基础。
- 将 `@vis/web-cloud-render` 整理为可独立依赖的包或在新项目中重建最小客户端。
- 建立 `UnityViewport`、连接状态和错误界面。

Unity 任务：

- 建立 `editor.v1.session.initialize`。
- 返回 Runtime 版本和能力。
- 统一 DataChannel 初始化、关闭和错误日志。
- 增加会话编号和场景代次。

验收：

- 新项目不依赖 Cesium/Three，生产构建成功。
- 编辑器中央区域可显示 Unity 视频。
- 鼠标和键盘输入能到达 Unity。
- 断开、重连、进程退出有明确状态。
- Web 与 Unity 可完成一轮 JSON-RPC 请求响应。

### M2：Scene Core 和四包迁移

周期：第 2～3 周。  
目标：在无浏览器三维 Runtime 的情况下恢复完整编辑状态。

任务：

- 迁移并精简 `SceneDefinition`、`SceneObject`、图层和资源类型。
- 迁移 `SceneStore`、`CommandBus` 和基础命令。
- 迁移四包组装、解析、净化和校验。
- 迁移场景详情、编辑锁、心跳和保存接口。
- 迁移二维组件及二维画布最小运行能力。
- 删除 `SceneRuntime` 中 Cesium/Three 专属接口，建立 `UnityRuntimePort`。
- 加入协议 DTO 与领域对象之间的纯映射测试。

验收：

- 读取后端四包后，层级树和属性面板可在 Unity 未连接时恢复。
- 四包 round-trip 不丢失对象、二维组件、依赖和行为。
- Core 不 import Vue、DOM、WebRTC 或 Unity 客户端。
- 不可序列化对象和临时地址被保存校验阻断。

### M3：场景加载与双向选择

周期：第 3～4 周。  
目标：Web 场景状态与 Unity 真实画面建立稳定身份映射。

Web 任务：

- 实现 `UnityCloudRuntime.loadScene`。
- 实现加载进度、失败和取消。
- 层级树选择发送 `selection.set`。
- 消费 Unity `selection.changed`。
- 防止选择回环和旧会话迟到事件。

Unity 任务：

- 接收规范场景 DTO。
- 按 `instanceId` 创建运行时注册表。
- 解析资源引用并创建模型实例。
- 实现命中选择和高亮。
- 上报结构化资源错误和加载进度。

验收：

- 20 个对象场景可加载并正确显示层级树。
- Web 选中对象后 Unity 高亮一致。
- Unity 点击对象后 Web 层级树和属性面板一致。
- 空白点击取消选择。
- 重复选择不产生撤销记录。
- 场景切换后旧场景事件不会影响新场景。

### M4：Transform、Gizmo 和撤销闭环

周期：第 4～5 周。  
目标：完成最关键的三维编辑闭环。

Web 任务：

- 属性面板位置、旋转、缩放写入 `CommandBus`。
- RuntimeBridge 合并同一对象短时间内的增量更新。
- 处理 `transform.preview` 和 `transform.committed`。
- 一次 Gizmo 拖动只记录一条命令。
- Unity 应用失败时保留 Store 并显示不同步状态。

Unity 任务：

- 实现平移、旋转、缩放 Gizmo。
- 拖动中限频发送预览。
- 松开时发送规范最终 Transform。
- 处理 Web 属性更新与 Unity Gizmo 会话冲突。
- 锁定对象不允许命中和拖动。

验收：

- 属性面板修改后 Unity 在可接受延迟内同步。
- Unity Gizmo 拖动后 Web 数值一致。
- 撤销/重做后两端一致。
- 拖动 5 秒不产生数百条历史记录。
- 断线发生在拖动过程中时，不提交不完整 Transform。
- 坐标、旋转和父子层级测试全部通过。

### M5：对象生命周期、资源和基础属性

周期：第 5～6 周。  
目标：覆盖日常场景搭建操作。

任务：

- 从资源面板拖入模型。
- Unity 计算落点或使用明确默认点。
- Web 先创建稳定 `instanceId`，再请求 Unity 创建对象。
- 支持名称、显隐、锁定、复制、删除和分组。
- 创建失败时使用 `CommandBus.cancelLatest` 补偿失败命令。
- 后端和 Unity 完成资源地址/AssetBundle 解析。
- 处理资源缺失、版本不匹配和下载失败。

验收：

- 创建、复制、删除均可撤销/重做。
- Unity 失败时不保留空壳对象。
- 相同资产多个实例共享资源但保持独立 Transform。
- 资源 URL 不进入保存四包。
- 删除对象后 Unity 对象、选中态、行为和资源租约正确释放。

### M6：保存、重开、发布和预览

周期：第 6～7 周。  
目标：完成可交付的数据闭环。

任务：

- 接入编辑锁、心跳、解锁和失锁处理。
- 保存前等待最终命令收敛，但不等待无关运行时动画。
- 使用 `saveAll` 一次提交四包。
- 保存失败和冲突保留本地编辑状态。
- 刷新重开时只从后端当前编辑版本恢复。
- 发布后申请只读 Unity 会话。
- 预览只读取发布快照并关闭 Gizmo、创建、删除和保存入口。

验收：

- 创建对象、变换、显隐、锁定、二维组件保存后刷新一致。
- 两个页签并发保存时不会静默覆盖。
- 发布后继续编辑草稿不改变当前预览。
- 预览模式不能执行编辑命令。
- Unity 加载失败不会导致 Web 保存空场景。

### M7：稳定性、性能与上线准备

周期：第 7～8 周。  
目标：达到灰度发布门槛。

任务：

- 建立协议契约测试和 Unity PlayMode/EditMode 测试。
- 建立真实浏览器端到端冒烟。
- 建立长连接、重连和进程替换测试。
- 建立 100、500、1000 对象场景基线。
- 建立 DataChannel 消息、视频延迟和 Unity 帧率指标。
- 加入日志关联：用户、sceneId、sessionId、requestId、instanceId。
- 配置功能开关和旧项目回退入口。
- 完成部署、监控、回滚和运维手册。

验收：

- 2 小时连续编辑无明显内存持续增长。
- 网络短断恢复后 Store 与 Unity 一致。
- Unity 进程重启后可以从当前 Web Store 恢复。
- 关键 E2E 连续执行通过。
- 新项目前端包不包含 Cesium/Three 产物。
- 所有 P0 错误可被用户识别且日志可追踪。

### M8：管理端、资源端和模板端完整迁移

周期：MVP 灰度稳定后。  
目标：补齐旧项目独立产品入口，不再依赖旧项目管理页面。

任务：

- 迁移应用壳、登录上下文、权限、404 和全部最终路由。
- 迁移场景管理、模型资源、图标资源和模板管理。
- 保留上传、分类、编辑、删除、预览、发布、引用和权限语义。
- 接入真实接口、编辑锁、资源版本和模板四包实例化。
- 为模型预览区提供 Unity 只读资源预览或后端缩略图服务，不恢复浏览器 Three/Cesium。

验收：

- 管理端主要流程与旧项目功能等价。
- 模板能力校验与来源项目一致。
- 资源引用、删除保护、版本和权限在场景编辑器中可追踪。
- 管理端视觉回归通过，字体、图标、背景和表格布局无明显偏差。

### M9：二维组件库和数据绑定全量迁移

周期：与 M8 可并行，按组件类别分批交付。  
目标：恢复旧项目全部 Web 二维能力和运行态。

任务：

- 迁移 Widget、Chart、Decorate、Control 全部组件及配置面板。
- 迁移组件样式、默认配置、缩略图、数据映射和响应式行为。
- 迁移公共接口、请求参数、数据集、轮询、图表选项和结果绑定。
- 迁移点击、跳转、状态切换、请求动作和组件事件运行时。
- 通过四包 round-trip 验证组件配置、依赖和行为不丢失。

验收：

- 旧项目组件目录中的组件均有目标注册记录。
- 每类组件至少有配置、保存、重开、预览和运行态测试。
- 数据请求失败、超时和空数据状态可见且不破坏页面布局。
- 二维组件运行不依赖 Unity DataChannel。

### M10：场景专项能力和种植业务迁移

周期：M9 基础能力稳定后。  
目标：补齐旧项目所有场景专项配置和种植管理闭环。

任务：

- 迁移场景、灯光、天气、植被、三维地图/GIS、第一人称、相机路径、动画、交互和媒体配置。
- 为每个专项能力建立 Web 配置模型、四包字段、Unity 能力声明和缺失能力状态。
- 迁移种植管理中的物种、规则、动态瓦片、任务进度、发布、正式预览和回滚流程。
- 为 GIS 明确 Unity 地理坐标、图层、底图、范围和资源服务契约。
- 为测距、测角、相机控制等工具定义 Unity 命令和只读预览行为。

验收：

- 所有旧项目专项面板均可访问，暂不支持项显示明确原因，不静默隐藏。
- 配置保存、刷新重开、模板应用、发布快照和预览结果一致。
- Unity 能力不足时 Web 保留数据并阻止不安全提交。
- 种植发布校验、任务状态和回滚生命周期通过真实接口测试。

### M11：视觉一致性、兼容性和全功能回归

周期：全量能力迁移完成后。  
目标：证明新项目保留旧产品的视觉和业务体验，同时不携带浏览器 Three/Cesium。

任务：

- 以旧项目页面截图和交互脚本建立视觉基线。
- 覆盖管理端、资源端、模板端、编辑器、预览和种植管理的桌面分辨率。
- 回归字体、主题色、间距、图标、背景、水印、封面、弹窗、表格和错误态。
- 执行路由、权限、上传、保存、发布、预览、数据绑定和异常场景回归。
- 扫描依赖、产物和源码，确认不存在 Cesium/Three 运行时和误导性旧 Runtime 入口。

验收：

- P0 功能全部通过；P1/P2 有明确上线状态和遗留清单。
- 关键页面视觉差异经产品确认，非必要不改变交互和样式。
- 关键 E2E 在真实云渲染环境连续通过。
- 新项目可以独立部署、监控、回滚和维护。

### 10.9 全功能验收矩阵

| 验收域 | 必须证明的结果 | 证据 |
| --- | --- | --- |
| 路由与权限 | 所有旧入口存在，权限和模板访问校验一致 | 路由测试、权限矩阵、E2E |
| 管理业务 | 场景、资源、模板、种植全流程可用 | 真实接口回归记录 |
| 编辑闭环 | 加载、选择、Transform、Gizmo、对象生命周期、撤销重做可用 | Web/Unity 契约测试、录屏或 E2E |
| 二维能力 | 全量组件、图表、装饰、控件和数据绑定可保存并运行 | 组件注册表、fixture、运行态测试 |
| 专项三维 | 天气、植被、GIS、灯光、动画、媒体等有 Unity 能力或明确缺口 | 能力矩阵、场景 fixture、缺口清单 |
| 持久化 | 四包保存、模板应用、发布快照、刷新重开不丢字段 | round-trip、冲突和发布测试 |
| 视觉设计 | 页面结构、样式、字体、图标和状态与旧项目一致 | 多分辨率截图对比、产品签收 |
| 引擎边界 | 浏览器不含 Three/Cesium，三维运行完全由 Unity 承担 | 依赖扫描、构建产物扫描、架构检查 |
| 稳定性 | 断网、重连、Unity 重启、资源失败和权限失败可恢复 | 故障注入报告 |

### 10.10 当前迁移缺口与决策项

以下事项在完成对应里程碑前必须形成书面结论：

- `web-unity` 是否直接复用旧项目接口模块，还是建立独立 HTTP service adapter。
- Unity 对天气、植被、GIS、材质、动画、粒子和媒体的能力清单与版本。
- 模型和图标预览采用 Unity 会话、后端缩略图还是静态资源预览。
- 全量二维组件中哪些图表依赖 ECharts 版本和主题配置。
- 旧项目所有真实接口的鉴权、错误码、分页、上传和批量保存契约。
- 旧项目配置中仍存在但新 Unity 尚不支持的字段如何展示、保存和发布。
- 视觉回归的基准浏览器、分辨率、字体加载等待和允许差异阈值。

缺口未关闭前，不能将对应功能标记为“已迁移”；只能标记为“配置已保留”“Web 已迁移”或“Unity 表现已迁移”。

## 11. 原子任务清单

### 11.1 Web P0

| 编号 | 任务 | 依赖 | 验收 |
| --- | --- | --- | --- |
| W001 | 创建独立项目和构建流水线 | M0 | 独立安装、测试、构建成功 |
| W002 | 迁移鉴权和环境配置 | W001 | 独立页签和 iframe 均可取得上下文 |
| W003 | 实现 Unity 云渲染客户端封装 | W001 | 页面不直接访问 WebPlayer |
| W004 | 实现 UnityViewport 和连接状态机 | W003 | 覆盖连接、加载、重连、失败 |
| W005 | 迁移 Scene Core | W001 | 无 UI/引擎依赖 |
| W006 | 迁移 SceneStore/CommandBus | W005 | 基础命令可撤销重做 |
| W007 | 迁移四包解析和组装 | W005 | round-trip 通过 |
| W008 | 迁移场景接口和编辑锁 | W002 | 详情、锁、心跳、保存可用 |
| W009 | 实现 UnityRuntimePort | W003、W005 | API 不泄露 WebPlayer/JSON-RPC |
| W010 | 实现 RuntimeBridge 批处理 | W006、W009 | 对象更新顺序化且可 flush |
| W011 | 迁移编辑器外壳 | W004、W006 | 布局和基础交互可用 |
| W012 | 迁移层级树和属性面板 | W010、W011 | 选择和基础属性闭环 |
| W013 | 实现 Gizmo 事件适配 | W010、U010 | 一次拖动一条历史 |
| W014 | 实现资源拖放创建 | W010、U012 | 失败可补偿 |
| W015 | 实现保存状态机 | W007、W008、W010 | 失败不清脏状态 |
| W016 | 实现只读预览 | W004、W008 | 发布快照、无编辑能力 |
| W017 | 迁移二维组件最小闭环 | W007、W011 | 保存和重开一致 |
| W018 | E2E 与性能采样 | M3～M7 | 自动生成验收证据 |

### 11.2 Unity P0

| 编号 | 任务 | 依赖 | 验收 |
| --- | --- | --- | --- |
| U001 | 建立 `editor.v1` 协议程序集 | M0 | DTO 不依赖页面或旧 API 类 |
| U002 | 封装 BusinessChannel 会话入口 | U001 | 请求、通知、错误统一处理 |
| U003 | 实现能力协商 | U002 | 返回版本和能力矩阵 |
| U004 | 实现场景代次和取消令牌 | U002 | 迟到任务不污染新场景 |
| U005 | 实现场景 DTO 解析与校验 | U001 | 非法场景返回结构化错误 |
| U006 | 建立 `instanceId -> GameObject` 注册表 | U005 | 创建、查找、释放一致 |
| U007 | 实现场景加载/清理 | U004～U006 | 重复加载无残留 |
| U008 | 实现资源引用解析与缓存 | 后端资源契约 | 资源失败可定位 |
| U009 | 实现对象拾取和选择高亮 | U006 | 事件只返回 instanceId |
| U010 | 实现 Gizmo 会话 | U006、坐标协议 | 预览和最终提交分离 |
| U011 | 实现对象属性增量更新 | U006 | 不需要全场重载 |
| U012 | 实现创建、复制、删除 | U006、U008 | 资源和对象正确释放 |
| U013 | 实现编辑/预览模式 | U007 | 预览禁止编辑辅助器 |
| U014 | 实现加载进度和性能指标 | U007、U008 | Web 可低频展示 |
| U015 | 补充协议和场景测试 | U001～U014 | 自动化覆盖关键路径 |

### 11.3 后端/基础设施 P0

| 编号 | 任务 | 验收 |
| --- | --- | --- |
| B001 | 明确云渲染会话分配接口 | 返回 sessionId、signalWS、有效期和访问票据 |
| B002 | 明确信令和 Launcher 错误码 | Web 可区分无资源、启动失败和会话过期 |
| B003 | 保证 `saveAll` 原子性 | 四包不会部分更新 |
| B004 | 保证场景锁和冲突契约 | 失锁和冲突可明确处理 |
| B005 | 提供 Unity 资源解析结果 | 稳定 assetId 映射到版本化 AssetBundle/AssetName |
| B006 | 发布快照可由 Unity 读取 | 只读、不可变、权限正确 |
| B007 | 建立日志关联字段 | sceneId/sessionId/requestId 可跨服务追踪 |

## 12. 测试与验收策略

### 12.1 Web 单元测试

必须覆盖：

- 四包解析和序列化。
- 纯 JSON 和敏感字段净化。
- CommandBus 撤销、重做、合并和失败补偿。
- Unity 事件的会话、场景代次和序列过滤。
- Transform 坐标转换。
- 选择回环抑制。
- 连接状态机和重连策略。
- 保存冲突和失锁处理。

### 12.2 Unity 自动化测试

必须覆盖：

- 协议 DTO 反序列化和版本拒绝。
- 场景代次取消。
- 对象注册表创建、查找、删除。
- Transform 转换和父子层级。
- Gizmo 预览与最终提交。
- 同 requestId 幂等。
- 旧 sequence 拒绝。
- 场景清理后无迟到对象重建。

### 12.3 协议契约测试

使用同一组 JSON fixture 在 Web 和 Unity 双端验证：

- 合法请求和响应。
- 缺少字段。
- 未知字段前向兼容。
- 不支持协议版本。
- int64 字符串编号。
- 超时和重复请求。
- 大消息分片和乱序。
- 错误响应结构。

### 12.4 端到端核心用例

1. 登录并进入编辑器。
2. 申请云渲染会话并显示视频。
3. 加载包含 20 个模型的场景。
4. 层级树选中对象，Unity 高亮。
5. Unity 点击对象，Web 选中。
6. 属性面板修改位置。
7. Unity Gizmo 拖动并提交。
8. 撤销、重做。
9. 拖入一个模型并等待资源完成。
10. 复制、隐藏、锁定和删除。
11. 添加二维组件。
12. 保存、刷新和重开。
13. 发布并打开只读预览。
14. 模拟断网和 Unity 进程重启。

## 13. 性能与质量门禁

### 13.1 Web 指标

- 页面首次可交互时间。
- 云渲染会话申请耗时。
- 视频首帧时间。
- DataChannel 就绪时间。
- 命令请求 P50/P95 往返时间。
- 属性输入到 Unity 画面更新延迟。
- Unity 点击到 Web 选中延迟。
- 连接断开后的恢复时间。
- 大场景层级树滚动和搜索性能。

### 13.2 Unity 指标

- 场景加载总耗时和阶段耗时。
- AssetBundle 下载、解压和实例化耗时。
- 运行 FPS、主线程耗时、GPU 帧时。
- 总内存、纹理和 Mesh 内存。
- 对象数、区块数和加载队列。
- 单对象增量更新耗时。
- 清场和资源释放耗时。

### 13.3 首期建议门槛

具体数值应在 M1/M3 基线后冻结；在没有真实部署证据前，不把估算值伪装成承诺。最低行为门禁：

- 高频输入不逐事件触发全场加载。
- 同对象 Transform 更新可合并。
- 性能指标采样不遍历完整 Unity 场景树。
- 重连不重复创建同一 `instanceId`。
- 长时间编辑不存在无上限请求队列和历史栈。
- 释放场景后资源和事件订阅可收敛。

## 14. 风险和应对

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| 旧云渲染包与旧 React 工程耦合 | 高 | 只抽传输核心，建立独立 Vue 适配和类型声明 |
| Unity 旧 API 数量巨大且缺少版本 | 高 | 新建 `editor.v1` 聚合协议，不继续直接暴露旧方法集合 |
| Web 和 Unity 双写状态 | 高 | Web 永久状态唯一；Unity 最终编辑回传后转换为 Web Command |
| DataChannel 大消息和分包不稳定 | 高 | M1 压测；大场景改为 Unity 按票据读后端快照 |
| Transform 坐标/旋转不一致 | 高 | M0 冻结规范，双端 fixture 验证 |
| Unity 资源模型与四包 AssetRef 不一致 | 高 | 建立稳定资源映射 DTO，资源地址不入场景包 |
| 重连后运行时状态漂移 | 高 | 新进程加载当前 Store 完整基线，不盲目回放旧请求 |
| 云渲染输入坐标偏移 | 中 | 统一归一化坐标和多分辨率自动化用例 |
| 前端迁移时复制过多旧引擎代码 | 高 | 使用允许列表迁移；CI 禁止 Cesium/Three 依赖和 import |
| 后端保存原子性未完全验收 | 高 | 在 M6 前完成失败注入和重开核对 |
| 用户改动与迁移分支长期分叉 | 中 | 按模块小批迁移，保留来源提交和差异记录 |
| 同时追求全部高级功能导致延期 | 高 | M4 Transform 闭环未通过前不启动高级效果迁移 |

## 15. 分支、仓库和迁移策略

建议：

1. 新项目使用独立仓库或独立顶级目录，不作为 `jtyf-web-three` 的长期分支。
2. 初始提交只包含可构建骨架。
3. 后续按模块迁移，每个提交记录来源路径和删改原因。
4. 不复制 `node_modules`、构建产物、Cesium 静态资源和现有临时文件。
5. 不修改 `jtyf-web-three` 现有业务以迁就新项目；共用能力稳定后再评估提取共享包。
6. 第一阶段不要立即抽大型 Monorepo 公共包，避免迁移与抽象同时扩大范围。
7. 当 Scene Core、四包和属性控件在两个项目连续稳定两个版本后，再评估提取共享包。

建议提交顺序：

```text
chore: initialize unity editor web project
feat: add cloud render connection lifecycle
feat: migrate scene core and command bus
feat: support four-package scene loading
feat: add unity scene runtime bridge
feat: synchronize selection and transform
feat: support object lifecycle and assets
feat: complete save publish preview flow
test: add unity editor end-to-end acceptance
```

## 16. 灰度与回滚

### 16.1 灰度策略

- 场景列表按租户、用户或场景配置开放“Unity 新编辑器”。
- 新旧编辑器使用不同路由，不在同一页面动态切换三维 Runtime。
- 首批只允许测试场景或复制场景进入新编辑器。
- 新编辑器保存前必须确认场景已经拥有新协议兼容标记。
- 监控会话申请失败、场景加载失败、RPC 超时、资源失败和保存冲突。

### 16.2 回滚边界

- 前端发布可回滚到上一版本。
- Unity 云渲染镜像/程序包必须可按版本回滚。
- 协议 v1 在灰度期间保持向后兼容，新增字段优先可选。
- 已经由新编辑器保存的四包仍应能被新项目上一稳定版本读取。
- 不允许通过删除数据库字段完成回滚。
- 旧编辑器若不能安全理解新字段，只允许只读或明确阻断，不得覆盖保存。

## 17. 人员建议

### 最低可行配置

- 1 名前端：项目骨架、编辑器迁移、四包和云渲染客户端。
- 1 名 Unity：协议层、场景加载、选择、Gizmo 和资源。
- 后端兼职支持：会话、资源解析、保存和发布。
- 测试兼职支持：真实环境与异常流程。

预计：12～14 周，且高级能力后移。

### 推荐配置

- 前端 A：Scene Core、Store、四包、后端接口。
- 前端 B：编辑器 UI、UnityViewport、连接和 E2E。
- Unity A：协议、场景加载、对象生命周期和资源。
- Unity B：拾取、Gizmo、相机、运行时诊断和性能。
- 后端 0.5～1 人：会话、资源和发布接口。
- 测试 0.5～1 人：协议、浏览器、真实云环境和回归。

预计：8 周完成可灰度 MVP。

## 18. 决策门

启动实施前必须确认：

| 编号 | 决策 | 未确认的影响 |
| --- | --- | --- |
| D001 | 目标项目正式名称和仓库 | 无法建立流水线和权限 |
| D002 | MVP 是否包含 GIS | 影响数据模型、Unity 能力和周期 |
| D003 | Unity 资源交付格式 | 影响资源 DTO 和后端解析接口 |
| D004 | 云渲染会话分配接口 | 无法完成真实连接生命周期 |
| D005 | 编辑和预览是否复用同一 Unity 构建 | 影响能力开关和部署 |
| D006 | Transform 坐标和旋转规范 | 双端编辑会产生不可逆偏差 |
| D007 | Unity 是否直接读取后端发布包 | 影响大消息传输和鉴权 |
| D008 | 四包 schema 首版是否继续为 1 | 影响兼容和迁移器 |

建议默认值：

- 项目名：`web-unity`。
- MVP：先完成 `local3d`，GIS 独立评审。
- 编辑/预览：同一 Unity 构建，通过明确模式禁用编辑能力。
- 状态真源：Web `SceneStore`。
- 持久化：沿用后端四包 `saveAll`。
- 传输：WebRTC DataChannel + JSON-RPC 2.0。
- 三维资源：后端稳定资源编号映射 Unity 版本化资源包。

## 19. MVP 完成定义

以下条件全部满足才可标记 MVP 完成：

- 存在独立、可部署的 `web-unity` 项目。
- 生产依赖和构建产物中没有 Cesium/Three。
- Web 与 Unity 协议 v1 有文档、类型和双端契约测试。
- 场景加载、选择、Transform、Gizmo、创建、删除和撤销闭环完成。
- 四包保存、刷新重开和版本冲突处理完成。
- 发布预览使用不可变快照且为只读模式。
- 网络短断、Unity 进程重启和资源失败有可恢复行为。
- 真实部署环境完成至少一轮 20 对象和一轮大场景验收。
- 所有阻断问题有日志关联字段，可以从 Web 请求追踪到 Unity 会话。
- 旧项目未被破坏，且存在明确灰度和回滚入口。

## 20. 推荐立即启动的第一批工作

第一批只启动以下五项：

1. 评审并冻结 D001～D008。
2. 创建 `Web/jtyf-web-unity` 空项目和 CI。
3. 从旧 `web-cloud-render` 提取最小 WebRTC/DataChannel 客户端并完成 Vue 连接页。
4. Unity 新建 `editor.v1.session.initialize` 和能力协商。
5. 建立一组跨 Web/Unity 共用的协议 JSON fixture。

在这五项通过前，不迁移复杂属性面板、天气、植被、材质和动画功能。第一项可见业务闭环固定为：

```text
加载场景
  -> 双向选择
  -> Transform 属性编辑
  -> Unity Gizmo 提交
  -> 撤销/重做
  -> 保存
  -> 重开一致
```

该闭环是后续所有高级能力的架构门禁。

## 20. 全量迁移完成定义

只有以下条件全部满足，才能将 `web-unity` 标记为“完整替代旧前端”；MVP 灰度完成不等于全量迁移完成：

- 旧项目最终路由对应的管理端、资源端、模板端、场景编辑、场景预览和种植管理均已迁移。
- 旧项目二维组件目录中的 Widget、Chart、Decorate、Control 均有目标实现、注册记录和回归用例。
- 数据绑定、轮询、图表映射、组件事件、页面跳转和场景动作均可保存、重开和运行。
- 天气、植被、GIS、灯光、相机、动画、粒子、材质、媒体和测量等专项能力均已由 Unity 实现，或有经过产品确认的能力缺口与兼容策略。
- 旧项目的字体、主题、图标、背景、封面、表格、弹窗和状态样式完成视觉回归，差异有签收记录。
- 所有历史四包字段和业务接口语义均可读取；不支持的字段不得静默丢失。
- 浏览器构建、依赖树和运行时代码不包含 Cesium/Three 三维实现；所有三维画面、拾取、Gizmo 和资源实例化均由 Unity 云渲染承担。
- 旧项目仍可独立回滚或继续维护，新项目具备独立部署、监控、故障诊断和版本回退能力。