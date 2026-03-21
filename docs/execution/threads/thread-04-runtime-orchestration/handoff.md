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
  - `GET /runs/:runKey/terminals`
  - `GET /runs/:runKey/terminal-stream`
- 已新增受控 terminal stream：
  - backend 会把真实 `RunEvent` 转成 per-agent terminal line
  - 可同时提供 terminal snapshot 和 terminal SSE replay
  - 明确不暴露 OS shell / PTY 给 agent 或浏览器

## Decisions Made

- v0 runtime 只保留 `run` 作为主执行概念
- Judge 第一阶段默认写 runtime `Decision + ReportSection + FinalReport`
- `ReportSection` 在 graph 中固定为 6 个 runtime 节点
- tool / skill registry 先使用静态 TypeScript 注册表
- graph access 必须通过 thread4 的受控 tool / gateway，不允许 agent 直连 shell / Cypher

## Risks / Open Questions

- fixture runtime 已能证明主链能跑，但还没有接真实 OpenBB adapter
- 当前 runtime script 已能通过 `RUNTIME_GRAPH_MODE=neo4j` 切到 thread2 的真实 writer
- runtime / neo4j / openbb 相关 npm script 现在会自动读取仓库根目录 `.env`
- 当前 `.env` 中的 `NEO4J_*` 已完成真实验证：
  - `npm run neo4j:verify` 通过
  - `npm run runtime:demo:neo4j` 通过
  - thread4 已确认能把完整 runtime 主链写到真实 Neo4j path
- 当前 runtime 已新增 execution mode：
  - 默认 `fixture`
  - 可切 `openai`
  - `openai` mode 需要 `OPENAI_API_KEY` + `OPENAI_MODEL`
  - 缺 key / model 时会直接失败，不会静默回退
- `openai` mode 已完成真实验证：
  - `npm run runtime:demo:openai` 通过
  - `npm run runtime:demo:openai:neo4j` 通过
- demo script 现在会为每次运行生成唯一 `queryId`，避免真实 Neo4j 重复验证时撞 `Query._ref` 唯一约束
- 若 runtime scaffold patch 被拒，run 现在会显式进入 degraded，并发出 `degraded_mode_entered`
- `POST /runs` 当前对 `ticker/timeHorizon/caseType` 支持显式传入；若只传 `userQuestion`，runtime 会用轻量启发式推断，v0 可用但不是最终 planner-grade parsing
- terminal stream 当前基于受控 runtime event 映射，而不是 token-level model stream 或真实 shell 字节流；这符合 v0 产品边界
- runtime contract 目前仍未覆盖 session continuity；这是后续阶段问题，不应倒灌回第一阶段
- thread2 未来可能还需要补更适合 runtime 消费的 graph CLI / SDK / API

## Next Recommended Consumer

- thread-05-frontend-shell-canvas（可直接接 runtime SSE / snapshot bridge）
- thread-04-runtime-orchestration（继续推进更真实的 provider/tool usage 与非 fixture data path）
