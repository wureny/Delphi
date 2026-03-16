# Thread 02 Handoff

## What Changed

- 把 ontology contract 从原则级补齐到了可实现级，补了 object registry、relationship registry、runtime meta graph、scope、growth control 和 data mapping discipline。
- 把 `GraphPatch` 从操作名列表补齐到 typed interface，明确了 metadata、operation shape 和 scope 规则。
- 修正了 `architecture.md` 中错误的 companion spec 路径。
- 新建 `src/research-graph/` 代码骨架，集中放 ontology registry、runtime meta graph、GraphPatch types 和 validator。
- 新增 `graph-writer.ts`，定义 writer interface、receipt 和 `submitGraphPatch()` 提交流程。
- 新增 `merge-policy.ts`，锁定 stable object 的 identity keys、conflict strategy 和 immutable field 规则。

## Decisions Made

- v0 采用 case-centered ontology，`InvestmentCase` 为聚合中心。
- runtime graph 与稳定层逻辑强隔离，runtime 只通过 `UPDATES` / `CITES` 触达稳定对象。
- 外部 provider 原始 payload 不进入图层，图层只吃 normalization 后对象。
- Judge 只能基于 findings 和合法 patch 形成 judgment / report，不能绕过 trace。
- runtime 和 graph writer 的第一层边界收敛为：`patch -> validate -> write -> patch_accepted / patch_rejected`
- stable object 的 upsert 语义必须复用 merge policy，不能在 Neo4j writer 里另起一套规则。

## Risks / Open Questions

- `Judgment -SUPPORTED_BY-> Evidence` 足够支撑 v0，但后续若要做更细的 reasoning lineage，可能还需要独立 lineage object。
- v0 先不做跨 run memory compression，后续如果需要复用 pattern，需另开 ADR。
- `Finding -UPDATES-> stable object` 的细化 merge 策略还需要 runtime 实现时进一步落地。

## Next Recommended Consumer

- thread-03-data-layer-normalization
- thread-04-runtime-orchestration
