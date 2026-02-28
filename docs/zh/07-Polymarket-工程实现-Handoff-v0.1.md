# Polymarket Ontology 工程实现 Handoff（v0.1）

## 1. 目标
这份 handoff 用于在上下文不足或开启新对话时，快速恢复 Delphi 当前的 Polymarket ontology 工程状态，并直接继续后续工作。

当前目标不是继续扩展概念文档，而是把已经定义好的 ontology 与微观结构分析能力，推进成更稳健的可运行系统，使 Agent：
1. 能理解 `crypto` 与 `finance` 市场中的真实世界对象、命题、关系与证据。
2. 不会因为浅盘口、宽 spread、低成交确认或小额拉盘而过度相信 Polymarket 的表面价格。
3. 能区分“平台展示信号”和“对真实世界更稳健的推断信号”。

## 2. 已完成内容
### 2.1 Ontology 设计层
已完成的概念与契约设计包括：
1. 将 Polymarket ontology 收敛到 `crypto` / `finance` 两类市场。
2. 明确 `Event -> Market -> Outcome` 为主链路。
3. 将市场微观结构纳入 ontology / 派生层：
   - `OrderBookSnapshot`
   - `TradePrint`
   - `MarketMicrostructureState`
4. 引入 `displayed_probability` 与 `robust_probability` 区分，避免 Agent 直接吞掉表面概率。
5. 将 ontology 明确设计为“面向 Agent 感知与决策”的语义层，而不是底层表/API 的镜像。

核心文件：
- `docs/zh/01-PRD-Polymarket-Ontology-v0.1.md`
- `docs/zh/06-Polymarket-市场微观结构与稳健信号设计-v0.1.md`
- `ontology/schemas/polymarket-ontology.schema.json`
- `ontology/schemas/core-entity-dictionary.md`
- `ontology/mappings/polymarket-field-mapping.json`

### 2.2 可运行实现层
已完成可执行 pipeline 与 P0/P1/P2 第一版：
1. `mapper v0`
   - 文件：`scripts/ontology/polymarket_mapper.py`
   - 作用：将 Gamma event/market 元数据、CLOB 盘口与成交消息、外部 news signals 转换为 ontology bundle。
2. `microstructure analyzer v0`
   - 文件：`scripts/ontology/polymarket_microstructure.py`
   - 作用：产出 `MarketMicrostructureState`，包括：
     - `displayed_probability`
     - `robust_probability`
     - `book_reliability_score`
     - `manipulation_risk_score`
     - `depth_imbalance`
     - `quote_trade_divergence`
     - `explanatory_tags`
3. CLI 构建入口
   - 文件：`scripts/ontology/build_polymarket_ontology.py`
4. 本地 smoke test
   - 文件：`scripts/ontology/smoke_test_polymarket_pipeline.py`
5. 公共数据抓取器
   - 文件：`scripts/ontology/polymarket_public_clients.py`
   - 文件：`scripts/ontology/fetch_polymarket_public_snapshot.py`
6. 真实历史 case 库采集器
   - 文件：`scripts/ontology/capture_polymarket_case_library.py`
   - 作用：重复抓取 snapshot，自动归档高风险 market case
7. rolling stream capture
   - 文件：`scripts/ontology/polymarket_stream_capture.py`
   - 作用：支持 live websocket capture 与本地 replay，两种模式都可输出 rolling ontology bundles
8. live case 标注工作流
   - 文件：`scripts/ontology/manage_live_case_labels.py`
   - 作用：导出未标注 case 队列、回写标签、汇总覆盖率
9. 多 Agent 消费层桥接器
   - 文件：`scripts/ontology/build_multi_agent_context.py`
   - 作用：把 ontology bundle 转为 `Research/Strategy/Risk/Audit` agent packets 与 `candidate_decisions`
10. DecisionRecord mapper
   - 文件：`scripts/ontology/build_decision_records.py`
   - 作用：把 `candidate_decisions` 映射为执行域 `DecisionRecord`
