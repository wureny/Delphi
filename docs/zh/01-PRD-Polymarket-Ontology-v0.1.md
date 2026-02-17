# PRD: Polymarket Ontology（v0.2）

## 0. 产品定义（一句话）
Delphi 是一个基于本体论的 Agentic Fund 系统。

## 1. 背景与问题
Polymarket 数据分散在 market/event/outcome/trade 等不同结构中，语义不统一，导致：
1. 难以支持稳定的 Agent 推理。
2. 难以跨市场做统一分析与复用。
3. 难以做可追溯的决策链路记录。

## 2. Why Now
Delphi 的后续多 Agent 协同能力依赖稳定的语义底座。若不先完成 ontology，后续 agent orchestration 会放大歧义与技术债。

## 3. 产品目标
构建可扩展、可验证、可落地的 Polymarket Ontology 层，使 Delphi 能够：
1. 统一表示 Polymarket 核心对象与关系。
2. 提供约束规则（合法性、一致性、完整性）。
3. 输出可供下游 Agent 消费的标准化接口/文件。
4. 支持可视化浏览和结构编辑，便于人机协同迭代 ontology。

## 4. 非目标（v0.1 Out of Scope）
1. 不做多 Agent 协同执行框架选型。
2. 不做自动交易执行与资金管理。
3. 不覆盖所有预测市场平台，仅限 Polymarket。

## 5. 用户与使用场景
用户角色：
1. 研究型 Agent：做事件语义归因和信息抽取。
2. 策略型 Agent：做市场比较、信号聚合。
3. 项目 owner（你）：做迭代管理、质量验收、方向决策。

核心场景：
1. 给定某 market，能解析为统一 ontology 实体图。
2. 能追溯 market 与 event、outcome、赔率、时间窗口的关系。
3. 能校验数据完整性并输出错误报告。
4. 能以图视图查看实体关系并进行受控编辑（增删字段、关系、约束）。

## 6. 功能需求
### FR1 实体建模
定义最小实体集（基于 Agentic Fund 最小可执行信息）：
- Event
- Market
- Outcome
- PricePoint
- LiquiditySnapshot
- Source
- Timestamp
- NewsSignal
- ResolutionState

### FR2 关系建模
定义关键关系：
- Event hasMany Market
- Market hasMany Outcome
- Outcome hasMany PricePoint
- Market hasMany LiquiditySnapshot
- AnyEntity hasOne Source

### FR3 约束与校验
1. 每个 Market 必须归属一个 Event。
2. 每个 Outcome 必须归属一个 Market。
3. 时间字段统一为 UTC ISO8601。
4. 关键字段缺失时必须产生结构化错误。

### FR4 映射与输出
1. 支持从原始 Polymarket 数据映射到 ontology schema。
2. 主输出为 JSON（作为 Agent 消费与版本管理格式）。
3. 同步输出图结构表示（目标载体：Neo4j），用于可视化与关系查询。

### FR5 流式数据演进
1. v0.2 先使用样本数据完成建模与验证。
2. 预留流式接入层（ingestion adapter），后续支持持续数据输入。
3. 流式输入不改变上层 ontology contract（只扩展 source adapter）。

### FR6 评估能力（核心）
1. 建立对照实验：Raw Dataset Agent vs Ontology Agent。
2. 输出统一评估报告，回答“ontology 是否让 Agent 更懂市场发生了什么”。
3. 支持按任务维度评估：信息检索、事件理解、关系追踪、结论一致性。

## 7. 成功指标（v0.2）
1. 样本 market 映射成功率 >= 95%。
2. 核心字段校验通过率 >= 98%（对完整样本集）。
3. 新增一个 market 类型时，schema 改动成本可控（<= 1 天）。
4. 在同一评测集上，Ontology Agent 相比 Raw Dataset Agent：
5. 关键事实检索正确率提升 >= 15%。
6. 事件状态理解一致性提升 >= 20%。
7. 关系追踪任务成功率提升 >= 20%。

## 8. 风险与依赖
1. Polymarket 数据结构变化。
2. 历史数据不完整导致校验误报。
3. 早期 schema 设计过度复杂，影响交付速度。
4. 图结构与 JSON 双写带来一致性维护成本。

## 9. 里程碑建议
1. M1：Ontology Draft + 示例数据（1 周）
2. M2：映射器 + 校验器 + 基础图导出（1-2 周）
3. M3：评估框架（基线对照）+ 可视化原型（1-2 周）

## 10. 验收标准
1. 至少 20 个真实/样本市场可完成端到端映射。
2. 所有错误可被分类（schema、数据缺失、格式错误）。
3. 文档与 issue 状态一致，可追踪到每个需求实现。
4. 完成一次 Raw vs Ontology 的同题对照评测并形成结论文档。

## 11. Phase 2 扩展（交易执行）
1. 在市场 ontology 之上新增交易域 ontology（Portfolio/Order/Execution/RiskPolicy）。
2. 先完成 paper trading，再逐步推进小额实盘。
3. 实盘默认带人工审批与风控闸门。
