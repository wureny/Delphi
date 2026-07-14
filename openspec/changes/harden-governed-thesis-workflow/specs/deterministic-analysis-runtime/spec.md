## ADDED Requirements

### Requirement: Fixture analysis is the default runnable mode
The system SHALL provide a complete fixture-backed analysis workflow that does not require network access, provider credentials, or external availability.

#### Scenario: Successful fixture run is replayed
- **WHEN** a user starts the successful deterministic run
- **THEN** the runtime emits the schema-valid fixture events in their recorded order
- **AND** emits the same event sequence on every replay

#### Scenario: No live provider is configured
- **WHEN** the product runs without valid live-provider configuration
- **THEN** the complete successful and degraded fixture workflows remain runnable
- **AND** no user-facing control or receipt implies that live inference occurred

### Requirement: Runtime mode is disclosed from actual execution
The system SHALL derive displayed mode, model-route receipts, execution location, external-access claims, and write counts from the selected runtime and current product state.

#### Scenario: Fixture receipt is generated
- **WHEN** a receipt is requested for a fixture run
- **THEN** it identifies fixture mode and synthetic classification
- **AND** accurately reports external web access, cloud transfer, model route, tool names, proposed writes, and approved writes

#### Scenario: Runtime capability is unavailable
- **WHEN** a configured capability cannot be selected or executed safely
- **THEN** the product reports it as unavailable or degraded
- **AND** does not report a successful live execution

### Requirement: Degraded analysis preserves safe partial value
The system SHALL expose source failures explicitly, retain proposals supported by available evidence, and block proposals that require unavailable evidence.

#### Scenario: Required source is unavailable
- **WHEN** the deterministic degraded run encounters an unavailable transcript
- **THEN** the run emits source-unavailable and degraded-mode events with product-safe reasons
- **AND** does not reconstruct or invent the missing source content

#### Scenario: Proposal uses only available evidence
- **WHEN** a degraded run produces a proposal whose evidence remains available and whose policy checks pass
- **THEN** the proposal remains reviewable

#### Scenario: Proposal depends on unavailable evidence
- **WHEN** a degraded proposal cites an unavailable required source
- **THEN** the proposal is visibly blocked from accept and edit
- **AND** can be escalated without creating a canonical transition

### Requirement: Reset restores the complete canonical demo baseline
The system SHALL deterministically restore the current fixture baseline across canonical state, UI review state, degraded simulation state, and run playback state.

#### Scenario: User resets after applying a transition
- **WHEN** a user resets the product after reviews or transitions have been persisted
- **THEN** the approved thesis returns to the current baseline fixture and hash
- **AND** reviews, transitions, degraded flags, and replay progress are cleared

#### Scenario: Browser contains an older persisted fixture version
- **WHEN** the application hydrates persisted demo state created from an incompatible fixture or storage version
- **THEN** it migrates or discards that state safely
- **AND** does not override the current canonical fixture with stale values

### Requirement: Fixtures are contract validated
The system SHALL validate every fixture and expected artifact against runtime schemas before it enters the product workflow.

#### Scenario: Fixture violates its schema
- **WHEN** a fixture has an invalid field, missing reference, incompatible version, or unresolved evidence ID
- **THEN** contract validation fails before the product presents the fixture as runnable

#### Scenario: Expected transition diverges from the approved fixture path
- **WHEN** the accepted fixture proposals do not produce the expected next thesis and ledger transition
- **THEN** the contract test fails with the divergent product objects identified
