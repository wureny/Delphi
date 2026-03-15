# Architecture

这份文档给未来实现 agent 一个稳定的系统视图。它不描述所有细节，但锁定模块边界和默认技术路线。

## 1. System Context

- 用户端：
  - 一个双栏 Web 应用
  - 左侧是问答与结构化报告
  - 右侧是 agent canvas
- 应用层：
  - 负责 query intake、run 管理、事件流推送、最终报告读取
- AI / orchestration 层：
  - 负责 planner、4 个固定 agent、tool/skill 调度、Judge synthesis
- 图层：
  - 负责 ontology objects、knowledge graph facts、runtime context graph
- 业务数据层：
  - 负责 run、report、snapshot、raw data、cache、session 等结构化记录
- 外部集成：
  - OpenBB 为主
  - 未来可加少量 signal source

## 2. Standard Kit

v0 默认技术标准包：

- Web / app: `Next.js + TypeScript`
- Runtime / orchestration: `TypeScript custom runtime`
- Relational data: `Supabase / Postgres`
- Graph: `Neo4j`
- Primary market data adapter: `OpenBB`
- Deployment preference: `supports long-running Node workloads`

不建议 v0 默认引入：

- ADK 等额外 agent framework
- 多语言混合 runtime
- 真实 shell 执行

## 3. Layered Model

### Product / UI Layer

- 接收 query
- 渲染结构化报告
- 消费 `RunEvent` 展示 agent 状态

### Application Layer

- 创建 run
- 管理请求生命周期
- 暴露 API / SSE

### Orchestration Layer

- Planner 解析任务
- 4 个固定 agent 执行
- Judge 整合 findings

### Graph Control Layer

- 接收 `GraphPatch`
- 做 schema / scope / growth 校验
- 写入 Neo4j

### Data Access Layer

- 调用 OpenBB 和其他数据源
- 做最小 normalization
- 写入 snapshot 与 cache

## 4. High-Level Flow

1. 用户提交 query
2. 应用层创建 `ResearchQuery` 与 run
3. Planner 生成 `AgentTask`
4. 4 个固定 agent 调用 skills / tools
5. agent 产出 `Finding` 和 `GraphPatch`
6. Graph writer / validator 校验并写回 Neo4j
7. Judge 读取 findings 与图上下文
8. 生成 `FinalReport`
9. UI 同时看到结果和过程

## 5. Major Modules

| Module | Responsibility | Why it exists |
| --- | --- | --- |
| Frontend shell | 左结果右过程的双栏体验 | 承载产品与演示价值 |
| Run API | query intake, run creation, report retrieval | 统一应用入口 |
| Event stream | 推送实时状态到前端 | 让 canvas 真实而非 mock |
| Planner | 从 query 生成可执行任务 | 控制执行起点 |
| Agent runtime | 驱动 agent 行为与输出合同 | 保证结构化执行 |
| Tool registry | 封装 data / graph / utility capabilities | 防止 agent 绕过系统设计 |
| Graph writer / validator | 约束 Neo4j 写入 | 落地 bounded runtime |
| Data normalization | 把外部数据转成内部可消费结构 | 减少 agent 直接依赖外部格式 |

## 6. Non-Functional Requirements

- 延迟：
  - gold demo query 在 60-120 秒内完成
- 可维护性：
  - 文档优先，接口先行，减少隐式耦合
- 可观测性：
  - 每个重要状态变化都应对应 `RunEvent`
- 可演示性：
  - UI 必须在任意时刻能说明当前系统在做什么
- 可降级性：
  - 单点数据源失败不能导致整次 run 失效

## 7. Design Constraints

- 只做单 ticker
- 只做 4 个固定 agent
- trace 是必须品，不是加分项
- 图层必须受 validator 保护
- 产品界面不能退化成工程控制台

## 8. Risks

- 过度建模导致项目进度失控
- 过度追求“agent 感”导致系统真实约束变弱
- 多数据源接入过早导致稳定性下降
- runtime 事件设计过散导致 UI 难以可靠消费

## 9. Companion Specs

- [2026-03-core-interface-contract.md](/Users/wurenyu/workspace/Delphi/docs/04-engineering/specs/2026-03-core-interface-contract.md)
- [2026-03-ontology-context-graph-contract.md](/Users/wurenyu/workspace/Delphi/docs/04-engineering/specs/2026-03-ontology-context-graph-contract.md)
- [2026-03-data-layer-contract.md](/Users/wurenyu/workspace/Delphi/docs/04-engineering/specs/2026-03-data-layer-contract.md)
- [2026-03-runtime-orchestration-contract.md](/Users/wurenyu/workspace/Delphi/docs/04-engineering/specs/2026-03-runtime-orchestration-contract.md)
