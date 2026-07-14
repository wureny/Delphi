## ADDED Requirements

### Requirement: Fund context enters through a normalized product contract
The system SHALL represent every demonstrated fund-context input as a schema-valid artifact associated with a stable connector descriptor and an existing Delphi product object.

#### Scenario: Synthetic external evidence is normalized
- **WHEN** a public event source enters the fixture context boundary
- **THEN** its artifact records connector, ownership, classification, point-in-time, version, hash, access, model-policy, and lifecycle fields
- **AND** references the same stable source object used by evidence and proposals

#### Scenario: Synthetic internal context is normalized
- **WHEN** an internal model, research memo, or approved thesis enters the fixture context boundary
- **THEN** it remains visibly customer-owned, access-controlled, read-only, and synthetic
- **AND** no live connector, customer deployment, or external model execution is implied

### Requirement: Context reconstruction is point-in-time and access aware
The system SHALL preserve the observed version, as-of time, content hash, classification, owner, access policy, allowed roles, and policy inheritance required to evaluate whether context was available and authorized.

#### Scenario: Manifest metadata diverges from its source
- **WHEN** an artifact's version, observation time, content hash, classification, or access policy conflicts with the referenced source object
- **THEN** manifest validation fails before the artifact is presented as current

#### Scenario: Internal context allows an unsafe route
- **WHEN** an internal, restricted, or MNPI-like artifact allows external-model access in the current fixture configuration
- **THEN** manifest validation fails closed
- **AND** no external transfer or live execution is reported

### Requirement: Context and graph remain non-canonical
The system MUST treat context artifacts and graph relationships as read-only inputs or derived projections that have no authority to update approved thesis state or the Decision Ledger.

#### Scenario: Context manifest is projected
- **WHEN** the manifest is passed to the deterministic graph port
- **THEN** the canonical domain state remains byte-for-byte unchanged
- **AND** every added relationship resolves through stable Delphi IDs

#### Scenario: Derived reference is unresolved
- **WHEN** a manifest artifact references a missing connector or derived Delphi object
- **THEN** validation fails with a product-safe issue
- **AND** the invalid relationship is not treated as current context

### Requirement: Simulated connectors are truthful
Every current connector SHALL identify itself as fixture-simulated, local-demo, read-only, and non-persistent.

#### Scenario: Evaluator inspects a connector
- **WHEN** a connector appears in the context or graph debug surface
- **THEN** its mode, access, execution location, and fixture status are visible
- **AND** no provider logo, authenticated-account state, or production integration claim is displayed
