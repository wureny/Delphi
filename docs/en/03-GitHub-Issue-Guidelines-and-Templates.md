# GitHub Issue Guidelines & Templates (v0.2)

## 1. Creation Order
1. Create Epic first (objective and scope).
2. Create Story second (deliverable capability).
3. Create Task last (implementation unit).

## 2. ID Convention
- Epic: `E-A`, `E-B`, `E-C`, `E-D`, `E-E`, `E-F`, `E-G`
- Story: `S-A1`, `S-A2`
- Task: `T-A1-1`, `T-A1-2`

## 3. Issue Title Convention
Format: `[Type][Area] Action + Object`
Examples:
1. `[Epic][Ontology] Define Polymarket core ontology model`
2. `[Story][Mapping] Complete Market -> Ontology field mapping table`
3. `[Task][Validation] Add Outcome completeness rule`
4. `[Story][Evaluation] Define Raw vs Ontology benchmark task set`
5. `[Task][Execution/Risk] Add order risk gate and human approval checks`

## 4. Required Sections
1. Context/Goal
2. In Scope
3. Out of Scope
4. Acceptance Criteria (checkboxes)
5. Dependencies/Blockers
6. Estimated effort (T-shirt size or days)
7. References (Parent Epic, PRD section, Milestone)

## 5. Mapping Issues Back to Docs
1. Reference PRD requirement IDs in issues.
2. Update document status when issue is done.
3. Record key decisions under `plans/decisions`.

## 6. Suggested Rhythm
1. Weekly planning: commit the issue list for the week.
2. Daily update: status, risks, and next action.
3. Weekly retro: close milestone or reduce scope.

## 7. Current Area Labels
1. `area:ontology`
2. `area:mapping`
3. `area:validation`
4. `area:evaluation`
5. `area:visualization`
6. `area:execution`
7. `area:risk`

## 8. Current Templates
1. `01-epic-ontology.md`: generic epic template
2. `02-story-ontology.md`: generic story template
3. `03-task-implementation.md`: generic task template
4. `04-evaluation-benchmark.md`: benchmark-specific template
5. `05-execution-risk-gate.md`: execution/risk-specific template
