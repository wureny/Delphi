# Polymarket Ontology Multi-Agent Consumption Contract (v0.1)

## 1. Goal
This document answers an engineering question:
how the current Polymarket ontology, microstructure layer, case library, and stream capture should be consumed by a future multi-agent system without forcing each agent to re-parse raw market data.

The goal is a minimal executable contract so that:
1. the Research Agent focuses on world facts and evidence,
2. the Strategy Agent focuses on robust probability and actionable edge,
3. the Risk Agent focuses on signal quality and gating,
4. the Audit Agent focuses on provenance and traceability.

## 2. Design principles
1. Multi-agent consumers should not default to raw Gamma / CLOB payloads.
2. Agents should default to ontology bundles and derived states rather than unbounded raw event streams.
3. The same market should be exposed through different views for different agents.
4. `displayed_probability` should not be treated as the final decision signal; `robust_probability` should be preferred by default.
5. Risk and audit agents must see `signal_weights`, `manipulation_risk_score`, and `explanatory_tags`.

## 3. Current implementation artifact
The repo now includes:
- `scripts/ontology/build_multi_agent_context.py`
- `ontology/samples/multi-agent/polymarket-agent-context-sample.json`

The builder converts a Polymarket ontology bundle into:
1. `research_agent_packets`
2. `strategy_agent_packets`
3. `risk_agent_packets`
4. `audit_agent_packets`
5. `candidate_decisions`

## 4. Per-agent input contract
### 4.1 Research Agent
Goal: understand market propositions, related events, news, and state.

Primary inputs:
- `Event`
- `Market`
- `Outcome`
- `NewsSignal`
- `ResolutionState`
- `LiquiditySnapshot`
- `research_agent_packets`

It should not turn the following directly into actions:
- `displayed_probability`
- isolated `last_trade_price`

Its outputs should emphasize:
1. factual statements,
2. proposition decomposition,
3. external evidence summaries,
4. unresolved questions.

### 4.2 Strategy Agent
Goal: turn semantic + market signals into candidate theses.

Primary inputs:
- `robust_probability`
- `prior_probability`
- `probability_edge`
- `book_reliability_score`
- `trade_reliability_score`
- `strategy_agent_packets`

It should not rely in isolation on:
- `displayed_probability`
- `midpoint`
- any single small trade

The current `strategy_agent_packets` already provide:
- `strategy_recommendation`
- `probability_edge`
- `robust_probability`
- `manipulation_risk_score`

### 4.3 Risk Agent
Goal: decide whether a candidate signal should be down-weighted, warned on, or blocked.

Primary inputs:
- `manipulation_risk_score`
- `book_reliability_score`
- `trade_reliability_score`
- `signal_weights`
- `explanatory_tags`
- `risk_agent_packets`

The current implementation emits:
- `risk_gate` in `allow/caution/block`
- `risk_reasons`

This makes it suitable as a precursor to a later `RiskPolicy Gate`.

### 4.4 Audit Agent
Goal: ensure every later `DecisionRecord` can be traced back to market evidence and weighting logic.

Primary inputs:
- `source_ids`
- `display_price_source`
- `signal_weights`
- `evidence_refs`
- `audit_agent_packets`

The Audit Agent should preserve:
1. where the signal came from,
2. why fallback/book/trade got the final weight,
3. which explanatory tags influenced the final conclusion.

## 5. Position of `candidate_decisions`
`candidate_decisions` are not final orders. They are the intermediate object between Strategy and Risk.

Current fields include:
- `decision_id`
- `market_id`
- `outcome_id`
- `proposed_action`
- `confidence`
- `thesis_summary`
- `evidence_refs`
- `risk_gate`
- `requires_risk_review`

Conceptually, this is a precursor to the execution-domain `DecisionRecord`.

## 6. Relationship to execution ontology
The current execution chain is:
`Market ontology evidence -> DecisionRecord -> RiskPolicy Gate -> Order -> Execution`

The purpose of this multi-agent consumption layer is therefore:
1. turn market ontology into agent-specific context,
2. turn context into `candidate_decisions`,
3. later map `candidate_decisions` into execution-domain `DecisionRecord` objects.

This means the current layer is not the execution layer itself. It is the cognition and filtering layer before execution.

## 7. Why this layer is necessary
Without this layer, common multi-agent failure modes are:
1. each agent re-parses ontology/raw payload independently,
2. each agent uses a different implicit price semantics for the same market,
3. the Risk Agent intervenes too late,
4. the Audit Agent cannot explain why the system trusted midpoint in one case and fallback in another.

With this layer:
1. the Research Agent becomes a fact organizer,
2. the Strategy Agent becomes a thesis generator,
3. the Risk Agent becomes a signal-quality gate,
4. the Audit Agent becomes a reasoning-trace keeper.

## 8. Current boundary
1. `candidate_decisions` are still heuristic drafts, not the final strategy engine output.
2. The repo now includes a `candidate_decisions -> DecisionRecord` mapper, but there is still no full `Execution -> Position/PnL` closed loop.
3. A minimal `RiskPolicy gate` and `Order proposal` layer now exist, but this is still not a full execution runtime.
4. A minimal multi-agent runtime skeleton now exists (`heuristic/adk/llm`), but it still lacks production-grade state management, long-running reliability, and full orchestration controls.

## 9. Recommended next steps
1. Add a paper-trading stub for `Execution -> Position/PnL`.
2. Add execution audit-trail requirements (decision/evidence/gate/execution linkage).
3. Add benchmarks for Research/Strategy/Risk/Audit and execution safety to measure whether ontology genuinely improves system quality.
