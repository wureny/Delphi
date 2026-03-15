# Technical Notes

这是一页“先写下来再整理”的技术草稿区。

适合先丢在这里的内容：

- 你想到的系统模块
- 技术栈候选
- 模型 / agent / tool 的设想
- 数据流和接口草图
- 你不确定但觉得重要的实现思路
- 约束、风险、疑问

写法建议：

- 不用追求完整和规范
- 可以先用要点、短句、伪结构
- 一条想法只写一件事
- 如果已经形成稳定方案，再迁移到 `architecture.md`、具体 `spec` 或 `ADR`

# Raw Notes

# part1: 产品本身的技术

关键词：ontology，neo4j，supabase，openbb，polymarket作为market signal来源之一，data synchronization layer 刷新机制，context graph（self-constructing, bounded runtime），cli（agent直接使用cli在画布的终端上去调用数据等行为，相当于连接了agent和ontology和context graph），多agent框架（可能用google的adk框架），skills，system prompt，可能用vercel去托管网站，方便展示

## 1. Overall Framing

这个项目不是一个传统的“股票信息查询网站”，而是一个 ontology-grounded, context-graph-driven, multi-agent investment research system v0。
它的核心目标不是自动交易，而是把“这只股票值不值得买”这种研究问题，转化为一个可结构化表示、可追踪演化、可由多个 agent 协同维护的 investment case。

整体上可以分成 6 层：
	1.	Product/UI layer：左侧对话，右侧 agent canvas
	2.	Agent orchestration layer：多 agent 协作、skills 调用、system prompt 约束
	3.	CLI execution layer：agent 在终端式环境中执行具体动作
	4.	Ontology / Knowledge Graph layer：稳定对象与事实关系
	5.	Context Graph layer：自构建、受约束的运行时决策轨迹
	6.	Data / storage layer：Supabase + Neo4j + OpenBB + 外部信号源

## 2. Product-Side Technical Shape

前端产品形态建议保持双栏：
	•	左侧：主问答区，承担用户输入、结果输出、结构化报告展示
	•	右侧：可展开的 agent canvas，展示多个 agent terminal 的运行状态、skill 调用、ontology objects 更新、decision trace 高亮

技术上，右侧不应只是动画，而应由真实系统状态驱动。也就是说：
	•	agent 的当前 task
	•	最近调用的 skill
	•	新写入的 finding / decision node
	•	当前 trace path

都应来自运行时状态，而不是纯前端 mock。

deployment choice可以选择vercel，当然有更合适的也可以


## 3. Core Domain Model: Ontology

### 3.1 Ontology 的定位

在这个项目里，ontology 不应该被设计成“金融世界的完备本体”，而应是一个 case-centered, liquidity-aware object model。

它的作用不是包办一切，而是提供：
	•	共享对象层
	•	统一语义边界
	•	多 agent 对齐基础
	•	后续 context graph 的锚点

### 3.2 建议的核心 ontology objects

v0 建议控制在以下对象，当然这是当前暂定的，后续有更合理的可以修改：
	•	Asset
	•	InvestmentCase
	•	Thesis
	•	Evidence
	•	Risk
	•	LiquidityFactor
	•	LiquidityRegime
	•	MacroActorAction
	•	MarketMicrostructureSignal
	•	Judgment

这套对象设计的关键，不是“数据多不多”，而是能否支持系统说出类似这样的话：
	•	基本面 thesis 成立，但当前流动性环境不支持估值扩张
	•	美联储预期变化改善了成长股流动性条件，但市场已部分 price in
	•	公司催化剂明确，但微观盘口与期权定位表明短期拥挤

### 3.3 Ontology 与 Knowledge Graph 的关系

要明确区分：
	•	Ontology：定义概念、类型、合法关系
	•	Knowledge Graph：在 ontology 约束下，存具体实例和事实连接

也就是说：
	•	ontology 是语义骨架
	•	knowledge graph 是具体内容层

在工程实现上，Neo4j 更适合承载这两层中的 graph 部分。Neo4j 近期也在强调 context graphs、decision traces、graph-native AI memory 等方向，这与项目叙事是对齐的。
（neo4j关于context graph的文章： https://neo4j.com/blog/agentic-ai/hands-on-with-context-graphs-and-neo4j）


## 4. Context Graph

### 4.1 Context Graph 的定位

这里的 context graph 不是固定定义好的流程图，而是一个：

