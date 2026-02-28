# Polymarket Ontology 多 Agent 消费契约（v0.1）

## 1. 目标
这份文档回答一个工程问题：
当前已经完成的 Polymarket ontology、microstructure、case library、stream capture，应该如何被后续多 Agent 系统稳定消费，而不是每个 agent 自己重新解析一遍 raw market data。

目标是提供一个最小可运行 contract，使：
1. `Research Agent` 关注世界事实与证据。
2. `Strategy Agent` 关注稳健概率与可行动 edge。
3. `Risk Agent` 关注信号质量和拦截条件。
4. `Audit Agent` 关注来源、解释和审计链路。

## 2. 设计原则
1. 多 Agent 不应直接默认消费 raw Gamma / CLOB payload。
2. Agent 默认消费 ontology bundle 与派生状态，而不是无限长原始事件流。
3. 同一个 market，不同 agent 读到的视图应不同。
4. `displayed_probability` 不能直接作为最终决策输入；默认应优先看 `robust_probability`。
5. 风险与审计 agent 必须能看到 `signal_weights`、`manipulation_risk_score` 和 `explanatory_tags`。

## 3. 当前实现产物
当前仓库已新增：
- `scripts/ontology/build_multi_agent_context.py`
- `ontology/samples/multi-agent/polymarket-agent-context-sample.json`

该脚本把一个 Polymarket ontology bundle 转换为：
1. `research_agent_packets`
2. `strategy_agent_packets`
3. `risk_agent_packets`
4. `audit_agent_packets`
5. `candidate_decisions`

## 4. 各 Agent 输入契约
### 4.1 Research Agent
目标：理解市场命题、相关事件、新闻、状态。

应重点读取：
- `Event`
- `Market`
- `Outcome`
- `NewsSignal`
- `ResolutionState`
- `LiquiditySnapshot`
- `research_agent_packets`

不应直接根据以下字段做最终动作判断：
- `displayed_probability`
- `last_trade_price` 的单点值

Research Agent 的产出重点应是：
1. 事实陈述
2. 命题分解
3. 外部证据摘要
4. 需要进一步验证的未知项

### 4.2 Strategy Agent
目标：从“市场信号 + 语义对象”形成候选 thesis。

应重点读取：
- `robust_probability`
- `prior_probability`
- `probability_edge`
- `book_reliability_score`
- `trade_reliability_score`
- `strategy_agent_packets`

不应单独依赖：
- `displayed_probability`
- `midpoint`
- 任何单次小额成交

当前实现中，`strategy_agent_packets` 已给出：
- `strategy_recommendation`
- `probability_edge`
- `robust_probability`
- `manipulation_risk_score`

这意味着 Strategy Agent 可以先做 thesis draft，而不必自己重新推断 market signal quality。

### 4.3 Risk Agent
目标：决定这条候选信号是否应该被降权、警告或阻断。

应重点读取：
- `manipulation_risk_score`
- `book_reliability_score`
- `trade_reliability_score`
- `signal_weights`
- `explanatory_tags`
- `risk_agent_packets`

当前实现中，Risk Agent 输出：
- `risk_gate` in `allow/caution/block`
- `risk_reasons`

适合直接作为后续 `RiskPolicy Gate` 的前置输入。

### 4.4 Audit Agent
目标：保证后面任何 `DecisionRecord` 都能追溯到市场证据和权重解释。

应重点读取：
- `source_ids`
- `display_price_source`
- `signal_weights`
- `evidence_refs`
- `audit_agent_packets`

Audit Agent 不负责判断是否买卖，但必须负责保存：
1. 这次信号从哪里来。
2. 为什么这次更信 fallback，或更信 book/trade。
3. 哪些解释标签参与了最终结论。

## 5. candidate_decisions 的定位
`candidate_decisions` 不是最终下单指令，而是 Strategy/Risk 之间的中间物。

当前字段包括：
- `decision_id`
- `market_id`
- `outcome_id`
- `proposed_action`
- `confidence`
- `thesis_summary`
- `evidence_refs`
- `risk_gate`
- `requires_risk_review`

定位上，它是后续 `DecisionRecord` 的前身。

## 6. 与执行域 Ontology 的关系
当前执行域链路是：
`Market ontology evidence -> DecisionRecord -> RiskPolicy Gate -> Order -> Execution`

因此当前多 Agent 消费层的作用是：
1. 从市场 ontology 产出 agent-specific context。
2. 从 agent context 产出 `candidate_decisions`。
3. 后续再将 `candidate_decisions` 映射为执行域里的 `DecisionRecord`。

也就是说，当前这层不是 execution layer 本身，而是 execution layer 之前的“认知与筛选层”。

## 7. 为什么这层必要
如果没有这层，多 Agent 系统常见问题是：
1. 每个 agent 自己重复解析 ontology/raw payload。
2. 每个 agent 对同一市场使用不同的价格语义。
3. Risk Agent 太晚介入，导致错误 thesis 先形成。
4. Audit Agent 无法解释为什么系统这次信 midpoint、那次信 fallback。

有了这层后：
1. `Research Agent` 更像事实整理器。
2. `Strategy Agent` 更像 thesis 生成器。
3. `Risk Agent` 更像 signal-quality gate。
4. `Audit Agent` 更像 reasoning trace keeper。

## 8. 当前实现边界
1. 当前 `candidate_decisions` 仍是 heuristic draft，不是最终策略引擎输出。
2. 当前已经有 `candidate_decisions -> DecisionRecord` mapper，但还没有完整的 `Execution -> Position/PnL` 闭环。
3. 当前已经有最小 `RiskPolicy gate` 与 `Order proposal`，但还不是完整 execution runtime。
4. 当前已实现最小 multi-agent runtime skeleton（`heuristic/adk/llm`），但仍缺执行器状态管理、长运行稳定性与生产级编排能力。

## 9. 下一步建议
1. 补 `Execution -> Position/PnL` 的 paper trading stub。
2. 增加 execution audit trail 约束（decision/evidence/gate/execution 全链路可追溯）。
3. 为 `Research/Strategy/Risk/Audit` 增加 benchmark，衡量 ontology 对多 Agent 与执行安全的提升是否真实存在。
