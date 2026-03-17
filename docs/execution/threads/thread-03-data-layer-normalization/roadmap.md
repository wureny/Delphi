# Thread 03 Roadmap

## Goal

把 Delphi v0 的数据层从“合同存在”推进到“thread4 可直接消费、thread2 可稳定映射”的最小真实数据接缝：

- 保持 thread4 现有 orchestration / executors / event stream 不重写
- 交付一个真实 `RuntimeDataAdapter`
- 明确 provider payload -> raw snapshot -> normalized snapshot -> evidence-ready shape 的映射链
- 明确哪些 normalized outputs 最终支持哪些 ontology objects
- 让 demo 能从 fixture path 切到真实数据 path
- 在字段缺失和 provider 波动下仍返回可消费 snapshot

第一阶段目标不是做大而全数据平台，而是先让这条主链成立：

`provider payload -> raw snapshot -> normalized snapshot -> evidence-ready shape -> thread4 executor / thread2 graph patch`

## Scope

- thread3 负责：
  - 外部 provider 接入
  - v0 一层 normalization
  - `RuntimeDataAdapter` contract 对齐
  - snapshot 级原始数据保留策略
  - evidence-ready shape 定义
  - normalized output 到 ontology object 的支持边界
  - 最小刷新策略与缓存分层
  - 失败、部分返回、degraded 语义
  - 对 thread4 暴露稳定内部 shape
- thread3 不负责：
  - 改 thread4 的 run / task / event / report 语义
  - 直接写 Neo4j ontology objects
  - 让 runtime 直接消费 provider 原始 payload
  - 提前接 LLM
  - 建复杂 ETL / streaming / data warehouse
  - 做成大而全 provider platform

## Product Understanding

- Delphi v0 的产品目标不是单纯展示行情，而是把“某只股票值不值得买”组织成结构化 investment case。
- 用户真正消费的是多 agent research 结果与可观察过程，不是 OpenBB 原始字段。
- 因此数据层在 v0 的价值不是“数据越多越好”，而是给 runtime 提供稳定、可解释、可降级的数据输入。

## Technical Understanding

- 系统默认分层已经明确：
  - `Supabase/Postgres` 负责 run、report、snapshot、raw/cache
  - `Neo4j` 负责 ontology、knowledge graph、runtime context graph
- `OpenBB` 是 v0 的主要市场数据接入层
- thread4 已经实现最小 runtime 骨架，当前 demo 跑在 fixture adapter 上。
- thread4 不是等待新 contract，而是在等一个真实但最小的 adapter 实现。
- thread2 已明确要求外部数据必须先进入 snapshot / normalization，再映射成 `Evidence`、`MarketSignal`、`LiquidityFactor` 等对象。
- 当前锁定的 adapter contract 在 [agent-runtime.ts](/Users/wurenyu/workspace/Delphi/src/orchestration/agent-runtime.ts)：
  - `getCompanySnapshot(ticker, runId)`
  - `getNewsSnapshot(ticker, runId)`
  - `getMarketSnapshot(ticker, runId)`
  - `getMacroLiquiditySnapshot(runId)`
- demo 切换点已经明确，在 [run-runtime-demo.ts](/Users/wurenyu/workspace/Delphi/scripts/run-runtime-demo.ts) 中只需替换 `FixtureRuntimeDataAdapter`。

## Current Status

### Done

- 已阅读 thread3/thread4 文档、产品 brief、PR/FAQ、architecture、technical notes、data/runtime contracts
- 已确认 thread3 当前目录缺少 `roadmap.md`
- 已确认 thread4 当前最小真实接缝就是 `RuntimeDataAdapter`
- 已确认 thread3 还必须定义 evidence-ready shape 和 ontology support mapping
- 已确认 fixture path 不能删除，真实 adapter 需要与 fixture adapter 并存

### In Progress

- 把 thread3 第一阶段收敛成可执行 roadmap，并固定与 thread4 的协作边界

### Not Started

- 真实 provider adapter 实现
- provider payload normalization
- evidence-ready shape 与 ontology support mapping
- 刷新 / 缓存 / 降级矩阵
- 数据缺失时的部分返回与 degraded 策略
- thread4 联调切换
- provider / field mapping 文档

## Main Design Judgment

thread3 第一阶段的核心不是“补更多 contract”，而是交付一个真实 `RuntimeDataAdapter`，并把它后面的 normalization 和 evidence-ready 边界定义清楚。

原因：

- thread4 已经通过 adapter 抽象读取数据，orchestrator 没把 fixture 写死
- thread2 需要稳定、可追踪的 `Evidence` 来源，而不是 provider 原始字段
- 如果 thread3 继续停留在文档层，thread4 就无法验证真实数据主链，thread2 也无法稳定定义 evidence mapping
- v0 的最大风险不是抽象不够漂亮，而是 runtime 永远停留在 fixture，graph 永远只能接受人工拼接摘要

因此 thread3 的一句话任务定义应固定为：

`Deliver a minimal real RuntimeDataAdapter plus evidence-ready normalization for thread4 and thread2, not a broad data platform.`

