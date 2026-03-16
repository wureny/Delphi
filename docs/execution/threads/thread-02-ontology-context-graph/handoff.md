# Thread 02 Handoff

## What Changed

- 把 ontology contract 从原则级补齐到了可实现级，补了 object registry、relationship registry、runtime meta graph、scope、growth control 和 data mapping discipline。
- 把 `GraphPatch` 从操作名列表补齐到 typed interface，明确了 metadata、operation shape 和 scope 规则。
- 修正了 `architecture.md` 中错误的 companion spec 路径。
- 新建 `src/research-graph/` 代码骨架，集中放 ontology registry、runtime meta graph、GraphPatch types 和 validator。
- 新增 `graph-writer.ts`，定义 writer interface、receipt 和 `submitGraphPatch()` 提交流程。
- 新增 `merge-policy.ts`，锁定 stable object 的 identity keys、conflict strategy 和 immutable field 规则。
- 新增 `neo4j-adapter.ts`，把 patch 映射为 Cypher statements，并通过可替换 executor 执行。
- 新增 `neo4j-driver.ts` 和连接检查/真实写入脚本，开始接真实 Aura 而不是本地 mock。
- 新增 bootstrap planner 和脚本，用来把 ontology/runtime registry 与约束真正初始化到 Aura。
- 收紧 validator，补上 `attach_evidence` 的 scope / pair 校验、runtime `runId` 一致性校验，以及 stable object 的 create-vs-merge identity 校验。
- 对齐 runtime graph 类型与 core contract，补齐 `Query.createdAt`、`Task.inputRefs/priority`、`Finding.taskId/evidenceRefs/objectRefs/timestamp`。

## Decisions Made

- v0 采用 case-centered ontology，`InvestmentCase` 为聚合中心。
- runtime graph 与稳定层逻辑强隔离，runtime 只通过 `UPDATES` / `CITES` 触达稳定对象。
- 外部 provider 原始 payload 不进入图层，图层只吃 normalization 后对象。
- Judge 只能基于 findings 和合法 patch 形成 judgment / report，不能绕过 trace。
- runtime 和 graph writer 的第一层边界收敛为：`patch -> validate -> write -> patch_accepted / patch_rejected`
- stable object 的 upsert 语义必须复用 merge policy，不能在 Neo4j writer 里另起一套规则。
- Neo4j 适配层先做 statement planner + executor interface，不急着绑定具体 driver 包。
- 现在已经绑定真实 `neo4j-driver`，真实落库 smoke write 与 Aura bootstrap 已执行通过。
- ontology 和 context graph 现在有了“可持续存在的初始化入口”，不再只是 smoke data。
- 真实 Neo4j writer 在写入前会再次执行 validator，不接受绕过 `submitGraphPatch()` 的非法 patch。

## Risks / Open Questions

- `Judgment -SUPPORTED_BY-> Evidence` 足够支撑 v0，但后续若要做更细的 reasoning lineage，可能还需要独立 lineage object。
- v0 先不做跨 run memory compression，后续如果需要复用 pattern，需另开 ADR。
- `Finding -UPDATES-> stable object` 的细化 merge 策略还需要 runtime 实现时进一步落地。
- validator 目前只能基于当前 patch 和调用方提供的 `existingStableIdentities` 拦截“该 merge 却 create”的情况；等 thread4 接入时需要把这份 context 真正喂进来。
- runtime 现阶段还没有持续产出实例级 context graph；真实运行图还要等 thread4 接入。

## Next Recommended Consumer

- thread-03-data-layer-normalization
- thread-04-runtime-orchestration
