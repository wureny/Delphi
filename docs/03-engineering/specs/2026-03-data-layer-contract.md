# Data Layer Contract

这份文档定义 v0 数据层的职责分工、最小表、数据刷新策略和 normalization 边界。

## 1. Data Philosophy

v0 不追求“所有数据都拉全”，只追求：

- 能支撑单次个股研究闭环
- 数据形态清楚
- 失败时可降级
- 后续 agent 易于消费

thread3 第一阶段不是交付“大数据系统”，而是交付：

- 一个 thread4 可直接消费的最小真实 `RuntimeDataAdapter`
- 一条稳定的 `provider payload -> raw snapshot -> normalized snapshot -> evidence-ready candidate` 映射链
- 一套不把 provider 原始结构泄漏进 runtime / graph contract 的最小纪律

## 2. Source Of Truth Split

### Supabase / Postgres

负责：

- 用户与 session
- research runs
- final reports
- raw snapshots
- cache 和中间结构化结果

当前实现状态：

- v0 当前仓库里已经有真实的 raw snapshot / normalized snapshot / evidence-ready artifacts 持久化能力
- 现阶段先落到本地文件 store，作为 thread3 的最小真实 persistence
- 真正切到 Supabase 仍需要连接信息、表结构和凭证，不在当前仓库内假装已经完成

### Neo4j

负责：

- ontology objects
- knowledge graph facts
- runtime context graph
- report lineage

### External Sources

- `OpenBB` 作为主要市场数据接入层
  - 默认部署形态是外部 API 服务
  - Delphi backend / Railway runtime 通过 HTTP 调用
- `Polymarket` 或其他预测信号源仅作为可选辅助输入

## 3. Minimum External Data Set

OpenBB 最小接入集：

- latest quote
- historical price
- company info
- company news
- filings / earnings-related materials
- basic macro / rates / liquidity indicators

v0 不要求：

- 全量 options analytics
- 高频盘口
- 多源交叉校验全覆盖

## 4. Data Mapping Chain

所有外部数据必须经过这条最小映射链：

1. `provider payload`
2. `raw snapshot`
3. `normalized snapshot`
4. `evidence-ready candidate`
5. `GraphPatch` 中的 `Evidence` / stable object 映射

纪律：

- `provider payload`
  - 只允许存在于 provider/raw 层
- `raw snapshot`
  - 保留抓取时刻、provider、请求参数和原始 payload
- `normalized snapshot`
  - 给 thread4 runtime 直接消费
  - 不暴露 provider 特有字段
- `evidence-ready candidate`
  - 给 thread4 / thread2 稳定转换成 `Evidence`
  - 不等于直接写图
- thread3 不直接写 Neo4j
- 真正写图仍走 `thread4 -> thread2 -> GraphPatch`

## 5. Evidence-Ready Shape

evidence-ready candidate 最少应包含：

- `provider`
- `sourceType`
- `sourceRef`
- `observedAt`
- `summary`
- `supportedObjects`
- `rawSnapshotRef`
- `ticker`
- `runId`

纪律：

- `summary` 必须是 normalization 后的可消费摘要
- 不允许把 provider 原始 JSON 直接塞进 graph contract
- `supportedObjects` 只允许引用 v0 已存在的稳定对象类型

## 6. Ontology Support Mapping

thread3 必须明确哪些数据最终支持哪些 ontology objects：

- `company info / news / filings`
  - 先转 `Evidence`
  - 再支持：
    - `Thesis`
    - `Risk`
- `macro / rates / liquidity`
  - 先转 `Evidence`
  - 再支持：
    - `MacroActorAction`
    - `LiquidityFactor`
    - `LiquidityRegime`
- `quote / historical / signals`
  - 先转 `Evidence`
  - 再支持：
    - `MarketSignal`

## 7. Minimum Supabase Tables

- `assets`
- `investment_cases`
- `reports`
- `agent_runs`
- `raw_market_snapshots`
- `raw_news`
- `run_events`

可以按实现便利补充：

- `raw_macro_snapshots`
- `report_sections`
- `run_failures`

补充说明：

- 当前代码还没有直接写 Supabase
- 在未提供 Supabase 凭证前，thread3 使用本地文件 store 保留：
  - raw snapshots
  - normalized snapshot bundles
  - evidence-ready candidates
- 本地文件 store 只适合本地开发 / staging / demo，不视为正式 production persistence

## 8. Refresh Policy

### Query-triggered + short cache

- company info
- company news
- latest quote
- lightweight market signal

策略：

- query 触发刷新
- 短缓存即可
- fresh 取数失败时可回退到 stale cache，并标记 degraded

### Query-triggered + daily refresh

- filings / earnings-related summaries
- macro / rates / liquidity regime

策略：

- query 时检查缓存
- 日级缓存过期时刷新
- 若刷新失败但存在上一版 snapshot，可降级继续

### Degraded Allowed

- 新闻不足但仍有 company / market 主数据
- 单个 quote 或 macro 字段缺失，但仍能形成部分 snapshot
- filings 暂时拿不到，但 company info / news 仍可支持基础 thesis / risk 分析

### Degraded Not Allowed

- ticker 无法解析且拿不到任何 company / market 主数据
- normalization 失败到无法形成任何可消费 summary
- 4 个 snapshot 方法持续返回不可消费空结构

## 9. Normalization Rules

- 只做一层 normalization
- 不在 v0 构建复杂 ETL 管道
- 外部源字段需映射成 agent 更容易消费的内部 shape
- snapshot 要保留抓取时刻，避免覆盖全部历史
- summary 不能为空或原文直抄 provider payload
- runtime / graph contract 不直接暴露 provider 原始字段

## 10. Data Consumption Rules

- agent 不应直接理解外部 provider 的杂乱原始结构
- tool 层或 adapter 层负责把外部数据转换成内部对象
- Judge 默认只消费 findings，不直接读原始 provider payload
- thread4 消费 normalized snapshot
- thread2 / graph 消费 evidence-ready candidate，再通过 `GraphPatch` 形成 `Evidence`

## 11. Failure Policy

- 外部数据缺失时，允许局部分析降级
- 某个数据源失败不应阻止整次 run 完成
- 所有降级都应通过 `RunEvent` 和报告提示出来
- stale cache fallback 是允许的降级手段，但必须显式记录
- 持久化失败不应污染 runtime contract，但必须作为 thread3 的 store 层错误显式暴露

## 12. What v0 Explicitly Avoids

- 重型数据仓库
- 高复杂度 CDC / streaming pipeline
- 过早引入 embedding-first retrieval
- 为了“看起来全”而增加不稳定数据源
- 让 provider 原始结构直接污染 runtime / graph contract

## 13. Acceptance Criteria

- runtime agent 明确知道去哪拉数据
- Railway backend 明确知道如何通过 HTTP 调用外部 OpenBB 服务
- graph writer 明确知道哪些对象写 Neo4j、哪些写 Postgres
- 外部 provider 变动不会直接污染 agent 合同层
- thread4 明确知道怎么消费 normalized snapshot
- thread2 / graph 明确知道怎么把 evidence-ready candidate 变成 `Evidence`