11. RiskPolicy gate
   - 文件：`scripts/ontology/evaluate_risk_policy_gate.py`
   - 作用：对 `candidate_decisions / DecisionRecord` 进行最小可运行风控审查
12. Order proposal builder
   - 文件：`scripts/ontology/build_order_proposals.py`
   - 作用：把 gate 结果与 `DecisionRecord` 合成为最小 `Order proposal`
13. benchmark 评估器
   - 文件：`scripts/ontology/benchmarks/evaluate_microstructure_cases.py`

### 2.3 样例与测试资产
已提供：
1. 本地 raw 样例：
   - `ontology/samples/raw/polymarket-gamma-events-sample.json`
   - `ontology/samples/raw/polymarket-clob-market-channel-sample.json`
   - `ontology/samples/raw/polymarket-news-signals-sample.json`
2. benchmark case：
   - `ontology/samples/benchmarks/microstructure-benchmark-cases.json`
3. CI 已接入：
   - `scripts/ci/check_repo.sh`
4. 新增 smoke tests：
   - `scripts/ontology/smoke_test_polymarket_stream_capture.py`
   - `scripts/ontology/smoke_test_polymarket_case_library.py`
   - `scripts/ontology/smoke_test_live_case_labels.py`
   - `scripts/ontology/smoke_test_multi_agent_context.py`
   - `scripts/ontology/smoke_test_decision_records.py`
   - `scripts/ontology/smoke_test_risk_policy_gate.py`
   - `scripts/ontology/smoke_test_order_proposals.py`

## 3. 已验证结果
### 3.1 本地样例链路
已验证通过：
```bash
python3 scripts/ontology/smoke_test_polymarket_pipeline.py
python3 scripts/ontology/build_polymarket_ontology.py \
  --gamma-events ontology/samples/raw/polymarket-gamma-events-sample.json \
  --clob-messages ontology/samples/raw/polymarket-clob-market-channel-sample.json \
  --news-signals ontology/samples/raw/polymarket-news-signals-sample.json \
  --output /tmp/polymarket-bundle.generated.json \
  --pretty
```

### 3.2 真实公开数据链路
已使用公开网络接口跑通过 live snapshot，不需要 API key。

已验证命令：
```bash
python3 scripts/ontology/fetch_polymarket_public_snapshot.py \
  --output-dir /tmp/polymarket-live-raw \
  --limit-events 5

python3 scripts/ontology/build_polymarket_ontology.py \
  --gamma-events /tmp/polymarket-live-raw/polymarket-gamma-events.json \
  --clob-messages /tmp/polymarket-live-raw/polymarket-clob-market-channel.json \
  --news-signals /tmp/polymarket-live-raw/polymarket-news-signals.json \
  --output /tmp/polymarket-live-bundle.json \
  --pretty
```

一次已验证的 live 结果：
1. `events=4`
2. `markets=10`
3. `outcomes=20`
4. `order_book_snapshots=14`
5. `trade_prints=20`
6. `market_microstructure_states=20`

### 3.3 benchmark 结果
已验证命令：
```bash
python3 scripts/ontology/benchmarks/evaluate_microstructure_cases.py \
  --cases ontology/samples/benchmarks/microstructure-benchmark-cases.json
```

一次已验证的结果：
1. `avg_displayed_error = 0.02`
2. `avg_robust_error = 0.008616`
3. `avg_improvement = 0.011384`
4. `robust_better_case_count = 2 / 3`

结论：当前 `robust_probability` 在已有 case 集中优于直接使用 `displayed_probability`，尤其对薄盘口扭曲 case 更稳健。

### 3.4 执行前链路结果
当前已经可运行：
`ontology bundle -> multi-agent context -> candidate_decisions -> DecisionRecord -> RiskPolicy gate -> Order proposal`

说明：
1. 当前 sample 中 `candidate_decisions` 多数为 `hold`。
2. 因此 `build_order_proposals.py` 的样例输出主要体现：
   - `orders=[]`
   - `skipped_decisions=[...]`
