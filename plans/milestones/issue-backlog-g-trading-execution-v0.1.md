# Epic G Backlog - Trading & Execution Ontology (v0.1)

## Goal
Enable Delphi to move from market understanding to safe, traceable action proposals and execution records.

## G1 - Define trading domain ontology entities
- Type: Story
- Area: ontology
- Acceptance:
  - [ ] Portfolio/Position/Order/Execution/Wallet/RiskPolicy/DecisionRecord are documented.
  - [ ] Relationship assumptions are stated.

## G2 - Build trading ontology JSON schema
- Type: Task
- Area: ontology
- Acceptance:
  - [ ] `fund-execution-ontology.schema.json` created.
  - [ ] Schema validates sample bundle.

## G3 - Create sample execution bundle
- Type: Task
- Area: mapping
- Acceptance:
  - [ ] Sample includes decision -> order -> execution trace.
  - [ ] Sample references market ontology IDs.

## G4 - Define risk gating rules
- Type: Story
- Area: validation
- Acceptance:
  - [ ] Max position and daily notional checks specified.
  - [ ] Human approval gating condition specified.

## G5 - Build decision-to-order mapper
- Type: Task
- Area: mapping
- Acceptance:
  - [ ] Mapping from DecisionRecord to Order fields is defined.
  - [ ] Invalid mappings produce structured errors.

## G6 - Implement paper-trading simulation flow
- Type: Story
- Area: execution
- Acceptance:
  - [ ] Simulation wallet mode defined.
  - [ ] Position and PnL updates are captured.

## G7 - Add execution audit trail
- Type: Task
- Area: docs
- Acceptance:
  - [ ] Every execution links to decision record and evidence refs.
  - [ ] Chain tx hash or simulation tx id is required.

## G8 - Add benchmark for recommendation quality and execution safety
- Type: Story
- Area: evaluation
- Acceptance:
  - [ ] Recommendation quality metrics defined.
  - [ ] Execution safety violation rate tracked.