self-constructing, bounded runtime graph

也就是：
	•	agent 在运行中自己生成 task、finding、decision path
	•	但增长必须受边界约束
	•	不能无限自由发明新语义

Neo4j 官方近期对 context graph 的公开表述，核心就在于：它不是简单 audit log，而是用图结构承载 decision traces、context、causal relationships 等。 ￼

### 4.2 推荐的分层

建议分成三层（都是暂定的，如果有更合理可以改）：

A. Meta Layer
人工定义最小元结构，不允许 agent 随意改动。
例如 node labels：
	•	Query
	•	Task
	•	Agent
	•	Skill
	•	ToolCall
	•	ContextItem
	•	Finding
	•	Decision
	•	Reflection
	•	ReportSection

edge types：
	•	DECOMPOSES_TO
	•	ASSIGNED_TO
	•	USES_SKILL
	•	RETRIEVES
	•	SUPPORTS
	•	CONTRADICTS
	•	UPDATES
	•	CONTRIBUTES_TO
	•	REVISES
	•	CITES

B. Runtime Layer
每次 query 执行时，由 agent 动态创建：
	•	task nodes
	•	intermediate findings
	•	decision points
	•	skill invocations
	•	report lineage

C. Memory / Evolution Layer
从历史 runtime graph 中压缩出可复用 pattern，例如：
	•	某类 case 常见 task decomposition
	•	某类 stock question 更有效的 skill path
	•	经常失败的分析路径

### 4.3 Context Graph 与 Ontology 的关系

这两者不能混。

最稳的定义是：
	•	ontology 提供语义边界
	•	context graph 提供运行时生命

可以记成一句：

ontology is grammar, context graph is sentence

也就是说：
	•	ontology 不应频繁进化
	•	context graph 可以动态生长、合并、压缩、复用


## 5. Graph Write Policy

这是整个项目里很容易失控的一块，必须提前设边界。

不能让 agent 直接往 Neo4j 任意写 Cypher。
更合理的是：
	1.	agent 输出结构化 graph patch
	2.	中间层 graph writer / validator 做校验
	3.	通过后再写入 Neo4j

建议 patch 语义包括：
	•	create node
	•	merge node
	•	create edge
	•	update property
	•	attach evidence
	•	summarize subgraph

graph validator 负责检查：
	•	label 是否合法
	•	edge type 是否合法
	•	是否应 merge 而不是 create
	•	是否触发图膨胀
	•	是否超出 query/session scope

这一步是“bounded runtime”真正落地的关键。


## 6. Data Layer

### 6.1 推荐组合

最合理的 v0 组合仍然是：
	•	Supabase：主库 / Postgres layer
	•	Neo4j：ontology + KG + context graph
	•	OpenBB：统一金融数据接入层之一
	•	Polymarket / 其他信号源：market signal source

### 6.2 Supabase 的角色

Supabase 本质上是托管 Postgres，并提供 Auth、Storage、Edge Functions 等能力；官方文档也明确支持 RLS 和 pgvector。 ￼

适合放在 Supabase 的：
	•	assets
	•	investment_cases
	•	reports
	•	raw_market_data
	•	raw_news
	•	raw_macro_data
	•	agent_runs
	•	embeddings
	•	users / sessions / permissions

也适合放：
	•	JSONB 格式的中间结构化结果
	•	snapshot / cache tables
	•	原始抓取记录

### 6.3 Neo4j 的角色

Neo4j 负责关系密度高、查询路径重要的部分：
	•	ontology nodes / edges
	•	knowledge graph facts
	•	context graph runtime traces
	•	skill routing patterns
	•	report lineage
	•	evidence provenance

### 6.4 为什么不只用一个库

因为项目有完全不同的数据形态：
	•	结构化业务数据
	•	图关系与运行轨迹
	•	原始文本和 embeddings（当然，v0基本用不到，所以当前只需要supabase和neo4j）

这三类不适合强行统一成单一数据模型。


## 7. OpenBB as Data Access Layer

OpenBB 非常适合作为 v0 的统一 research data adapter，而不是唯一真相源。
它官方文档覆盖的 data models 很广，包括：
	•	equity historical
	•	equity quote / info
	•	financial ratios
	•	company news
	•	company filings
	•	earnings call transcript
	•	analyst estimates / price target
	•	options chains / unusual
	•	economic calendar
	•	Fed funds rate
	•	Treasury rates
	•	yield curve
	•	CPI / PCE / NFP
	•	FOMC documents 等。 ￼

