# Next Sprint Breakdown - G6/G7/G8 (2026-02-28)

## Goal
Move Delphi from pre-trade semantics to a verifiable execution-loop baseline with auditable simulation outputs.

## Scope
1. G6: paper-trading simulation loop (`Order -> Execution -> Position/PnL`).
2. G7: execution audit-link hardening.
3. G8: recommendation-quality and execution-safety benchmark definition.

## Work Breakdown
### G6 - Paper Trading Loop
1. G6.1 Implement simulation executor module (`agents/simulate_paper_execution.py`).
2. G6.2 Integrate simulation step into runtime (`--enable-paper-trading` in `agents/run_multi_agent_runtime.py`).
3. G6.3 Add smoke test for runtime + simulation path (`agents/tests/smoke_test_paper_trading_simulation.py`).
4. G6.4 Update command docs and CI smoke flow.

### G7 - Audit Trail Hardening
1. G7.1 Ensure each simulated execution carries `decision_record_id` linkage.
2. G7.2 Ensure each simulated execution exposes `simulation_id/tx reference`.
3. G7.3 Include `evidence_refs` in execution audit payload for traceability.
4. G7.4 Add validation checks in smoke tests.

### G8 - Benchmark Setup
1. G8.1 Define metric dictionary for recommendation quality and execution safety.
2. G8.2 Draft benchmark input/output schema for simulation outcomes.
3. G8.3 Add benchmark runner skeleton and one smoke case.
4. G8.4 Integrate benchmark run into CI/reporting workflow.

## Status (after current implementation)
1. G6.1-G6.4: completed (v0 baseline).
2. G7.1-G7.3: partially completed via `execution_audit_trail` payload; G7.4 pending expansion.
3. G8.1-G8.3: completed (v0 baseline).
4. G8.4: pending.

## Acceptance Checklist
- [x] Runtime can emit `paper_trading_payload`.
- [x] Simulation can update `executions` and `positions`.
- [x] PnL summary is emitted.
- [x] Smoke test covers paper-trading path.
- [x] Execution-safety benchmark is defined with smoke-test coverage.
- [ ] Recommendation-quality benchmark runner and CI trend report are automated.

## References
1. `plans/milestones/issue-backlog-g-trading-execution-v0.1.md`
2. `agents/simulate_paper_execution.py`
3. `agents/tests/smoke_test_paper_trading_simulation.py`
