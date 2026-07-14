## ADDED Requirements

### Requirement: Evaluators can inspect the complete context boundary
The system SHALL provide an internal product surface that makes the synthetic fund-context pipeline, governance metadata, and derived graph path understandable without private explanation.

#### Scenario: Context boundary page loads
- **WHEN** an evaluator opens `/debug/context`
- **THEN** the page shows the synthetic/read-only disclosure, connector and artifact summary, pipeline stages, and context inventory
- **AND** renders without a framework error or horizontal page overflow

#### Scenario: Internal working context is filtered
- **WHEN** the evaluator filters for internal working context
- **THEN** the internal financial model and research memo remain visible
- **AND** external event evidence and approved state are excluded

#### Scenario: Internal memo is selected
- **WHEN** the evaluator selects the synthetic internal research memo
- **THEN** the page displays its stable object reference, connector, owner, classification, access policy, allowed roles, point-in-time metadata, model restriction, lifecycle state, and derived references
- **AND** identifies external-model access as blocked

### Requirement: Context inspection links to graph provenance
The internal context surface SHALL provide a working path to the graph debug surface, where context connectors and relationships remain searchable and inspectable.

#### Scenario: Evaluator follows the graph path
- **WHEN** the evaluator opens graph projection from the context surface and searches for the internal memo
- **THEN** the memo source node is present
- **AND** its relationships include a simulated connector context edge and at least one derived context relationship

### Requirement: Main investment workflow remains unchanged
The context debug feature SHALL not add ingestion administration to the analyst's core review path or alter deterministic workflow outcomes.

#### Scenario: Existing successful, degraded, and reset paths run
- **WHEN** the release verification suite is executed after this feature is added
- **THEN** the existing governed workflows retain their prior authorization, transition, degradation, and reset behavior
- **AND** no context artifact becomes a canonical write source
