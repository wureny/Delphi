# Delphi Agents

This directory contains the primary multi-agent implementation modules for Delphi.

## Modules
- `build_multi_agent_context.py`: derives Research/Strategy/Risk/Audit packets and candidate decisions from ontology bundles.
- `build_decision_records.py`: maps candidate decisions into execution-domain DecisionRecord objects.
- `evaluate_risk_policy_gate.py`: evaluates decisions under RiskPolicy constraints.
- `build_order_proposals.py`: generates minimal order proposals from gated decisions.
- `run_multi_agent_runtime.py`: orchestrates multi-agent runtime (`heuristic`, `adk`, `llm`) and bridges into pre-trade chain.

## Compatibility
Legacy CLI paths under `scripts/ontology/*.py` are preserved as thin wrappers that call these modules.

## Tests
Smoke tests for agent modules are located in `agents/tests/`:
- `smoke_test_multi_agent_context.py`
- `smoke_test_decision_records.py`
- `smoke_test_risk_policy_gate.py`
- `smoke_test_order_proposals.py`
- `smoke_test_multi_agent_runtime.py`
- `smoke_test_multi_agent_runtime_llm.py`
