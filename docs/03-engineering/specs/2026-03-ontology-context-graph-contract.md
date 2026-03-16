# Ontology And Context Graph Contract

这份合同定义 Delphi v0 图层的最小稳定结构。目标不是“图谱做大”，而是让 ontology、runtime、UI 和数据接入在同一套边界内工作。

## 1. Design Goal

v0 图层必须同时满足 4 个目标：

- 能围绕单一股票问题维护一个 `InvestmentCase`
- 能让 4 个固定 agent 写出可追踪的 runtime trace
- 能让 OpenBB 等数据源通过 normalization 后稳定映射进来
- 能让 UI 展示的 trace 回到真实图对象，而不是前端假状态

## 2. Layer Separation

必须严格区分 3 层：

1. `Ontology`
   - 定义对象类型、最小字段和合法关系
2. `Knowledge Graph`
   - 存具体实例与稳定事实连接
3. `Runtime Context Graph`
   - 存一次 run 的任务、finding、decision path

实现原则：

- ontology 是 grammar
- knowledge graph 是 case-centered facts
- runtime graph 是 sentence
- runtime 可以引用稳定层，但不能改动 schema
- 稳定层不反向依赖 runtime 节点

## 3. Case-Centered Modeling Rule

v0 的图不是“整个金融世界的本体”，而是围绕一个 `InvestmentCase` 组织研究对象。

默认建模原则：

- `Asset` 是锚点，不是中心
- `InvestmentCase` 是大多数对象的聚合中心
- `Thesis`、`Risk`、`Judgment` 默认都属于某个 case
- 外部数据源原始 payload 不直接进入图层，只进入 normalization / snapshot 层

## 4. v0 Ontology Object Registry

v0 只允许以下核心对象：

### `Asset`

- 作用：
  - 表示单一研究标的
- 最小字段：
  - `asset_id`
  - `ticker`
  - `name`
  - `asset_type`
  - `primary_exchange`

### `InvestmentCase`

- 作用：
  - 表示一次围绕某资产和时间范围形成的结构化研究对象
- 最小字段：
  - `case_id`
  - `ticker`
  - `time_horizon`
  - `case_type`
  - `status`
  - `created_at`

### `Thesis`

- 作用：
  - 表示支持或反对当前 case 的核心判断
- 最小字段：
  - `thesis_id`
  - `stance`
  - `summary`
  - `timeframe`
  - `status`

### `Evidence`

- 作用：
  - 表示可被追踪的数据、文本、事件或信号摘要
- 最小字段：
  - `evidence_id`
  - `source_type`
  - `source_ref`
  - `summary`
  - `observed_at`
  - `provider`

### `Risk`

- 作用：
  - 表示会削弱或推翻 case 的关键风险
- 最小字段：
  - `risk_id`
  - `risk_type`
  - `statement`
  - `severity`
  - `timeframe`

### `LiquidityFactor`

- 作用：
  - 表示影响估值或风险偏好的流动性驱动因素
- 最小字段：
  - `factor_id`
  - `factor_type`
  - `direction`
  - `summary`
  - `observed_at`

### `LiquidityRegime`

- 作用：
  - 表示当前流动性环境的阶段性判断
- 最小字段：
  - `regime_id`
  - `label`
  - `timeframe`
  - `confidence`
  - `observed_at`

### `MacroActorAction`

- 作用：
  - 表示宏观主体的行动或政策变化
- 最小字段：
  - `action_id`
  - `actor`
  - `action_type`
  - `summary`
  - `effective_date`

### `MarketSignal`

- 作用：
  - 表示价格、波动、期权或预测市场形成的微观市场信号
- 最小字段：
  - `signal_id`
  - `signal_type`
  - `timeframe`
  - `direction`
  - `observed_at`

### `Judgment`

- 作用：
  - 表示对 case 的综合结论快照
- 最小字段：
  - `judgment_id`
  - `stance`
  - `confidence_band`
  - `summary`
  - `as_of`

规则：

- 每个对象必须能回答“为什么它存在于当前 investment case 中”
- 新对象类型不能在 v0 中临时发明
- 原始长文本不是 ontology object；如需入图，必须先变成 `Evidence.summary`

## 5. Stable Relationship Registry

稳定层只允许以下关系类型：

