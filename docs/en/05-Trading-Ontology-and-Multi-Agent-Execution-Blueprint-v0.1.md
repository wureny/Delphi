# Trading Ontology and Multi-Agent Execution Blueprint (v0.1)

## 1. Goal
Extend the current market ontology into an investable and executable semantic layer to support:
1. Traceable investment recommendations.
2. Risk-constrained paper trading and live execution.

## 2. Added entities
1. PortfolioAccount
2. Position
3. Order
4. Execution
5. Wallet
6. RiskPolicy
7. DecisionRecord

## 3. Core chain
`Market ontology evidence -> DecisionRecord -> RiskPolicy Gate -> Order -> Execution -> Position/PnL`

## 4. Suggested multi-agent roles
1. Research Agent: extracts facts/evidence from market ontology.
2. Strategy Agent: creates DecisionRecord (thesis/confidence/action).
3. Risk Agent: applies RiskPolicy checks and can block orders.
4. Execution Agent: submits approved orders to simulator/live executor.
5. Audit Agent: records full trace and builds post-trade reports.

## 5. Safety rules
1. Default to simulation wallet.
2. High-risk actions require `requires_human_approval=true`.
3. Every order must link `decision_record_id`.
4. Every execution must keep `tx_hash` or simulation id.

## 6. Delivery phases
1. Phase A: recommendation only.
2. Phase B: paper trading full loop.
3. Phase C: small-size live trading with human approval.

## 7. Related artifacts
1. `ontology/schemas/fund-execution-ontology.schema.json`
2. `ontology/samples/fund-execution-sample-bundle.json`
3. `ontology/mappings/fund-execution-mapping.json`
4. `plans/milestones/issue-backlog-g-trading-execution-v0.1.md`