3. 这是正确行为，不是错误；`hold` 不应被错误转换为 `buy/sell` order。

## 4. 实现中的关键修正
### 4.1 category 推断方式修正
真实 Polymarket live payload 中，`category` 并不稳定存在于顶层；更可靠的信息来自 `tags`。

当前实现：
1. 优先从 `tags` 推断类别。
2. 仅保留 `crypto` / `finance`。
3. 目前优先级是：
   - 若 tags 命中 `crypto`，归为 `crypto`
   - 否则若 tags 命中 `finance/economy/business/stocks/ipos/macro`，归为 `finance`

影响：一些同时带 `crypto` 和 `stocks` 语义的事件，当前会优先落到 `crypto`。

### 4.2 last trade 数据来源修正
CLOB 的独立 `last-trade-prices` 路径在 live 验证中并不稳定，因此当前 fetcher 已增加 fallback：
1. 若可用，优先使用 CLOB 路径。
2. 否则退回使用 Gamma market 元数据中的 `lastTradePrice` 生成 `last_trade_price` 消息。

### 4.3 trade-only 场景标签修正
对于没有可用 order book、只有 trade 信号的 live 市场：
1. 不再错误标记为 `trade_confirmed`。
2. 当前改为更准确的标签：
   - `no_book_snapshot`
   - `trade_only_signal`

## 5. 当前边界与不足
当前这版已经是可运行的 v0，但还不是最终版。

主要边界：
1. 目前是 snapshot 模式，不是持续流处理。
2. `manipulation_risk_score` 是启发式风险分，不是操纵证明。
3. `robust_probability` 是工程可解释版本，尚未经过大样本历史校准。
4. 当前 benchmark case 数量很少，不足以支持稳定阈值。
5. category 仍是启发式映射，后续需要更明确的 taxonomy 规则。
6. 尚未把“真实世界外部参考信号”系统化接入到 benchmark 中。
7. 当前已实现最小多 Agent runtime skeleton，但还缺生产级编排、容错与可观测性。
8. 当前还没有 `Execution -> Position/PnL` 的 paper trading 闭环。

## 6. 下一步任务优先级
建议严格按以下顺序做。

### P-Next. G6 - paper trading 闭环
当前结论：
1. 多 Agent runtime skeleton 已落地，可直接进入执行域闭环阶段。
2. 当前最关键缺口是 `Order -> Execution -> Position/PnL`。
3. 该闭环补齐后，才能真实评估策略质量与风险门禁有效性。

建议做法：
1. 增加 simulation execution 模块，消费 `approved/proposed` orders。
2. 输出 execution records（强制 `simulation_id`）并更新 positions。
3. 产出最小 PnL 快照（已实现盈亏与未实现盈亏）。
4. 增加 smoke test 覆盖 `decision -> gate -> order -> execution -> position/pnl` 全链路。

### P0. G7 - execution audit trail
当前状态：执行前链路已具备，但审计链路仍需硬约束。

下一步增强：
1. 强制 order/execution 关联 `decision_record_id` 与 `evidence_refs`。
2. 统一 `tx_hash/simulation_id` 字段约束与空值处理策略。
3. 增加审计回放样例与校验脚本，确保链路可追溯。

### P1. G8 - recommendation quality + execution safety benchmark
当前状态：已有 microstructure benchmark，尚未覆盖执行安全质量。

下一步增强：
1. 定义执行安全指标（block 准确率、违规漏拦率、人工审批占比）。
2. 定义推荐质量指标（行动命中率、收益质量、风险调整收益）。
3. 将 benchmark 纳入回归流程，并输出阶段趋势报告。

### P2. 真实历史 case 库
当前状态：已实现第一版。

已完成：
1. 多次 snapshot 采样脚本：`scripts/ontology/capture_polymarket_case_library.py`
2. 高风险 case 自动归档
3. `live-cases/<case_id>/raw` 与 `ontology/case-bundle.json` 结构
4. `benchmark-case.json` 草稿输出，待人工补 `reference_probability`
5. `manage_live_case_labels.py` 标注工作流：
   - `queue`
   - `apply`
   - `summary`

