# Runtime Orchestration Contract

这份文档定义 Delphi v0 的运行时合同：run 生命周期、planner 职责、agent 执行约束、event stream 语义和降级策略。

## 0. Runtime Unit

v0 runtime 的唯一主执行概念是 `run`。

说明：

- thread4 的编排合同、事件流、task、finding、decision 全部以 `run_id` 为唯一作用域
- `session` 在 v0 不进入 orchestration contract、event 语义或 graph schema
- 如果应用层、前端或 Postgres 需要 `session_id`，可以作为上层元数据存在，但不参与 runtime 编排语义
- 未来若支持多轮追问、同 case 连续研究，再把 session 提升为一等概念

## 1. Run Lifecycle

v0 统一生命周期：

`created -> planned -> agent_running -> synthesizing -> completed / failed / degraded`

说明：

- `created`: query 已接收，run 已建立
- `planned`: planner 已解析 query 并生成 tasks
- `agent_running`: agent 正在执行
- `synthesizing`: Judge 正在汇总
- `completed`: 成功输出 final report
- `failed`: 无法继续且无可接受降级
- `degraded`: 已输出结果，但存在明显缺失或部分失败

## 2. Planner Responsibilities

Planner 只做最小必要工作：

- 解析用户问题
- 识别 ticker
- 识别时间范围
- 推断 case type
- 生成 4 个初始 tasks
- 分配给固定 agent

Planner 不负责：

- 直接形成最终结论
- 替每个 agent 做完整分析
- 动态扩展 agent roster
- session 级记忆编排

## 3. Agent Execution Contract

每个 agent 执行顺序默认是：

1. 读取 task 与必要上下文
2. 调用 tools / skills
3. 形成 structured findings
4. 生成 graph patches
5. 发出 completion event

Judge 额外步骤：

6. 消费前置 findings
7. 输出 `Decision`、6 个固定 `ReportSection` 与 `FinalReport`

补充约束：

- v0 第一阶段，Judge 默认先写 runtime `Decision + ReportSection`
- stable `Judgment` 不是每次 run 的强制产物
- 只有当结果不是 degraded、evidence 足够、且相关 patch 校验通过时，后续阶段才考虑额外持久化 stable `Judgment`
- Judge 可消费 `Finding.object_refs` 形成 stable-object lineage 元数据，用于报告与后续 UI trace

## 4. Tool / Skill Registry Contract

tools / skills 在 v0 中是受控注册能力，而不是任意函数池。

每个注册项至少定义：

- capability name
- description
- input shape
- output shape
- allowed agents
- failure semantics

实现约束：

- v0 先使用静态 TypeScript registry
- 先不要做配置化 registry、动态装载或工作流编排系统
- runtime 可以保留薄抽象层，便于未来从配置生成 registry，但当前默认来源是静态代码
- execution provider 可以作为独立切换层存在，例如 `fixture` / `openai`
- provider 只负责生成结构化分析结果，不拥有 Delphi 的 run / graph / report 持久化语义

v0 至少应存在：

- market data retrieval
- macro / liquidity retrieval
- graph patch proposal
- graph context retrieval
- report assembly helper

图访问边界：

- agent 不直接拿 shell 权限
- agent 不直接执行 Cypher
- 正确链路是：
  - `agent -> thread4 tool call -> thread2 graph adapter -> validator/writer -> Neo4j`

## 5. Event Stream Contract

前端只依赖 `RunEvent`，不直接读取 runtime 内部状态对象。

每次 run 至少应出现这些关键事件：

- run created
- planner completed
- task assigned x4
- tool start / finish
- finding created
- patch accepted / rejected
- judge synthesis started
- report ready

补充要求：

- runtime 至少应支持一个 query submission / run creation endpoint，例如 `POST /runs`
- 事件必须是 run-scoped
- UI 只消费事件，不依赖 runtime 内存状态
- `ReportSection` 在 runtime 中固定映射为 6 个 section 节点，即使某 section 内容为空也保留节点
- 对 frontend shell 的最小 transport contract 可以是：
  - `POST /runs` 接收 query submission，并返回 `runKey` 与后续消费 endpoint
  - `GET /runs/:runKey/events` 返回 SSE `RunEvent`
  - `GET /runs/:runKey/report` 返回 `{ run, reportSections, finalReport }`
  - `GET /runs/:runKey/terminals` 返回按 agent 分组的 terminal transcript snapshot
  - `GET /runs/:runKey/terminal-stream` 返回 SSE terminal chunks
- snapshot endpoint 在 run 尚未完成时也必须可访问，至少返回当前 `run` 与固定 6 个 `ReportSection` 占位
- terminal stream 必须来自真实 runtime action / event，而不是前端伪造动画
- v0 默认 terminal stream 是受控 command/event stream，不等于把真实 shell / PTY 暴露给 agent 或浏览器
- runtime 可通过显式 execution mode 切换 fixture executor 与真实 provider-backed executor
- 若 execution mode 依赖外部模型 provider，缺少 API key 或 model 配置时必须直接失败，不允许静默回退

## 6. Parallelism Policy

v0 的“多 agent”以可观察的真实协作为目标，不以极致并发为目标。

允许：

- Thesis、Liquidity、Market Signal 并行或准并行
- Judge 在后置阶段汇总

不要求：

- 所有 agent 真并发到底层执行
- 复杂的抢占式调度
- 自动重试与复杂恢复机制

## 7. Degraded Mode Policy

进入 degraded mode 的典型条件：

- 某个数据源失败
- 某 agent 失败但其他 agent 成功
- 某些 patch 被拒绝但最终仍可形成报告

degraded mode 下必须：

- 输出 final report
- 显示不确定性或缺失维度
- 发出明确 degraded event

v0 第一阶段不要求：

- 自动重试
- 智能恢复
- 动态补偿调度

## 8. Hard Constraints

- 不暴露真实 shell 给 agent
- 不允许 agent 直接写数据库
- 不允许 UI 与 runtime 状态脱节
- 不允许 Judge 完全忽略前置 findings
- 不允许把 OpenAI Agents SDK session 直接等同于 Delphi runtime 语义

## 9. Acceptance Criteria

- 没有 UI 时，也能从日志 / 事件序列中看清整次 run
- 有 UI 时，右侧 canvas 能准确复现关键状态变化
- 新增 tool 时只需扩展注册表，不需要重写整体 runtime
- runtime-first judgment 能先跑通；stable judgment 作为后续条件化持久化能力追加