- `InvestmentCase -FOCUSES_ON-> Asset`
- `InvestmentCase -HAS_THESIS-> Thesis`
- `InvestmentCase -HAS_RISK-> Risk`
- `InvestmentCase -HAS_LIQUIDITY_FACTOR-> LiquidityFactor`
- `InvestmentCase -HAS_LIQUIDITY_REGIME-> LiquidityRegime`
- `InvestmentCase -HAS_SIGNAL-> MarketSignal`
- `InvestmentCase -HAS_JUDGMENT-> Judgment`
- `Thesis -SUPPORTED_BY-> Evidence`
- `Thesis -CHALLENGED_BY-> Evidence`
- `Risk -SUPPORTED_BY-> Evidence`
- `LiquidityFactor -SUPPORTED_BY-> Evidence`
- `LiquidityFactor -DERIVED_FROM-> MacroActorAction`
- `LiquidityRegime -SUPPORTED_BY-> Evidence`
- `MarketSignal -SUPPORTED_BY-> Evidence`
- `MacroActorAction -SUPPORTED_BY-> Evidence`
- `Judgment -SUPPORTED_BY-> Evidence`

规则：

- 稳定层关系以 case 聚合为主，不追求世界知识图的完备表达
- `Judgment` 不直接依赖 runtime 节点；runtime 通过 `Decision` 去更新或引用 `Judgment`

## 6. Stable Object Merge Policy

稳定对象在 v0 中不能“随便 merge”，必须按对象类型走固定策略。

### Identity Rule

- `Asset`
  - global identity key: `ticker`
- `InvestmentCase`
  - case identity key: `case_id`
- `Thesis`
  - case identity key: `case_id + thesis_id`
- `Evidence`
  - case identity key: `case_id + provider + source_type + source_ref + observed_at`
- `Risk`
  - case identity key: `case_id + risk_id`
- `LiquidityFactor`
  - case identity key: `case_id + factor_id`
- `LiquidityRegime`
  - case identity key: `case_id + regime_id`
- `MacroActorAction`
  - case identity key: `case_id + action_id`
- `MarketSignal`
  - case identity key: `case_id + signal_id`
- `Judgment`
  - case identity key: `case_id + judgment_id`

### Conflict Rule

- `Asset`
  - allow replace on descriptive fields
- `InvestmentCase`
  - reject identity rewrite; only `status` may advance
- `Thesis`
  - replace mutable fields in place
- `Evidence`
  - prefer dedupe by source identity; only allow normalized summary refresh
- `Risk`
  - replace mutable fields in place
- `LiquidityFactor`
  - replace only if newer `observed_at`
- `LiquidityRegime`
  - replace only if newer `observed_at`
- `MacroActorAction`
  - reject after creation
- `MarketSignal`
  - replace only if newer `observed_at`
- `Judgment`
  - replace only if newer `as_of`

### Validator Implication

- `merge_node` 必须包含该对象类型的 identity keys
- 对 stable object 的 `update_property` 不允许修改 immutable fields
- Neo4j writer 后续必须复用同一套 merge policy，而不是自行发明 upsert 规则

## 7. Runtime Meta Graph Registry

v0 runtime graph 允许的节点类型：

### `Query`

- 最小字段：
  - `query_id`
  - `run_id`
  - `ticker`
  - `time_horizon`
  - `case_type`

### `Task`

- 最小字段：
  - `task_id`
  - `run_id`
  - `agent_type`
  - `goal`
  - `status`

### `Agent`

- 最小字段：
  - `agent_id`
  - `run_id`
  - `agent_type`

### `Skill`

- 最小字段：
  - `skill_id`
  - `run_id`
  - `capability_name`

### `ToolCall`

- 最小字段：
  - `tool_call_id`
  - `run_id`
  - `tool_name`
  - `status`
  - `started_at`

### `ContextItem`

- 最小字段：
  - `context_item_id`
  - `run_id`
  - `ref_type`
  - `ref_id`
  - `source_layer`

### `Finding`

- 最小字段：
  - `finding_id`
  - `run_id`
  - `agent_type`
  - `claim`
  - `confidence`
  - `impact`

### `Decision`

- 最小字段：
  - `decision_id`
  - `run_id`
  - `decision_type`
  - `summary`
  - `confidence_band`

### `ReportSection`

- 最小字段：
  - `section_id`
  - `run_id`
  - `section_key`
  - `title`

v0 runtime graph 允许的边类型：

- `DECOMPOSES_TO`
- `ASSIGNED_TO`
- `USES_SKILL`
- `RETRIEVES`
- `SUPPORTS`
- `CONTRADICTS`
- `UPDATES`
- `CONTRIBUTES_TO`
- `REVISES`
- `CITES`

推荐的合法边组合：

- `Query -DECOMPOSES_TO-> Task`
- `Task -ASSIGNED_TO-> Agent`
- `Task -USES_SKILL-> Skill`
- `Task -RETRIEVES-> ContextItem`
- `Skill -RETRIEVES-> ContextItem`
- `Finding -SUPPORTS-> Decision`
- `Finding -CONTRADICTS-> Finding`
- `Decision -UPDATES-> Judgment`
- `Finding -UPDATES-> Thesis`
- `Finding -UPDATES-> Risk`
- `Finding -UPDATES-> LiquidityFactor`
- `Finding -UPDATES-> LiquidityRegime`
- `Finding -UPDATES-> MarketSignal`
- `ReportSection -CITES-> Finding`
- `ReportSection -CITES-> Evidence`
- `Decision -CONTRIBUTES_TO-> ReportSection`

