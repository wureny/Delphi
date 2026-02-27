# PRD: Polymarket Ontology（v0.4）

## 0. 产品定义（一句话）
Delphi 是一个基于本体论的 Agentic Fund 系统。

## 1. 背景与问题
Polymarket 原始数据分散在 event、market、token、price、liquidity、order book、trade 等不同结构中，底层字段偏向存储与接口返回，不天然适合 Agent 做稳定的语义理解，导致：
1. Agent 容易把底层字段当作平铺属性，难以稳定感知“什么东西存在、它和什么有关、当前处于什么状态”。
2. 难以跨市场做统一分析与复用，尤其难以形成可追溯的决策路径。
3. 如果只看页面显示概率或单个价格点，Agent 可能把浅流动性下的短时偏移误认为真实世界概率变化。
4. 若直接围绕原始数据接口设计后续多 Agent 流程，会把底层数据结构的偶然性带入上层推理与执行。

## 2. Why Now
Delphi 的后续多 Agent 协同能力依赖稳定的语义底座。若不先完成 ontology，后续 agent orchestration 会放大歧义与技术债。

## 3. 产品目标
构建可扩展、可验证、可落地的 Polymarket Ontology 层，使 Delphi 能够：
1. 统一表示 Polymarket 核心对象、关系、状态和交易微观结构，而不是直接镜像底层数据库/API 字段。
2. 提供约束规则（合法性、一致性、完整性），保证实体图可被可靠消费。
3. 输出更适合 Agent 消费的标准化语义接口，为后续决策记录、风控闸门和审计链路打基础。
4. 将“市场本身的语义事实”和“订单簿形成的短期价格信号”分层表达，避免 Agent 将两者混为一谈。
5. 支持可视化浏览和结构编辑，便于人机协同迭代 ontology。

## 4. 设计原则
### P1 Ontology 不是底层表结构镜像
1. 原始 Polymarket 数据仍然是 source of truth。
2. Ontology 是位于数据层之上的语义层，目标不是“字段搬运”，而是明确实体、关系、状态与证据归属。
3. 允许为了 Agent 推理显式增加关系型字段或归一化字段，例如：`market_ids`、`outcome_ids`、`binary_side`、`complement_outcome_id`、`display_price_source`。

### P2 优先服务 Agent 的存在感知与关系理解
1. Agent 读 ontology 时，应该更容易回答：
   - 这是一个什么对象？
   - 它从属于谁？
   - 它和哪些对象有直接关系？
   - 当前是否可交易、是否已结算、证据来自哪里？
2. 因此 ontology 设计要优先表达对象之间的显式连接，而非仅表达原始字段值。

### P3 贴近 Polymarket 官方概念模型
基于 Polymarket 官方文档 `Markets and Events`、`Market Channel`、`API Introduction`，当前采用以下事实前提：
1. `Event` 是上层语义容器，一个 event 可以包含一个或多个 market。
2. `Market` 是可交易的基础命题单元，当前重点按 binary yes/no market 建模。
3. `enableOrderBook=true` 才表示该 market 可以通过 CLOB 进行订单簿交易。
4. `book`、`price_change`、`last_trade_price`、`best_bid_ask` 等流是理解盘口与价格形成过程的重要输入。
5. 结算结果应归属于 `Market`，而非笼统归属于 `Event`。

### P4 当前阶段只覆盖有限类别
v0.4 当前只聚焦：
1. `crypto`
2. `finance`

其他类别先不纳入 schema scope，以降低早期复杂度并提高验证质量。

### P5 语义层、微观结构层、派生分析层分离
1. 语义层回答“市场在讨论什么现实世界命题”。
2. 微观结构层回答“当前订单簿和成交是如何形成这个价格的”。
3. 派生分析层回答“这个价格/概率当前值是否可靠，是否可能受浅盘口或操纵性行为影响”。
4. 下游 Agent 不能只消费单一 price，而应联合消费 `Market`、`OrderBookSnapshot`、`TradePrint`、`MarketMicrostructureState` 与外部证据。

