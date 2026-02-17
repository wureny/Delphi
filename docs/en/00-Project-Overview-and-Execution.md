# Delphi Project Overview & Execution Model (v0.1)

## 1. Context
Delphi is an ontology-driven multi-agent collaboration system for Agentic Fund research, decision-making, and execution workflows.

Current priority order:
1. Build the Ontology layer first (semantic layer above raw data).
2. Build multi-agent orchestration after ontology is stable.

## 2. Current Phase Goal (Phase 1)
Focus on ontology-izing Polymarket to deliver:
1. A unified entity and relationship model.
2. Machine-consumable data structure and constraints.
3. Trackable milestones and implementation tasks.

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

## 6. Next Actions
1. Confirm PRD v0.1 (`docs/en/01-PRD-Polymarket-Ontology-v0.1.md`).
2. Create GitHub epics and child issues from milestones (`docs/en/02-Task-Breakdown-and-Milestones-v0.1.md`).
3. Use issue templates in `.github/ISSUE_TEMPLATE/` for first batch execution.