下一步增强：
1. 把标注结果和外部参考源进一步联动
2. 将 live case 自动汇总进回归评测

### P3. WebSocket 持续流
当前状态：已实现第一版。

已完成：
1. `scripts/ontology/polymarket_ws_client.py`：stdlib 最小 websocket client
2. `scripts/ontology/polymarket_stream_capture.py`
3. live capture 与 replay 双模式
4. rolling ontology bundle 输出
5. `window-seconds` 滚动窗口
6. segment rotation 与 `captured-messages.jsonl` 分片持久化

下一步增强：
1. 更长时间运行的稳定性
2. 更细粒度的 rolling window 聚合

### P4. robust_probability 调整
当前状态：已实现 v0.1。

已完成：
1. 新增 `trade_reliability_score`
2. 新增 `signal_weights`
3. `robust_probability` 从二元混合升级为 4 路加权：
   - displayed
   - book anchor
   - trade anchor
   - fallback anchor
4. benchmark case 扩展到 5 个场景

下一步增强：
1. 用更多 live 标注 case 调阈值
2. 引入外部真实世界参考源

## 7. 下一次对话可直接执行的任务
如果开启新对话，可以直接给出下面这段指令：

```text
继续 Delphi 的 Polymarket ontology 工程实现。
当前仓库里已经有：
- mapper v0
- microstructure analyzer v0
- public snapshot fetcher
- benchmark evaluator
- live public snapshot 已验证跑通
- multi-agent context builder
- decision record mapper
- risk policy gate
- order proposal builder
- multi-agent runtime skeleton

请先阅读：
- docs/zh/07-Polymarket-工程实现-Handoff-v0.1.md
- docs/zh/08-Polymarket-Ontology-多Agent消费契约-v0.1.md
- docs/zh/09-Polymarket到多Agent到执行前链路总览-v0.1.md
- scripts/ontology/README.md
- scripts/ontology/build_multi_agent_context.py
- scripts/ontology/build_decision_records.py
- scripts/ontology/evaluate_risk_policy_gate.py
- scripts/ontology/build_order_proposals.py
- agents/run_multi_agent_runtime.py

然后优先实现 paper trading 闭环（G6）并补 execution audit trail（G7）。
要求：
1. 在现有 `Order proposal` 基础上增加 simulation execution。
2. 输出 `Execution -> Position/PnL` 更新结果与最小报表。
3. 强制执行审计字段：`decision_record_id`、`evidence_refs`、`simulation_id/tx_hash`。
4. 增加 smoke test 覆盖闭环。
5. 跑自检并汇报结果。
```

## 8. 若需要联网或凭证
当前阶段：
1. 不需要 API key。
2. 公开抓取使用 Polymarket 公共接口即可。
3. 只有在后续接入受限接口、外部新闻源、或长期稳定采样服务时，才可能需要额外凭证或基础设施支持。

## 9. 本次 handoff 对应的重要文件
- `docs/zh/07-Polymarket-工程实现-Handoff-v0.1.md`
- `docs/zh/08-Polymarket-Ontology-多Agent消费契约-v0.1.md`
- `docs/zh/09-Polymarket到多Agent到执行前链路总览-v0.1.md`
- `scripts/ontology/README.md`
- `scripts/ontology/build_multi_agent_context.py`
- `scripts/ontology/build_decision_records.py`
- `scripts/ontology/evaluate_risk_policy_gate.py`
- `scripts/ontology/build_order_proposals.py`
- `ontology/samples/benchmarks/microstructure-benchmark-cases.json`
- `ontology/samples/multi-agent/polymarket-agent-context-sample.json`
- `ontology/samples/execution-derived/decision-records-sample.json`
- `ontology/samples/execution-derived/risk-gate-report-sample.json`
- `ontology/samples/execution-derived/order-proposals-sample.json`
- `scripts/ci/check_repo.sh`