这意味着它足够支撑 v0 ontology objects 主要数据供给：
	•	Asset
	•	Evidence
	•	LiquidityFactor
	•	MacroActorAction
	•	MarketMicrostructureSignal

但要明确：
	•	OpenBB 提供数据，不提供你的 ontology
	•	OpenBB 不是 context graph
	•	OpenBB 不是高频交易级市场基础设施

所以一句话定义它最准确：

OpenBB = unified financial data access layer for v0


## 8. Polymarket as Market Signal Source

Polymarket 不应成为系统主轴，但可以作为 MarketSignal / PredictionSignal 的来源之一。

在 ontology 上建议把它降级为：
	•	Evidence.type = prediction_signal
	•	或 MarketSignal.signal_type = prediction_market_probability

这样比较稳，因为：
	•	产品核心仍是股票 investment case
	•	Polymarket 只是外部预期聚合信号
	•	它适合服务宏观、政策、事件概率相关的子判断

比如：
	•	降息概率
	•	某政策出台概率
	•	某选举 / 监管事件概率

都可以作为 thesis / liquidity context 的辅助输入，而不是支配整个系统。



## 9. Data Synchronization Layer

这是把 ontology 从静态结构变成“活系统”的关键。

### 9.1 核心原则

节点不会自动实时更新。
真正让 ontology instance 活起来的，是：

external source → ingestion → normalization → ontology mapping → update

### 9.2 更新机制建议

不要追求全实时，而是按数据类型分层刷新。

A. 高频 / 近实时
	•	latest quote
	•	volume
	•	options snapshot
	•	轻量 market signal

更新方式：
	•	user query triggered refresh
	•	或 1–5 分钟缓存刷新

B. 中频
	•	company news
	•	filings
	•	earnings-related events
	•	unusual options / event signals

更新方式：
	•	15–60 分钟刷新
	•	或 query 时窗口补拉

C. 低频
	•	financial ratios
	•	macro indicators
	•	liquidity regime
	•	thesis summary

更新方式：
	•	日级
	•	或事件驱动

### 9.3 存储建议

不要只覆盖当前值。
推荐做：
	•	graph 中保留 current state
	•	Supabase 中保留 snapshot history

例如：
	•	asset_price_snapshots
	•	macro_snapshots
	•	signal_snapshots
	•	case_update_events

这样后续 context graph 才能引用“某时刻的状态”。
当然暂定的，后续有更合理设计都可以修改

## 10. CLI as the Agent’s Action Surface

这是这个项目很有特色的一点。

这里的 CLI 不只是 developer tool，而是：

agent 的可观察执行界面

也就是说，右侧画布里的 terminal，不应只是 UI 装饰，而是真实对应 agent 的 action stream，例如：
	•	拉取数据
	•	执行 skill
	•	生成 graph patch
	•	更新 ontology object
	•	写入 finding
	•	触发下一步 task

从架构上看，CLI 层其实连接了三样东西：
	1.	agent orchestration
	2.	data access / tool usage
	3.	graph write-back / trace generation

所以可以把 CLI 理解为：

observable execution bridge between agents, tools, ontology, and context graph

它的价值主要有三点：
	•	产品展示性强
	•	行为可审计
	•	很适合答辩 demo

但要注意不要真的让 agent 任意执行危险系统命令。
v0 应采用受控 CLI / sandboxed command interface，命令白名单化。


## 11. Multi-Agent Framework

Google ADK 可以作为一个合理候选。
官方把 ADK 定位为一个用于开发和编排 AI agents 的框架，支持 agent 作为独立执行单元、使用外部 tools，并协调多 agent architectures。 ￼

ADK 可以作为：
	•	agent definitions
	•	agent orchestration
	•	tool / skill wrapping
	•	top-level workflow coordination

的宿主层。

当然，v0 真正重要的不是“非得 ADK”，而是这几个原则：
	•	agent 职责分明
	•	task / skill / output 都结构化
	•	每步都能写回 trace
	•	orchestration 与 UI 状态同步


## 12. Suggested Core Agents

v0 建议固定 4 个 agent，刚好也匹配canvas。

### 1. Thesis Agent

负责：
	•	形成 bull / base thesis
	•	提取催化剂
	•	组织 supporting evidence

### 2. Liquidity Agent

