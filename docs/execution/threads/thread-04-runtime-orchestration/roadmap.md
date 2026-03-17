# Thread 04 Roadmap

## Goal

把 Delphi v0 的 orchestration runtime 从“合同存在”推进到“最小真实闭环可运行”：

- 接住用户 query
- 建立 run / session
- 产出固定少量 tasks
- 驱动固定 agent 执行
- 写入 `Finding` / `Decision` / `ReportSection`
- 通过 `submitGraphPatch()` 把 runtime 实例图真正落到 Neo4j
- 发出 UI 可消费的 `RunEvent`

第一阶段的目标不是做复杂调度系统，而是先让这条主链真实出现：

`Query -> Task -> Finding -> Decision -> ReportSection`

## Scope

- thread4 负责：
  - run / session model
  - planner 最小拆解逻辑
  - runtime event model 与 event emission
  - 固定 agent 执行合同
  - `Finding` / `Decision` / `ReportSection` runtime 写入主链
  - 对接 thread2 的 `submitGraphPatch()` / validator / writer
  - 定义与 thread3 的 data ingestion contract
- thread4 不负责：
  - 复杂 scheduler
  - cross-run memory / pattern compression
  - 自动重试、抢占式调度、恢复机制
  - 多 agent marketplace
  - 真实 UI 渲染
  - 大而全的数据接入实现

## Current Status

### Done

- 已完成 thread4、thread2、thread3、`00-project`、`03-engineering` 相关文档阅读
- 已收敛产品目标：
  - v0 要的是“真实可观察 research runtime”，不是静态 schema 展示
- 已确认 thread2 可直接消费的现成合同：
  - [runtime.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/runtime.ts)
  - [validator.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/validator.ts)
  - [graph-writer.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/graph-writer.ts)
  - [neo4j-adapter.ts](/Users/wurenyu/workspace/Delphi/src/research-graph/neo4j-adapter.ts)
- 已确认当前仓库还没有 runtime/orchestrator 代码骨架，thread4 需要从零建立最小实现

### In Progress

- 把 thread4 第一阶段从文档合同收敛成可实现 roadmap

### Not Started

- run/session 代码骨架
- planner
- agent execution runtime
- event bus / SSE-ready event stream
- thread3 对 runtime 的 ingestion contract
- static tool / skill registry

## Main Design Judgment

thread4 第一阶段不再继续发明新静态结构，而是优先把实例级 runtime graph 跑出来。

原因很简单：

- thread2 已经把 graph schema、patch contract、validator、writer 边界准备好了
- thread3 的 normalization contract 也需要 runtime 先定义消费面
- 如果 thread4 不先建立 runtime 主链，Neo4j 里只会有 registry，不会有真正的 run 实例图

所以第一阶段只做“最小但真实”的 orchestrator：

1. 接 query
2. 建 run
3. planner 拆 4 个初始 task
4. agent 执行并产出 finding / patch
5. patch 经 `submitGraphPatch()` 校验并落库
6. judge 汇总成 decision / report sections
7. 整个过程发出标准 `RunEvent`

## Recommended Build Order

1. 定义 run domain model
2. 定义 `RunEvent` emitter / sink interface
3. 实现最小 planner，固定生成 4 个初始 tasks
4. 定义 agent execution contract 和 runtime coordinator
5. 接入 thread2 的 graph submission flow
6. 让非 Judge agent 先稳定写出 `Finding`
7. 让 Judge 写出 `Decision` 和 `ReportSection`
8. 打通 CLI/log 级别 demo run
9. 再和 thread3 对齐 data ingestion contract

## Phase Plan

### Phase 0: Contract Lock

- 对齐并必要时修订 canonical docs：
  - [2026-03-runtime-orchestration-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-runtime-orchestration-contract.md)
  - [2026-03-core-interface-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-core-interface-contract.md)
- 已锁定：
  - runtime 唯一主概念是 `run`
  - `session` 不进入 v0 orchestration contract
  - `ReportSection` 固定为 6 个 runtime 节点
  - tool / skill registry 先用静态 TypeScript 注册表
  - Judge 第一阶段默认只写 runtime judgment
- 仍需在代码层固定：
  - run id 与 query id 的关系
  - `Decision.decisionType`
  - degraded event 的最小 payload

### Phase 1: Runtime Main Path

- 新建 orchestration 模块代码骨架
- 定义：
  - `RunRecord`
  - `RunStatus`
  - `PlannerOutput`
  - `AgentExecutionResult`
  - `RuntimeEventSink`
- 最小 planner 输入：
  - `ResearchQuery`
- 最小 planner 输出：
  - 固定 4 个 `AgentTask`
    - thesis
    - liquidity
    - market_signal
    - judge
- 其中 Judge 默认依赖前三者 findings，不单独抢跑

### Phase 2: Graph-Backed Execution

- 每个 agent 完成后至少产出：
  - 0-3 条 `Finding`
  - 0-1 个 `GraphPatch`
- runtime 不直接写 Neo4j，只能调：
  - `submitGraphPatch()`
- patch 结果统一转成事件：
  - `patch_accepted`
  - `patch_rejected`
- Judge 消费 findings 后写：
  - `Decision`
  - 6 个固定 `ReportSection`

### Phase 3: Demo-Ready Orchestration Loop

