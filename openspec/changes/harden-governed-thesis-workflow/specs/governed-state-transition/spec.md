## ADDED Requirements

### Requirement: Approved state changes are semantic
The system SHALL apply a thesis transition only when the resulting governed domain state differs meaningfully from the current approved state, excluding version and recording metadata.

#### Scenario: Direct replacement repeats the current value
- **WHEN** a proposed or human-edited patch replaces a governed field with its current value
- **THEN** the system rejects the patch as a semantic no-op before recording an approval
- **AND** the approved thesis, version, and transition history remain unchanged

#### Scenario: Approved batch has no net effect
- **WHEN** individually valid operations in an approved batch produce a final governed state equal to the current approved state
- **THEN** the system rejects the entire batch atomically
- **AND** it records no new thesis version or state transition

#### Scenario: Approved batch changes governed state
- **WHEN** at least one authorized and validated operation changes the governed domain state
- **THEN** the system may create a new approved thesis version
- **AND** the ledger structural diff contains at least one governed field addition, removal, or value change

### Requirement: Review and application remain separate
The system SHALL record human review decisions separately from canonical state application, and only approved accept or edit decisions SHALL be eligible for application.

#### Scenario: Proposal is accepted
- **WHEN** an authorized reviewer accepts a valid current-version proposal
- **THEN** the system records an approved review attributed to that reviewer
- **AND** the canonical thesis remains unchanged until the reviewer applies approved changes

#### Scenario: Proposal is edited
- **WHEN** an authorized reviewer submits a valid human-edited patch
- **THEN** the system records the edited patch separately from the original proposal
- **AND** application uses the human-edited patch

#### Scenario: Non-mutating review action is recorded
- **WHEN** a reviewer rejects, escalates, or defers a proposal with the required reason, target, or date
- **THEN** the system records the action in review history
- **AND** the action is excluded from canonical state application

### Requirement: Authorization and evidence fail closed
The system SHALL prevent a canonical write when reviewer authority, proposal version, evidence availability, citation validity, or semantic patch validation does not satisfy policy.

#### Scenario: Reviewer lacks required authority
- **WHEN** a reviewer attempts to accept or edit a proposal above their authorized materiality or required role
- **THEN** the system denies the action with a product-safe reason
- **AND** offers only policy-permitted non-mutating alternatives

#### Scenario: Required evidence is unavailable
- **WHEN** a proposal depends on evidence marked unavailable
- **THEN** accept and edit are blocked for every role
- **AND** escalation remains available without changing canonical state

#### Scenario: Proposal targets a stale thesis version
- **WHEN** a proposal references a thesis version other than the currently approved version
- **THEN** approval and application are rejected
- **AND** the user is instructed to re-run analysis against the current state

### Requirement: Application is atomic and exactly versioned
The system SHALL apply all eligible proposals in a requested batch atomically and SHALL increment the approved thesis version exactly once after all validation passes.

#### Scenario: Multi-proposal batch succeeds
- **WHEN** multiple approved proposals are current, authorized, and semantically valid
- **THEN** the system applies their patches as one transition
- **AND** increments the thesis version by exactly one
- **AND** excludes rejected, escalated, deferred, blocked, or superseded proposals

#### Scenario: One patch in the batch fails
- **WHEN** any patch in an approved batch fails validation or application
- **THEN** the entire batch is rejected
- **AND** no partial domain mutation, version increment, or transition is recorded

#### Scenario: Applied proposal is submitted again
- **WHEN** a reviewer attempts to approve a proposal already included in an applied transition
- **THEN** the system treats the duplicate action as an idempotent no-op
- **AND** creates no additional review, version, or transition

### Requirement: Every transition is auditable and reversible
The system SHALL record sufficient product-shaped provenance to explain and safely reverse an applied thesis transition without exposing provider internals or hidden reasoning.

#### Scenario: Transition is recorded
- **WHEN** an approved batch is applied
- **THEN** the transition records from-version, to-version, proposal IDs, review IDs, run ID, source event IDs, evidence references, approving user, workflow version, before hash, and after hash
- **AND** the ledger displays the exact governed structural diff and excluded review actions

#### Scenario: Latest transition is rolled back
- **WHEN** an authorized user rolls back the most recent reversible transition and its before-state snapshot is available
- **THEN** the system restores the prior approved thesis
- **AND** marks the transition rolled back without deleting its audit record

#### Scenario: Non-latest transition is selected for rollback
- **WHEN** a user attempts to roll back a transition that is not the latest applied transition
- **THEN** the system rejects the rollback without changing state
