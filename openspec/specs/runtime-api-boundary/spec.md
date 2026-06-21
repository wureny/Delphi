# Runtime API Boundary Specification

## Requirements

### Requirement: UI-facing repositories call a runtime API boundary

UI-facing workspace repositories SHALL access workspace state through a runtime API contract.
UI-facing code SHALL NOT instantiate persistence, provider, graph, or model orchestration implementations directly.

#### Scenario: Workspace loaded through API repository

GIVEN the frontend needs workspace data
WHEN it requests the workspace
THEN the API repository SHALL call the runtime API contract
AND SHALL return Delphi product-shaped workspace data.

### Requirement: Runtime API responses use safe envelopes

Runtime API calls SHALL return a success envelope with data or a failure envelope with a normalized error.
Failure envelopes SHALL NOT expose stack traces, raw provider payloads, model prompts, chain-of-thought, Cypher, graph nodes, graph edges, or secrets.

#### Scenario: Empty decision rationale rejected safely

GIVEN the user submits a decision command with empty rationale
WHEN the runtime validates the command
THEN it SHALL return a failure envelope
AND the error SHALL use safe product language.

### Requirement: Runtime commands preserve product invariants

Runtime commands SHALL preserve user correction, grounding, counter-evidence, and decision trace invariants.

#### Scenario: Correction command records user source

GIVEN an evidence item has an AI classification
WHEN the runtime receives a correction command
THEN the corrected evidence SHALL have `classification.source = user`.

### Requirement: Provider refresh is a runtime command

Provider evidence refresh SHALL run behind the runtime API boundary.
It SHALL create reviewable evidence candidates only and SHALL NOT update conviction, assumption status, or decision trace.

#### Scenario: Provider refresh creates candidates only

GIVEN provider data crosses tracked assumption thresholds
WHEN the runtime refreshes provider evidence
THEN new evidence candidates MAY be returned
AND thesis conviction SHALL remain unchanged
AND no decision trace SHALL be appended.

### Requirement: Runtime payloads expose product vocabulary only

Serialized runtime payloads SHALL use Delphi product vocabulary.
They SHALL NOT expose Neo4j, graph, node, edge, Cypher, OpenBB raw fields, model prompt, token, chain-of-thought, or model private reasoning fields.

#### Scenario: Serialized workspace payload is product-shaped

GIVEN the runtime returns workspace data
WHEN the payload is serialized
THEN it SHALL contain thesis, assumption, evidence, counter-evidence, catalyst, risk, decision, and decision trace concepts
AND SHALL NOT expose implementation vocabulary.