## 5. 非目标（v0.4 Out of Scope）
1. 不做多 Agent 协同执行框架选型。
2. 不做自动交易执行与资金管理。
3. 不覆盖所有预测市场平台，仅限 Polymarket。
4. 不在当前阶段覆盖 Politics、Sports、Pop Culture 等全部市场类别。
5. 不追求 1:1 复刻所有底层 API 字段。
6. 不声称通过单一启发式就能“证明操纵”，当前只输出风险评估与稳健信号。

## 6. 用户与使用场景
用户角色：
1. Research Agent：做事件语义归因和信息抽取。
2. Strategy Agent：做市场比较、信号聚合、决策草案生成。
3. Risk/Audit Agent：追踪证据、结算、状态变更、订单簿脆弱性与审批链路。
4. 项目 owner（你）：做迭代管理、质量验收、方向决策。

核心场景：
1. 给定某 market，能解析为统一 ontology 实体图，并明确它属于哪个 event、有哪些 outcome、是否仍可交易。
2. 能追溯 market 与 outcome、price point、order book、trade、liquidity、news signal、resolution state 的关系。
3. 能区分“显示概率”和“稳健概率”，避免 Agent 因浅盘口短时扭曲而误判真实世界状态。
4. 能将研究结论挂接到稳定的实体 ID 上，为后续 `DecisionRecord -> Order -> Execution` 链路打基础。
5. 能校验数据完整性并输出错误报告。
6. 能以图视图查看实体关系并进行受控编辑（增删字段、关系、约束）。

## 7. 功能需求
### FR1 实体建模
定义最小实体集（基于 Agentic Fund 最小可执行信息）：
- Event
- Market
- Outcome
- PricePoint
- OrderBookSnapshot
- TradePrint
- LiquiditySnapshot
- Source
- NewsSignal
- ResolutionState
- MarketMicrostructureState

其中：
1. `Event` 是主题容器，不直接等同于可交易对象。
2. `Market` 是可交易命题单元，当前限定为 binary market。
3. `OrderBookSnapshot` 表示某一 outcome token 在某时刻的盘口聚合状态。
4. `TradePrint` 表示实际成交，而不是挂单意图。
5. `MarketMicrostructureState` 是派生分析实体，用于表达盘口可靠性、稳健概率与操纵风险启发式结果。
6. `ResolutionState` 归属于 `Market`，用于表示单个 market 的结算状态与证据。

### FR2 关系建模
定义关键关系：
- Event hasMany Market
- Market hasExactlyTwo Outcome
- Outcome hasMany PricePoint
- Outcome hasMany OrderBookSnapshot
- Outcome hasMany TradePrint
- Outcome hasMany MarketMicrostructureState
- Market hasMany LiquiditySnapshot
- Market hasOne ResolutionState
- Event hasMany NewsSignal
- AnyEntity hasOne Source

### FR3 约束与校验
1. 每个 `Event` 必须至少包含一个 `Market`。
2. 每个 `Market` 必须归属一个且仅一个 `Event`。
3. 每个 `Market` 在当前 scope 下必须包含两个 `Outcome`（Yes / No）。
4. 每个 `Outcome` 必须归属一个且仅一个 `Market`。
5. `ResolutionState` 必须指向 `Market`，不能只挂在 `Event` 上。
6. `OrderBookSnapshot` 和 `TradePrint` 必须指向一个 `Outcome`，并可追溯到其父 `Market`。
7. 时间字段统一为 UTC ISO8601。
8. `Event.category` 当前仅允许 `crypto` 或 `finance`。
9. `robust_probability`、`displayed_probability`、`current_probability` 等概率字段必须位于 `[0,1]`。
10. 关键字段缺失时必须产生结构化错误。

### FR4 映射与输出
1. 支持从原始 Polymarket 数据映射到 ontology schema。
2. 映射输入必须至少覆盖两类源：
   - Gamma API：event / market 元数据
   - CLOB / WebSocket：order book、best bid/ask、trade、tick size 等微观结构数据
3. 主输出为 JSON（作为 Agent 消费与版本管理格式）。
4. JSON 输出允许在不违背语义一致性的前提下，显式冗余部分关系字段，以提升 Agent 可读性。
5. 支持输出派生分析结果，例如稳健概率与盘口可靠性评分。
6. 同步输出图结构表示（目标载体：Neo4j），用于可视化与关系查询。