负责：
	•	解释 macro / rates / liquidity regime
	•	连接 MacroActorAction → LiquidityFactor → Asset

### 3. Market Signal Agent

负责：
	•	读取 price / options / microstructure / prediction signals
	•	判断市场是否已部分 price in

### 4. Judge / Synthesis Agent

负责：
	•	读取前面 agent 的 findings
	•	更新 judgment
	•	输出 final report
	•	决定是否需要新增 task





## 13. Skills

skills 在这个项目里，不应只是“工具函数合集”，而应是 agent 可组合调用的能力模块。

skills 的一个核心价值，是让 system prompt 不必承担全部逻辑。
prompt 提供策略边界，skills 提供可复用执行单元。

当前v0阶段，希望能有一些基本的和二级市场标的分析相关skill，宏观，微观，价值投资，k线等等，当然这个都应该是进化的，最开始可以简单一些，甚至暂时不用



## 14. System Prompt

system prompt 的作用不是“塞满金融知识”，而是定义每个 agent 的行为边界。

建议 prompt 里主要规定：
	•	角色职责
	•	输入输出格式
	•	何时应调用 skill
	•	何时必须写回 finding / patch
	•	何时应升级给 judge agent
	•	何时应创建新 task
	•	禁止做什么

例如：
	•	不直接回答用户，先生成结构化 findings
	•	不发明 ontology type
	•	不直接写数据库
	•	只能输出 patch 给 graph writer
	•	所有重要判断必须绑定 evidence 或 signal

这样 prompt 更像 operation policy，而不是“知识注入容器”。


## 15. Runtime Flow

推荐的高层运行流程：
	1.	用户在左侧提问
	2.	planner / router 判断 case type
	3.	在 Neo4j 创建 Query + Task runtime nodes
	4.	四个 agent 各自读取局部图与相关 ontology objects
	5.	agent 通过 CLI 调用 skills / tools / data connectors
	6.	产出 findings 与 graph patch
	7.	graph writer / validator 更新 Neo4j
	8.	同步更新 Supabase 中的 snapshots / reports / logs
	9.	judge agent 汇总为 final judgment
	10.	左侧显示结构化结果，右侧展示运行过程与 trace 高亮

这套流程的关键词就是：

query → plan → retrieve → interpret → write-back → synthesize



## 16. What Not to Overbuild in v0

下面这些东西容易把项目拖死，建议先不做：
	•	高频 tick / order book 全量写入图
	•	完整金融 universe ontology
	•	自由 agent marketplace
	•	让 agent 自主发明 ontology labels
	•	把全部原始文本塞进 Neo4j
	•	过度复杂的自动学习与权重更新系统
	•	真实交易执行 / portfolio optimization


v0 更适合：
	•	结构清楚
	•	交互好看
	•	trace 可见
	•	ontology 与 context graph 能讲清楚
	•	一个 query 跑通完整闭环

## 17. Summary
The system uses Supabase as the operational data layer, Neo4j as the ontology and context-graph layer, OpenBB and other external APIs as data sources, a bounded runtime graph for self-constructing decision traces, and a multi-agent orchestration layer with CLI-based observable execution to produce structured stock research judgments.



# part2: agentic engineering相关的说明

关键词：Agent.md，plan.md，evals，docs & spec，multi threads

最核心的原则是： doc & spec first, plan first, then agentic execution while updating the docs

对这个项目来说，工程上的目标不是单次生成很多代码，而是建立一种：
	•	可重复
	•	可审查
	•	可评估
	•	可多线程并行
	•	可持续迭代

的 agentic engineering workflow。

关于evals，v0 阶段不用做得很重，建议只做三类 eval。

1.  Output structure eval

检查系统输出是否满足你定义的结构，例如是否包含：
	•	final judgment
	•	thesis
	•	evidence
	•	risks
	•	liquidity context
	•	what could change the view

这类 eval 是最低成本、最高价值的。

2. Tool / skill usage eval

检查 agent 是否按预期使用了该用的 skills，而不是绕开系统设计直接乱回答。

比如：
	•	是否调用了 market data skill
	•	是否调用了 graph patch skill
	•	是否真的写回了 trace

3. Trace quality eval

检查 context graph 是否至少满足基本要求：
	•	有没有 task decomposition
	•	有没有 findings
	•	有没有 final synthesis path
	•	有没有与 ontology objects 的连接
