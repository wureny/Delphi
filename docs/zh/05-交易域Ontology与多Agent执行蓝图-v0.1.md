# 交易域 Ontology 与多 Agent 执行蓝图（v0.1）

## 1. 目标
在现有市场语义 ontology 之上，新增“投资决策与执行”语义层，支持：
1. 产出可追溯的投资建议。
2. 在风险约束下执行 paper trading / 实盘交易。

## 2. 新增实体
1. PortfolioAccount
2. Position
3. Order
4. Execution
5. Wallet
6. RiskPolicy
7. DecisionRecord

## 3. 关键链路
`市场本体证据 -> DecisionRecord -> RiskPolicy Gate -> Order -> Execution -> Position/PnL`

## 4. 多 Agent 分工（建议）
1. Research Agent：从市场 ontology 提取事实与证据。
2. Strategy Agent：形成 DecisionRecord（thesis/confidence/action）。
3. Risk Agent：依据 RiskPolicy 审核（可拦截）。
4. Execution Agent：将 approved order 提交到模拟或实盘执行器。
5. Audit Agent：记录执行链路并生成复盘报告。

## 5. 执行安全原则
1. 默认 simulation wallet。
2. 高风险动作必须 `requires_human_approval=true`。
3. 所有 order 必须关联 decision_record_id。
4. 所有 execution 必须可追溯到 tx_hash 或 simulation id。

## 6. 分阶段落地
1. Phase A：只做建议，不下单。
2. Phase B：paper trading（全流程闭环）。
3. Phase C：小额实盘 + 人工审批。

## 7. 对应产物
1. `ontology/schemas/fund-execution-ontology.schema.json`
2. `ontology/samples/fund-execution-sample-bundle.json`
3. `ontology/mappings/fund-execution-mapping.json`
4. `plans/milestones/issue-backlog-g-trading-execution-v0.1.md`