### FR5 流式数据演进
1. v0.4 先使用样本数据完成建模与验证。
2. 预留流式接入层（ingestion adapter），后续支持持续数据输入。
3. 流式输入不改变上层 ontology contract，只扩展 source adapter 和 mapper。
4. 微观结构层允许更高采样频率，但对下游 Agent 默认暴露聚合快照与派生状态，而不是无节制原始流。

### FR6 派生分析能力（新增核心）
1. 基于 order book 与 trade 数据输出 `MarketMicrostructureState`。
2. 明确区分：
   - `displayed_probability`：贴近平台展示/盘口瞬时状态
   - `robust_probability`：对浅盘口和异常成交更稳健的概率估计
3. 输出至少以下分析量：
   - `spread`
   - `depth`
   - `depth_imbalance`
   - `quote_trade_divergence`
   - `book_reliability_score`
   - `manipulation_risk_score`
4. 这些分析量是风险启发式，不直接断言市场被操纵。

### FR7 评估能力（核心）
1. 建立对照实验：Raw Dataset Agent vs Ontology Agent。
2. 输出统一评估报告，回答“ontology 是否让 Agent 更懂市场发生了什么，以及为什么发生”。
3. 支持按任务维度评估：信息检索、事件理解、关系追踪、结算理解、结论一致性。
4. 增加“决策路径可追溯性”评估，验证 ontology 是否更有利于生成可审计的 reasoning chain。
5. 增加“薄盘口鲁棒性”评估，验证 Agent 是否更不容易被浅流动性导致的短时价格扭曲误导。

## 8. 成功指标（v0.4）
1. 样本 market 映射成功率 >= 95%。
2. 核心字段校验通过率 >= 98%（对完整样本集）。
3. 新增一个 crypto 或 finance 市场类型时，schema 改动成本可控（<= 1 天）。
4. 在同一评测集上，Ontology Agent 相比 Raw Dataset Agent：
5. 关键事实检索正确率提升 >= 15%。
6. 事件/市场状态理解一致性提升 >= 20%。
7. 关系追踪任务成功率提升 >= 20%。
8. 决策路径可追溯性得分提升 >= 20%。
9. 在薄盘口测试集上，错误跟随异常价格跳动的比例下降 >= 30%。

## 9. 风险与依赖
1. Polymarket 源 schema 或字段含义发生变化。
2. 历史数据不完整导致校验误报。
3. 过度拷贝底层字段，导致 ontology 退化为“换皮数据库”。
4. 过度抽象脱离官方概念模型，导致与真实市场结构不一致。
5. 派生分析过强依赖单一启发式，导致误报“操纵风险”。
6. 图结构与 JSON 双写带来一致性维护成本。

## 10. 里程碑建议
1. M1：Ontology Draft + 官方概念对齐 + 示例数据（1 周）
2. M2：Mapper + Validator + 基础图导出（1-2 周）
3. M3：微观结构派生分析原型（稳健概率、薄盘口风险）+ 可视化原型（1-2 周）
4. M4：评估框架（Raw vs Ontology，含薄盘口鲁棒性评测）（1-2 周）

## 11. 验收标准
1. 至少 20 个真实/样本 crypto、finance 市场可完成端到端映射。
2. 所有错误可被分类（schema、数据缺失、格式错误、关系错误）。
3. 文档与 issue 状态一致，可追踪到每个需求实现。
4. 完成一次 Raw vs Ontology 的同题对照评测并形成结论文档。
5. 至少验证一次“1 个 event -> 多个 market”的真实结构。
6. 至少验证一次“market 独立结算而非 event 统一结算”的建模正确性。
7. 至少验证一次“显示概率偏移但稳健概率保持稳定”的薄盘口案例。

## 12. Phase 2 扩展（交易执行）
1. 在市场 ontology 之上新增交易域 ontology（Portfolio/Order/Execution/RiskPolicy）。
2. 先完成 paper trading，再逐步推进小额实盘。
3. 实盘默认带人工审批与风控闸门。
4. 交易执行层必须能够读取 `MarketMicrostructureState`，避免在脆弱盘口下基于噪声价格执行。
