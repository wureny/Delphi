# Thread 04 Handoff

## What Changed

- 补齐了 thread4 的 roadmap / notes / deliverables，并把 `run-first`、`fixed six sections`、`runtime-first judgment` 等决策固化到 thread4 工作区。
- 更新了 runtime/core/agent 三份相关合同，使其和 thread4 当前实现一致。
- 新建 `src/orchestration/` 最小 runtime 骨架，包含 run manager、planner、event sink、static registry、graph patch gateway、report builder、orchestrator。
- 新增 fixture data adapter、fixture graph context reader、4 个 fixture executors 和 demo runner。
- 已在 runtime finding patch 中补上 `Finding -UPDATES-> stable object` edges，覆盖 `Thesis`、`Risk`、`LiquidityFactor`、`LiquidityRegime`、`MarketSignal`。
- 现在可以通过 `npm run runtime:demo` 跑通一条不依赖 UI 的最小 orchestration 闭环。
- 已新增最小 runtime HTTP bridge，可通过 `npm run runtime:serve` 暴露：
  - `POST /runs`
  - `GET /runs/:runKey/events`
  - `GET /runs/:runKey/report`

## Decisions Made

- v0 runtime 只保留 `run` 作为主执行概念
- Judge 第一阶段默认写 runtime `Decision + ReportSection + FinalReport`
- `ReportSection` 在 graph 中固定为 6 个 runtime 节点
- tool / skill registry 先使用静态 TypeScript 注册表
- graph access 必须通过 thread4 的受控 tool / gateway，不允许 agent 直连 shell / Cypher

## Risks / Open Questions

- fixture runtime 已能证明主链能跑，但还没有接真实 OpenBB adapter
- 当前 runtime API 仍显式使用 `NoopGraphWriter`；要验证 Aura 上的真实实例图，还需要切到 thread2 的真实 writer
- `POST /runs` 当前对 `ticker/timeHorizon/caseType` 支持显式传入；若只传 `userQuestion`，runtime 会用轻量启发式推断，v0 可用但不是最终 planner-grade parsing
- runtime contract 目前仍未覆盖 session continuity；这是后续阶段问题，不应倒灌回第一阶段
- thread2 未来可能还需要补更适合 runtime 消费的 graph CLI / SDK / API

## Next Recommended Consumer

- thread-05-frontend-shell-canvas（可直接接 runtime SSE / snapshot bridge）
- thread-04-runtime-orchestration（继续实现真实 graph writer / non-fixture executors）
