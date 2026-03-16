# Thread 02 Brief

## Name

- Ontology + Context Graph Contract

## Mission

- 锁定 v0 ontology objects、runtime meta graph、GraphPatch schema、validator 规则与 run / case scope。

## Primary Source Docs

- [technical-notes.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/technical-notes.md)
- [architecture.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/architecture.md)
- [2026-03-ontology-context-graph-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-ontology-context-graph-contract.md)
- [2026-03-core-interface-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-core-interface-contract.md)

## Scope

- 明确做什么:
- 锁定 v0 的 case-centered ontology object model
- 锁定稳定层 relationship registry 与 runtime meta graph registry
- 锁定 `GraphPatch` 的结构化 schema、scope 规则与 validator 规则
- 明确 OpenBB 等外部数据如何先走 snapshot / normalization，再映射进图层
- 明确不做什么:
- 不做完整金融世界本体
- 不做跨 run memory compression / graph learning
- 不做任意 schema 自扩展
- 不负责外部 provider 的 raw schema 设计与抓取实现

## Stop Condition

- 其他线程可以不猜图结构，直接按合同接入。
- thread3 知道哪些数据先入 snapshot、哪些对象能入图。
- thread4 知道 agent 能写什么 patch、哪些 patch 必须被拒绝。
