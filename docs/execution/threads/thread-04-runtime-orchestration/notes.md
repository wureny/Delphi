# Thread 04 Notes

## Locked Decisions

- v0 runtime 主概念只保留 `run`，不把 `session` 引入 orchestration contract
- Judge 第一阶段默认只写 runtime `Decision + ReportSection + FinalReport`
- stable `Judgment` 是二阶段、条件化持久化能力
- `ReportSection` 在 graph 中固定为 6 个 runtime 节点
- tool / skill registry 先做静态 TypeScript 注册表
- thread3 第一阶段不是只给 contract，占位后必须尽快接一个最小真实 OpenBB adapter
- graph access 只能通过 thread4 的受控 tool -> thread2 graph adapter 链路

## Implementation Notes

- thread4 负责把一次 research run 真正串起来：
  - RunManager
  - PlannerRouter
  - AgentExecutor
  - ToolRegistry
  - SkillRegistry
  - GraphContextReader
  - GraphPatchGateway
  - JudgeSynthesizer
  - EventBus / SSEPublisher
  - DegradedModeHandler
- thread4 不负责：
  - 发明 ontology / graph schema
  - 重做 thread3 provider normalization
  - 给 agent 真实 shell 权限
  - 动态 agent marketplace
  - 配置化 workflow 系统

## Current Implementation Snapshot

- 已新增 `src/orchestration/` 最小骨架：
  - contracts
  - run manager
  - planner
  - event sinks
  - static tool / skill registry
  - graph patch gateway
  - report builder
  - orchestrator
- 已补 fixture runtime：
  - fixture data adapter
  - fixture graph context reader
  - 4 个 fixture executors
  - demo runner
- 当前 demo 能跑通：
  - run created
  - planner completed
  - fixed 4 tasks assigned
  - non-Judge findings created
  - `Finding -UPDATES-> stable object` runtime edges 已补上
  - Judge / report 已携带 stable-object lineage metadata
  - runtime scaffold patch accepted
  - Judge decision / report / citation patches accepted
  - final report ready
- 当前仍未开始：
  - 非 fixture agent execution
  - stable `Judgment` 条件化持久化
  - Aura 上的真实 runtime graph demo
- 当前已补最小 frontend-facing runtime API：
  - `POST /runs` 可创建并启动真实 run，返回 `runKey` 与 `events/report` endpoint
  - `GET /runs/:runKey/events` 提供 SSE `RunEvent` 流
  - `GET /runs/:runKey/report` 提供当前 snapshot / final report hydration
  - `GET /runs/:runKey/events` 现在会连接并回放已有 run 的事件，而不是每次都隐式新建 run
  - 默认脚本 `npm run runtime:serve` 明确使用 `NoopGraphWriter`
  - `npm run runtime:serve:openbb` 可切到真实 OpenBB data adapter，但 graph 仍是显式 noop demo mode

## Open Follow-Ups

- thread2 未来可能还需要补更适合 runtime 消费的 graph CLI / SDK / API
- 如果后续考虑接 OpenAI Agents SDK，只应放在 execution / session-continuity 层，不拥有 Delphi 的 run / case / graph / report 语义