## Locked Constraints

- 先对 thread4 当前 shape 负责，不先发明更理想的新 shape
- 只做一层 normalization，不做重 ETL
- 原始 payload 可以保留在 snapshot/raw 层，但不能直接暴露给 runtime contract
- thread3 不直接写 ontology object；只提供 normalized outputs 和 evidence-ready inputs
- 任一 provider 字段失败时优先返回部分 snapshot，而不是整个方法直接报错
- fixture path 保留，真实 path 与 fixture path 可切换

## Data Mapping Chain

thread3 需要固定的最小映射链如下：

1. `provider payload`
2. `raw snapshot`
3. `normalized snapshot`
4. `evidence-ready candidate`
5. `supported ontology objects`

说明：

- `provider payload`
  - 外部源返回的原始结构，只允许存在于 provider/raw 层
- `raw snapshot`
  - 为一次抓取保留的原始记录，带 `provider`、`runId/query trigger`、`fetchedAt`
- `normalized snapshot`
  - thread4 可直接消费的稳定结构，不暴露 provider 特有字段
- `evidence-ready candidate`
  - thread2 / thread4 可稳定转成 `Evidence` 的最小结构化摘要，不等于真正入图
- `supported ontology objects`
  - 说明这类数据最终支持哪些稳定对象，但真正写图仍走 `thread4 -> thread2 -> GraphPatch`

## Ontology Support Mapping

thread3 必须明确哪些数据最终支持哪些 ontology objects：

- `company info / news / filings`
  - 先进入 `Evidence`
  - 最终支持：
    - `Thesis`
    - `Risk`
- `macro / rates / liquidity`
  - 先进入 `Evidence`
  - 最终支持：
    - `MacroActorAction`
    - `LiquidityFactor`
    - `LiquidityRegime`
- `quote / historical / signals`
  - 先进入 `Evidence`
  - 最终支持：
    - `MarketSignal`

补充约束：

- thread3 不直接产出图节点，只定义哪些 normalized outputs 可以稳定支持哪些对象
- thread4 负责在 runtime 中消费 snapshot 并形成 findings / patch proposal
- thread2 负责校验并把 evidence/object patch 落到图里

## Evidence-Ready Shape

thread3 需要给出一个最小 evidence-ready shape，作为 snapshot 到图层之间的受控中间层。

最少应包含：

- `provider`
- `sourceType`
- `sourceRef`
- `observedAt`
- `summary`
- `supports`
- `rawSnapshotRef`
- `ticker`
- `runId`

其中：

- `summary`
  - 必须是已经过 normalization 的可消费摘要
- `supports`
  - 仅允许引用 v0 已存在对象类型，例如：
    - `Thesis`
    - `Risk`
    - `MacroActorAction`
    - `LiquidityFactor`
    - `LiquidityRegime`
    - `MarketSignal`
- `rawSnapshotRef`
  - 用于追溯 raw snapshot，但不把 raw payload 直接带进 graph contract

## Phase 1 Deliverable

交付一个最小真实 adapter，实现以下 4 个方法：

### `getCompanySnapshot(ticker, runId)`

最少返回：

- `ticker`
- `observedAt`
- `companyName`
- `businessSummary`
- `keyPoints`

### `getNewsSnapshot(ticker, runId)`

最少返回最近若干条新闻：

- `id`
- `headline`
- `summary`
- `publishedAt`
- `url`

要求：

- `summary` 必须做 normalization
- 不能直接把 provider 原文或原始 JSON 塞给 runtime
- 应能派生出 evidence-ready candidates，支持 `Thesis` / `Risk`

### `getMarketSnapshot(ticker, runId)`

最少返回：

- `ticker`
- `observedAt`
- `latestPrice`
- `priceChangePct`
- `volume`
- `signalSummaries`

要求：

- `signalSummaries` 可以先用轻量规则生成
- 不要求一开始建复杂 market signal model
- 应能派生出 evidence-ready candidates，支持 `MarketSignal`

### `getMacroLiquiditySnapshot(runId)`

最少返回：

- `observedAt`
- `regimeLabel`
- `ratesSummary`
- `liquiditySignals`

要求：

- 先接最小真实宏观源组合
- 不要求第一阶段把流动性框架做满
- 应能派生出 evidence-ready candidates，支持 `MacroActorAction` / `LiquidityFactor` / `LiquidityRegime`

## Minimum Refresh And Cache Policy

thread3 必须给出最小刷新机制，而不是只说明“能取到数据”。

### Query-triggered

- `company info`
- `company news`
- `latest quote`
- `market signals`

规则：

- query 到来时优先拉取或补拉
- 若命中短缓存，可直接返回缓存结果

### Short Cache

- `company info`
  - 可接受短缓存
- `news`
  - 可接受短缓存
- `quote / latest market snapshot`
  - 必须短缓存，不能长期复用

### Daily Refresh

- `macro / rates / liquidity regime`
- `filings-derived summaries`

规则：

- 以日级刷新为主
- query 时如果日级缓存过期，可同步刷新或返回上一版并标记 degraded

