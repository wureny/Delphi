# Epic G Backlog - Trading & Execution Ontology (v0.1)

## Goal
Enable Delphi to move from market understanding to safe, traceable action proposals and execution records.

## Progress Snapshot (2026-02-28)
- Completed (v0): G1, G2, G3, G4, G5, G6
- In Progress: G7, G8
- Pending: none

## G1 - Define trading domain ontology entities
- Type: Story
- Area: ontology
- Status: done (v0)
- Acceptance:
  - [x] Portfolio/Position/Order/Execution/Wallet/RiskPolicy/DecisionRecord are documented.
  - [x] Relationship assumptions are stated.

## G2 - Build trading ontology JSON schema
- Type: Task
- Area: ontology
- Status: done (v0)
- Acceptance:
  - [x] `fund-execution-ontology.schema.json` created.
  - [x] Schema validates sample bundle.

## G3 - Create sample execution bundle
- Type: Task
- Area: mapping
- Status: done (v0)
- Acceptance:
  - [x] Sample includes decision -> order -> execution trace.
  - [x] Sample references market ontology IDs.

## G4 - Define risk gating rules
- Type: Story
- Area: validation
- Status: done (v0)
- Acceptance:
  - [x] Max position and daily notional checks specified.
  - [x] Human approval gating condition specified.

## G5 - Build decision-to-order mapper
- Type: Task
- Area: mapping
- Status: done (v0)
- Acceptance:
  - [x] Mapping from DecisionRecord to Order fields is defined.
  - [x] Invalid mappings produce structured errors.

## G6 - Implement paper-trading simulation flow
- Type: Story
- Area: execution
- Status: done (v0)
- Acceptance:
  - [x] Simulation wallet mode defined.
  - [x] Position and PnL updates are captured.

## G7 - Add execution audit trail
- Type: Task
- Area: docs
- Status: in progress
- Acceptance:
  - [x] Every execution links to decision record and evidence refs.
  - [x] Chain tx hash or simulation tx id is required.
  - [ ] Add audit replay and consistency checks to CI-level validation.

## G8 - Add benchmark for recommendation quality and execution safety
- Type: Story
- Area: evaluation
- Status: in progress
- Acceptance:
  - [x] Recommendation quality/execution safety metric dictionary drafted.
  - [x] Execution safety violation rate tracked via benchmark script.
  - [ ] Add recommendation-quality benchmark runner and CI trend report.