- 先提供 CLI / script 级别 run 入口
- 能打印完整事件序列
- 能在 Aura 中查到一条真实 runtime 主链
- 能输出一份结构化 `FinalReport`

## Solution Outline

### 1. Runtime Module Layout

建议新增扁平的 `src/orchestration/`，先不要过度拆层。

第一阶段建议文件：

- `run-session.ts`
- `planner.ts`
- `events.ts`
- `agent-runtime.ts`
- `orchestrator.ts`
- `report.ts`
- `index.ts`

### 2. Execution Model

- 单次用户 query 对应一个 `run`
- v0 默认一个 run 只研究一个 ticker
- planner 固定产出 4 个任务
- thesis / liquidity / market_signal 可并行或准并行
- judge 后置执行
- 没有复杂任务抢占和自动重试

### 3. Agent Contract

每个非 Judge agent 的最小输出：

- `AgentTask` 状态更新
- `Finding[]`
- 可选 `GraphPatch`
- 完成 / 降级 / 失败事件

Judge 的最小输出：

- `Decision[]`
- `ReportSection[]`
- `FinalReport`

### 4. Event Discipline

UI 不直接读 runtime 内存状态，只读 `RunEvent`。

第一阶段必须稳定出现的事件：

- `run_created`
- `planner_completed`
- `task_assigned`
- `tool_started`
- `tool_finished`
- `finding_created`
- `patch_accepted`
- `patch_rejected`
- `judge_synthesis_started`
- `agent_completed`
- `agent_failed`
- `degraded_mode_entered`
- `report_ready`

### 5. Graph Write Discipline

- runtime graph 写入只走 `GraphPatch`
- runtime coordinator 不拼 Cypher
- patch basis refs 必须尽量回指到 findings / evidence / task outputs
- Judge 不能绕过 findings 直接产出不可追踪 judgment

## Proposed Dependency Boundary

### With Thread 02

thread4 直接消费 thread2 提供的图层合同，不重复抽象一层：

- `submitGraphPatch()`
- `validateGraphPatch()`
- `Neo4jGraphWriter`
- runtime node / edge registry

thread4 需要向 thread2 反向确认的点：

- runtime patch context 里 `existingStableIdentities` 由谁提供
- `ReportSection -> Finding / Evidence` 的引用约束是否还需补 validator
- judge 写 `Judgment` 时 basis refs 的最低要求是否要再收紧

### With Thread 03

thread3 不应直接决定 runtime 怎么消费数据；thread4 要先给出 ingestion contract。

第一阶段建议 thread4 对 thread3 暴露一个很小的消费面：

- `getCompanySnapshot(ticker, runContext)`
- `getNewsSnapshot(ticker, runContext)`
- `getMarketSnapshot(ticker, runContext)`
- `getMacroLiquiditySnapshot(runContext)`

这些返回值先是 normalization 后的内部 shape，不直接暴露 provider 原始 payload。

后续 thread3 需要保证：

- snapshot 带抓取时间
- 每个 snapshot 可映射到 `Evidence`
- failure / partial failure 可被 runtime 感知并降级

## Open Design Questions Before Implementation

这些点已经定下来，后续实现默认按此执行：

1. v0 runtime 先只保留 `run`
2. Judge 第一阶段先只写 runtime `Decision + ReportSection`
3. `ReportSection` 在 graph 中固定为 6 个节点
4. tool/skill registry 先做静态 TS 注册表
5. thread3 第一阶段应是“内部 adapter contract + 一个真实 OpenBB adapter”

## Collaboration Rules

thread4 后续实现过程里，以下情况应先停下来沟通：

- 需要改 `RunEvent` 枚举或关键 payload
- 需要改 core interface 的必填字段
- 需要改 thread2 validator 才能让主链成立
- 发现 thread3 的 snapshot shape 无法稳定映射到 `Evidence`
- 发现 4-agent 固定拆分无法支撑 gold demo query

可以直接推进、不需要先停的情况：

- 在 thread4 自己目录补文档
- 在 runtime 内新增内部 helper types
- 为了减少耦合而做小范围命名调整
- 在不破坏兼容的前提下补充事件 payload 字段

## Risks

- runtime 先天过重，导致 thread4 迟迟没有第一条真实 run
- 为了“多 agent 感”过早引入复杂调度
- Judge 直接生成好看的报告，但 trace 不真实
- 事件流设计太散，前端后续难消费
- thread3/thread4 边界不清，runtime 被迫理解 provider 原始格式

## Exit Criteria

- CLI / log 级别可以跑通一条单 ticker query
- 生命周期至少能清晰经过：
  - `created -> planned -> agent_running -> synthesizing -> completed/degraded`
- Neo4j 中能看到一条真实 runtime 主链：
  - `Query -> Task -> Finding -> Decision -> ReportSection`
- patch 写入统一走 `submitGraphPatch()`
- patch 拒绝能形成 `patch_rejected` 事件
- Judge 输出的 `FinalReport` 至少能回指部分 findings
- thread3 可以据此开始做 runtime ingestion contract

## Next Concrete Tasks

- 把 runtime 第一阶段实现范围同步确认下来
- 补 thread4 的 `notes.md`，记录 design decisions 和 open questions
- 更新 runtime/core/agent 三份相关合同
- 建 `src/orchestration/` 最小骨架
- 先做一个不依赖 UI 的 demo runner
