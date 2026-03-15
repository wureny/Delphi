# Data Layer Contract

这份文档定义 v0 数据层的职责分工、最小表、数据刷新策略和 normalization 边界。

## 1. Data Philosophy

v0 不追求“所有数据都拉全”，只追求：

- 能支撑单次个股研究闭环
- 数据形态清楚
- 失败时可降级
- 后续 agent 易于消费

## 2. Source Of Truth Split

### Supabase / Postgres

负责：

- 用户与 session
- research runs
- final reports
- raw snapshots
- cache 和中间结构化结果

### Neo4j

负责：

- ontology objects
- knowledge graph facts
- runtime context graph
- report lineage

### External Sources

- `OpenBB` 作为主要市场数据接入层
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

## 4. Minimum Supabase Tables

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

## 5. Refresh Policy

### High-frequency / near-real-time

- quote
- volume
- lightweight signal

策略：

- query 触发刷新
- 短缓存即可

### Mid-frequency

- news
- filings
- event-related signals

策略：

- query 时补拉
- 或较短窗口刷新

### Low-frequency

- macro regime
- liquidity regime
- thesis summaries

策略：

- 日级刷新或按事件刷新

## 6. Normalization Rules

- 只做一层 normalization
- 不在 v0 构建复杂 ETL 管道
- 外部源字段需映射成 agent 更容易消费的内部 shape
- snapshot 要保留抓取时刻，避免覆盖全部历史

## 7. Data Consumption Rules

- agent 不应直接理解外部 provider 的杂乱原始结构
- tool 层或 adapter 层负责把外部数据转换成内部对象
- Judge 默认只消费 findings，不直接读原始 provider payload

## 8. Failure Policy

- 外部数据缺失时，允许局部分析降级
- 某个数据源失败不应阻止整次 run 完成
- 所有降级都应通过 `RunEvent` 和报告提示出来

## 9. What v0 Explicitly Avoids

- 重型数据仓库
- 高复杂度 CDC / streaming pipeline
- 过早引入 embedding-first retrieval
- 为了“看起来全”而增加不稳定数据源

## 10. Acceptance Criteria

- runtime agent 明确知道去哪拉数据
- graph writer 明确知道哪些对象写 Neo4j、哪些写 Postgres
- 外部 provider 变动不会直接污染 agent 合同层
