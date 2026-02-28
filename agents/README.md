# Delphi Agents

This directory contains the primary multi-agent implementation modules for Delphi.

## Modules
- `build_multi_agent_context.py`: derives Research/Strategy/Risk/Audit packets and candidate decisions from ontology bundles.
- `build_decision_records.py`: maps candidate decisions into execution-domain DecisionRecord objects.
- `evaluate_risk_policy_gate.py`: evaluates decisions under RiskPolicy constraints.
- `build_order_proposals.py`: generates minimal order proposals from gated decisions.
- `simulate_paper_execution.py`: simulates order execution and updates execution/position/PnL state.
- `run_multi_agent_runtime.py`: orchestrates multi-agent runtime (`heuristic`, `adk`, `llm`) and bridges into pre-trade chain. It accepts either prebuilt `--agent-context` or raw `--ontology-bundle` as source input.

## Compatibility
Legacy CLI paths under `scripts/ontology/*.py` are preserved as thin wrappers that call these modules.

## ADK Runtime Notes
- `run_multi_agent_runtime.py` supports `--runtime-engine adk` with ADK Runner + SessionService.
- Use `--adk-provider openai` with `OPENAI_API_KEY` (or a compatible gateway via `OPENAI_API_BASE`).
- Use `--adk-session-db-url` to persist context across process restarts.

## Tests
Smoke tests for agent modules are located in `agents/tests/`:
- `smoke_test_multi_agent_context.py`
- `smoke_test_decision_records.py`
- `smoke_test_risk_policy_gate.py`
- `smoke_test_order_proposals.py`
- `smoke_test_multi_agent_runtime.py`
- `smoke_test_multi_agent_runtime_from_ontology.py`
- `smoke_test_multi_agent_runtime_llm.py`
- `smoke_test_multi_agent_runtime_adk.py` (auto-skip when ADK is not installed)
- `smoke_test_paper_trading_simulation.py`
