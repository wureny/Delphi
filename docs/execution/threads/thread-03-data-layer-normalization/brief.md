# Thread 03 Brief

## Name

- Data Layer / Normalization Contract

## Mission

- 明确 OpenBB 接入最小集、Supabase 最小表、Neo4j 职责、刷新策略和 normalization 边界。

## Primary Source Docs

- [technical-notes.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/technical-notes.md)
- [architecture.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/architecture.md)
- [2026-03-data-layer-contract.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/specs/2026-03-data-layer-contract.md)

## Scope

- 明确做什么:
- 明确不做什么:

## Stop Condition

- orchestrator 和 graph writer 都知道从哪里取数据、往哪里写快照。
