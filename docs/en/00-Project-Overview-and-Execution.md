# Delphi Project Overview & Execution Model (v0.2)

## 1. Context
Delphi is an ontology-driven multi-agent collaboration system for Agentic Fund research, decision-making, and execution workflows.

Current priority order (as of 2026-02-28):
1. Build on top of ontology + multi-agent runtime skeleton + paper-trading v0 to harden execution auditability and safety benchmarking.
2. Move from "runnable" to "operationally managed and measurable".

## 2. Current Phase Goal (Phase 2)
Focus on execution-loop closure and governance hardening:
1. Deliver a paper-trading loop for `DecisionRecord -> RiskPolicy -> Order -> Execution -> Position/PnL`.
2. Deliver an auditable execution trail (decision/evidence/gate/execution links).
3. Keep milestones, issue states, and weekly project-management docs aligned with implementation reality.

## 3. Execution Principles
1. Product-first: clarify PRD, scope, and acceptance before implementation.
2. Layer-first: ontology before agent orchestration.
3. Small batches: each issue should be finishable and verifiable in 1-3 days.
4. Filesystem as memory: keep docs, decisions, and progress in-repo.

## 4. Suggested Repo Structure
```text
Delphi/
  docs/
    zh/
    en/
  ontology/
    schemas/
    mappings/
    validation/
  plans/
    milestones/
    decisions/
  .github/
    ISSUE_TEMPLATE/
```

## 5. Operating Cadence (Suggested)
1. Every Monday: refresh milestones and issue shortlist.
2. Daily: update issue progress and blockers.
3. End of week: update phase retrospective in `plans/milestones`.

## 6. Next Actions (Priority Order)
1. Advance G7: add audit replay/consistency checks and harden `decision_record_id` and `tx_hash/simulation_id` guarantees.
2. Advance G8: add recommendation-quality and execution-safety benchmarks and make them regression-ready.
3. Backfill G6 hardening: improve simulation stability and reporting depth on top of the v0 loop.
4. Publish a weekly status snapshot under `plans/milestones/`.