### Degraded Allowed

- 新闻不足、字段缺失、单个 quote 指标失败
- 宏观字段部分缺失，但仍可给出低置信度 `regimeLabel` / `ratesSummary`
- filings 暂时拿不到，但 company info/news 仍可支持 thesis/risk 基础分析

### Degraded Not Allowed

- ticker 无法解析且无法拿到任何 company/market 主数据
- 4 个 snapshot 方法持续返回不可消费空结构
- normalization 失败到无法形成任何 summary

## Recommended Build Order

1. 固定 provider 选择和 env 依赖
2. 建一个最小真实 `OpenBBRuntimeDataAdapter`
3. 为 4 个 snapshot 方法做 normalization
4. 定义 evidence-ready shape 和 ontology support mapping
5. 补字段缺失时的部分返回、缓存和 degraded reason
6. 固定 query-triggered / short-cache / daily-refresh 边界
7. 保持 `FixtureRuntimeDataAdapter` 不删除
8. 在 demo runner 提供 fixture/real adapter 切换方式
9. 跑一次 thread4 联调，验证 event -> findings -> final report 主链
10. 补最小文档：provider、字段映射、evidence mapping、刷新策略、已知缺口、失败语义

## Phase Plan

### Phase 0: Contract Lock

- 不扩 `RuntimeDataAdapter` 接口
- 对齐 thread4 当前消费 shape
- 明确四类 snapshot 的最小必填字段和可缺失字段
- 固定 evidence-ready shape 的最小字段
- 固定 normalized output 到 ontology object 的支持边界
- 明确 provider 失败时哪些情况应：
  - 返回部分数据
  - 进入 degraded
  - 直接失败

### Phase 1: Minimal Real Adapter

- 新增真实 adapter 实现，默认以 OpenBB 为主
- 每个方法都输出 runtime 友好的 normalized snapshot
- snapshot 必须带 `observedAt`
- 能拿到部分数据时仍返回部分结果

### Phase 2: Evidence-Ready Normalization

- 为 company/news/filings 输出可转 `Evidence` 的候选结构
- 为 macro/rates/liquidity 输出可转 `Evidence` 的候选结构
- 为 quote/historical/signals 输出可转 `Evidence` 的候选结构
- 明确每类 evidence-ready candidate 支持的 ontology objects

### Phase 3: Refresh, Cache, And Degraded Policy

- 固定 query-triggered 拉取项
- 固定短缓存项
- 固定日级刷新项
- 明确失败时哪些允许 degraded 继续

### Phase 4: Fixture Parity And Switchability

- 保持现有 fixture adapter 继续可用
- 真实 adapter 与 fixture adapter 可以被 demo runner 替换
- 不要求 thread4 修改 executors

### Phase 5: Thread4 Integration

- 在现有 demo 上切换到真实 adapter
- 验证：
  - run 能完成
  - findings 能生成
  - report 能生成
  - 缺失数据时 run 进入 degraded 而不是整体中断
  - thread4 能明确知道怎么消费 normalized snapshot

### Phase 6: Thread2 / Graph Alignment

- 明确 graph 侧如何把 evidence-ready candidate 变成 `Evidence`
- 明确不把 provider 原始结构泄漏进 graph contract
- 保持真正写图仍走 `thread4 -> thread2 -> GraphPatch`

### Phase 7: Documentation Hardening

- 更新或补充：
  - provider 选择
  - env 要求
  - raw snapshot 定义
  - normalized snapshot 定义
  - evidence-ready mapping
  - ontology support mapping
  - 刷新 / 缓存 / 降级规则
  - 已知缺口与失败语义

## Risks And Pitfalls

- 为 provider 完整性改 thread4 contract，直接拖慢联调
- 把原始 provider 字段直接泄漏给 runtime，导致 contract 污染
- 没定义 evidence-ready shape，导致 thread2/graph 无法稳定落 `Evidence`
- 把 normalization 做成重管道，延误第一阶段交付
- summary 留空或原文直抄，导致 runtime/graph 不可消费
- 不定义刷新与缓存边界，导致 provider 命中率和降级语义混乱
- 等所有数据源稳定后才交付，错过真实主链验证窗口

## Acceptance Criteria

- 存在一个真实 `RuntimeDataAdapter` 实现
- 覆盖 thread4 当前 4 个最小 snapshot 方法
- thread4 能在不接 LLM 的前提下切换到真实 adapter 跑 demo
- thread4 明确知道如何消费 normalized snapshot
- thread2/graph 明确知道如何把 evidence-ready candidate 变成 `Evidence`
- 数据缺失时支持部分返回和 degraded
- runtime contract 不暴露 provider 原始 payload
- graph contract 不暴露 provider 原始 payload
- 有最小文档说明 provider、字段映射、evidence mapping、刷新策略、已知缺口和失败语义

## Immediate Next Step

thread3 下一步不再补抽象文档，而是直接开始实现最小真实 adapter，同时把 evidence-ready mapping 和 refresh/degrade policy 一起落地，并以 thread4 demo 联调作为第一验收面。
