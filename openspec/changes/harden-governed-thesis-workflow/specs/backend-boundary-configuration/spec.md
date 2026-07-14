## ADDED Requirements

### Requirement: Runtime composition uses typed fail-closed configuration
The system SHALL resolve analysis and graph capabilities through a typed composition boundary with fixture-safe defaults.

#### Scenario: Configuration selects fixture analysis
- **WHEN** runtime configuration selects fixture analysis or omits an optional live provider
- **THEN** composition returns the deterministic fixture adapter
- **AND** reports fixture as the actual selected analysis capability

#### Scenario: Live-provider configuration is incomplete
- **WHEN** live mode is requested without every required server-side setting
- **THEN** configuration validation fails closed with a product-safe unavailable result
- **AND** no provider request is attempted

#### Scenario: Configuration contains an unknown mode
- **WHEN** configuration contains an unsupported provider or graph mode
- **THEN** composition rejects the configuration deterministically
- **AND** does not guess a provider or expose a misleading control

### Requirement: Provider secrets remain server owned
The system MUST prevent provider credentials, raw environment values, and vendor-specific error payloads from entering client bundles, product receipts, logs intended for users, or canonical domain state.

#### Scenario: Capability descriptor is serialized
- **WHEN** runtime capability status is sent to the product UI
- **THEN** it contains only product-shaped mode, availability, and safe reason fields
- **AND** contains no secret, endpoint credential, raw SDK object, or stack trace

#### Scenario: Provider returns an internal error
- **WHEN** a future provider adapter returns a vendor-specific failure
- **THEN** the runtime maps it to a normalized product-safe error or degraded reason
- **AND** preserves the raw failure only inside an authorized server boundary if needed for diagnostics

### Requirement: Analysis adapters share one product contract
Every analysis adapter SHALL emit schema-valid product run events and proposals through the same runtime contract, and SHALL have no direct authority to update approved thesis state.

#### Scenario: Adapter produces a proposal
- **WHEN** a fixture or future live adapter produces analysis output
- **THEN** the output passes schema, evidence, numeric, reference, version, policy, and semantic patch validation before review
- **AND** remains a proposal until a human-authorized gateway transition applies it

#### Scenario: Adapter attempts a canonical write
- **WHEN** adapter output includes or requests a direct mutation outside the proposal contract
- **THEN** the runtime rejects the mutation
- **AND** approved thesis state remains unchanged

### Requirement: Graph data is a read-only product projection
The system SHALL treat graph nodes and relationships as a derived projection of canonical thesis, evidence, event, proposal, review, and transition objects using stable product IDs.

#### Scenario: Graph projection is created without a database
- **WHEN** canonical fixture objects are projected through the graph port
- **THEN** the result contains deterministic product-shaped nodes, typed relationships, and provenance references
- **AND** requires no graph database or vendor SDK

#### Scenario: Graph persistence is unavailable
- **WHEN** no graph adapter is configured
- **THEN** the canonical thesis workflow remains fully functional
- **AND** graph capability is reported as unavailable or projection-only

#### Scenario: Graph representation conflicts with canonical state
- **WHEN** a graph adapter returns data that conflicts with the approved thesis version or stable product IDs
- **THEN** the projection is rejected or marked stale
- **AND** it cannot overwrite canonical state

### Requirement: Backend capability reporting is truthful
The system SHALL report only capabilities that the current composition can execute and SHALL distinguish fixture, projection-only, configured-live, degraded, and unavailable states.

#### Scenario: Public runtime has no external backend
- **WHEN** the product is composed with fixture analysis and no graph persistence
- **THEN** capability reporting identifies fixture analysis and projection-only or unavailable graph support
- **AND** avoids language implying live provider or database execution

#### Scenario: Capability status changes in a future deployment
- **WHEN** a valid adapter is later enabled behind the existing port
- **THEN** the product may report the new capability without changing canonical domain, review, or UI-facing runtime contracts
