# Service Repository Boundary Specification

## Requirements

### Requirement: UI mutations go through workspace service

Workspace UI actions SHALL call a service boundary for accept, dismiss, correct, and record-decision actions.
UI components SHALL NOT directly implement product mutation rules.

#### Scenario: Evidence accepted through service

GIVEN a new evidence item exists
WHEN the user accepts the item
THEN the workspace service SHALL mark it accepted
AND accepted evidence SHALL appear in the thesis evidence map.

### Requirement: Repository adapters expose product vocabulary only

Workspace repositories SHALL return Delphi product objects such as thesis, assumption, evidence, source, decision trace, and change summary.
Repositories SHALL NOT expose graph, Neo4j, Cypher, OpenBB, provider response, node, or edge terminology to UI callers.

#### Scenario: Future persistence adapter

GIVEN a future repository uses Neo4j or another persistence layer internally
WHEN UI requests workspace data
THEN the repository SHALL return product-shaped workspace data
AND SHALL hide persistence implementation details.

### Requirement: Service enforces correction invariants

The workspace service SHALL record user corrections with `classification.source = user`.
When a correction attaches evidence to a thesis, the service SHALL derive the asset from that thesis.

#### Scenario: Correct classification

GIVEN an evidence item has an AI classification
WHEN the user saves a correction
THEN the corrected classification SHALL be labelled as user-confirmed
AND SHALL retain the corrected impact, thesis, assumption, confidence, and rationale summary.

### Requirement: Service enforces decision trace integrity

The workspace service SHALL reject empty human rationale.
When a decision is recorded, it SHALL append a decision trace entry and update conviction/freshness as a human action.
The service SHALL NOT generate rationale or expose chain-of-thought.

#### Scenario: Empty rationale rejected

GIVEN the user attempts to record a decision without a rationale
WHEN the service validates the decision
THEN it SHALL reject the decision
AND SHALL NOT append a trace entry.

#### Scenario: Decision recorded with rationale

GIVEN the user records a decision with a typed rationale
WHEN the service saves the decision
THEN a trace entry SHALL be appended
AND the entry SHALL contain the typed rationale
AND no chain-of-thought field SHALL be present.

### Requirement: Counter-evidence remains queryable

The workspace service and repository SHALL preserve counter-evidence filtering and visibility.

#### Scenario: List counter-evidence

GIVEN evidence exists with impact `contradicts`
WHEN the caller lists counter-evidence
THEN contradicting evidence SHALL be returned separately from neutral or supporting evidence.