规则：

- runtime 只允许通过 `UPDATES` 或 `CITES` 触达稳定层对象
- 不允许稳定层对象主动连回 runtime 节点
- `Reflection`、`MemoryPattern` 等更高阶节点不在 v0 范围内

## 8. GraphPatch Write Policy

agent 不允许直接写图数据库。

唯一合法路径：

1. agent 产出 `GraphPatch`
2. graph validator 校验 patch
3. graph writer 负责实际写入

`GraphPatch` 只允许 2 类 target scope：

- `runtime`
- `case`

规则：

- 一个 patch 只处理一个 scope
- `runtime` patch 只能创建或更新当前 run 的 runtime 节点
- `case` patch 只能触达当前 `InvestmentCase` 及其锚定的稳定对象
- 不允许 patch 修改 ontology schema、本体注册表或全局关系集

## 9. Validator Rules

validator 至少校验以下项目：

- 节点类型是否属于注册集合
- 边类型是否属于注册集合
- patch 的 `run_id` 是否匹配当前 run
- `target_scope` 是否与操作目标一致
- `case` scope 是否锚定到当前 `InvestmentCase`
- 当前对象是否应该 `merge` 而不是 `create`
- 是否会造成明显图膨胀
- `Finding`、`Decision`、`Judgment` 是否缺关键引用
- `Evidence` 是否缺 `source_type`、`source_ref` 或 `observed_at`
- `merge_node` 是否缺 identity keys
- stable object 的更新是否触碰 immutable fields

建议的拒绝条件：

- 试图创建未注册 node label / edge type
- 试图跨 case 改写稳定对象
- 试图让 Judge 在缺少 findings 的情况下直接写强结论
- 试图把原始 provider payload 整块塞入图层

## 10. Scope And Growth Control

v0 的 bounded runtime 是硬约束，不是抽象原则：

- 每个 run 必须有独立 `Query` 根节点
- 当前 run 的 runtime 节点默认不跨 run 复用
- 4 个固定 agent 默认各承担 1 个主任务
- Judge 只允许轻量补任务
- 每个非 Judge agent 默认产出不超过 3 条一阶 finding
- 单次 run 的 `Decision` 节点应控制在 1 到 3 个
- `ReportSection` 固定映射到 `FinalReport` 的 6 个 section

如果某次 run 需要大量额外节点才能表达结论，优先怀疑任务拆分过度或 schema 设计失真，而不是继续扩图。

## 11. Evidence And Data Mapping Discipline

重要判断必须能回到可追踪 evidence，但 graph 中只存 normalization 后的摘要对象，不存原始 provider payload。

OpenBB 等数据源接入建议：

- company info / financials / news / filings / transcript
  - 先落 snapshot
  - 再映射成 `Evidence`
  - 如形成研究观点，再挂到 `Thesis` 或 `Risk`
- macro / rates / Fed / liquidity indicators
  - 先落 snapshot
  - 再映射成 `Evidence`
  - 由 `MacroActorAction`、`LiquidityFactor`、`LiquidityRegime` 消费
- quote / historical price / options / prediction signals
  - 先落 snapshot
  - 再映射成 `Evidence`
  - 必要时提炼成 `MarketSignal`

纪律要求：

- runtime 里的说明性文本不等于 evidence
- `Judgment` 必须能通过 `Decision -> Finding -> Evidence` 或 `ReportSection -> Finding -> Evidence` 路径回溯
- 若 `Finding.evidence_refs` 为空，必须在 runtime 和报告中显式降低置信度

## 12. What v0 Explicitly Does Not Do

- 不做完整金融世界本体
- 不做任意 graph learning
- 不做跨 run 的 graph compression memory
- 不允许 agent 自主扩展 schema
- 不把全部原始文本或 provider 原始 JSON 塞进 Neo4j
- 不做多资产、多组合级图建模

## 13. Acceptance Criteria

- 一个 run 可以在图中被完整回放为：
  `Query -> Task -> Skill / ToolCall -> Finding -> Decision -> ReportSection`
- 一个 `InvestmentCase` 能稳定聚合 thesis、risk、liquidity、signal、judgment 对象
- OpenBB 等外部数据能先进入 snapshot，再映射为 `Evidence` 和相关对象
- 非法 patch 会被拒绝
- UI 展示的主要 trace 能从图层找到真实对应对象
