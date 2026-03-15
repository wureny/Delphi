# Ontology And Context Graph Contract

这份合同定义 Delphi v0 图层的最小稳定结构。目标不是“图谱做大”，而是给运行时一个清晰边界。

## 1. Layer Separation

必须严格区分 3 层：

1. `Ontology`
   - 定义对象类型与合法关系
2. `Knowledge Graph`
   - 存具体实例与事实连接
3. `Runtime Context Graph`
   - 存一次 run 的任务、finding、decision path

实现原则：

- ontology 是 grammar
- runtime graph 是 sentence
- 两者不能混写

## 2. v0 Ontology Objects

v0 只允许以下核心对象：

- `Asset`
- `InvestmentCase`
- `Thesis`
- `Evidence`
- `Risk`
- `LiquidityFactor`
- `LiquidityRegime`
- `MacroActorAction`
- `MarketSignal`
- `Judgment`

每个对象必须能回答“为什么这个对象存在于 investment case 中”，否则不要建。

## 3. Runtime Meta Graph

v0 runtime graph 允许的节点类型：

- `Query`
- `Task`
- `Agent`
- `Skill`
- `ToolCall`
- `ContextItem`
- `Finding`
- `Decision`
- `ReportSection`

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

## 4. Write Policy

agent 不允许直接写图数据库。

唯一合法路径：

1. agent 产出 `GraphPatch`
2. graph validator 校验 patch
3. graph writer 负责实际写入

## 5. Validator Rules

validator 至少校验以下项目：

- label 是否属于注册集合
- edge type 是否属于注册集合
- patch 是否属于当前 run scope
- 是否应该 `merge` 而不是 `create`
- 是否会造成明显图膨胀
- `Finding` 或 `Decision` 是否缺关键引用

## 6. Scope Rules

- 每个 run 必须有独立 `Query` 根节点
- 当前 run 的 runtime 节点默认不跨 run 复用
- ontology / stable KG 节点允许被引用，但不允许被随意改类型
- 历史 run 的压缩复用不在 v0 范围内

## 7. Growth Control

v0 的 bounded runtime 不是抽象原则，而是硬约束：

- 4 个固定 agent
- 每个 agent 默认只承担 1 个主任务
- Judge 只允许轻量补任务
- 一次 run 中 finding 和 decision 节点数量应保持可展示性

如果某次 run 需要大量额外节点才能表达结论，优先怀疑任务拆分过度，而不是继续扩图。

## 8. Evidence Discipline

- 重要 finding 应指向 `Evidence` 或可追踪 signal
- `Judgment` 必须能通过路径回到若干 `Finding`
- runtime 里的说明性文本不等于 evidence

## 9. What v0 Explicitly Does Not Do

- 不做完整金融世界本体
- 不做任意 graph learning
- 不允许 agent 自主扩展 schema
- 不把全部原始文本塞进 Neo4j

## 10. Acceptance Criteria

- 一个 run 可以在图中被完整回放为：
  `Query -> Task -> Tool / Skill -> Finding -> Decision -> ReportSection`
- 非法 patch 会被拒绝
- UI 展示的主要 trace 能从图层找到对应对象，而不是纯前端模拟
