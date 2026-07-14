## ADDED Requirements

### Requirement: Public claims match runnable product behavior
The public product surface SHALL distinguish current capabilities from planned architecture and SHALL disclose synthetic data and fixture execution wherever omission could mislead a visitor.

#### Scenario: Visitor reads the product overview
- **WHEN** the public page describes analysis, privacy, graph, deployment, or model behavior
- **THEN** current fixture-backed behavior is stated as current
- **AND** unavailable live or enterprise capabilities are described only as planned or configurable architecture

#### Scenario: Visitor enters the interactive product
- **WHEN** a visitor follows the primary product action
- **THEN** the destination opens the runnable Change Inbox workflow
- **AND** the product continues to display synthetic-data and fixture-mode disclosure

### Requirement: Public actions are reachable and non-placeholder
Every rendered primary or contact action SHALL resolve to an available internal route or a valid configured external destination.

#### Scenario: Real contact destination is configured
- **WHEN** a valid contact destination is present in public configuration
- **THEN** the public page renders a working contact action using that destination

#### Scenario: Contact destination is absent or reserved
- **WHEN** contact configuration is missing, malformed, or uses a reserved example domain
- **THEN** the product does not render it as a reachable contact action
- **AND** retains a working primary action into the interactive product

#### Scenario: Internal product route changes
- **WHEN** a public action targets an internal product route
- **THEN** automated navigation coverage verifies that the route resolves without a not-found or disabled terminal state

### Requirement: The representative workflow is self-explanatory
The public entry and interactive product SHALL make the representative workflow understandable without requiring private documentation or verbal correction.

#### Scenario: First-time visitor follows the successful path
- **WHEN** a first-time visitor opens the product, inspects a proposal and evidence, records permitted review actions, and applies approved changes
- **THEN** the interface explains what changed, how it compares with the approved view, why it matters, what remains uncertain, and who authorized the resulting state
- **AND** the resulting ledger shows a meaningful structural thesis diff

#### Scenario: First-time visitor follows the degraded path
- **WHEN** a first-time visitor opens the degraded scenario
- **THEN** the interface identifies the missing source, retained safe output, blocked action, and allowed escalation
- **AND** no canonical change is implied or recorded

### Requirement: Public and product surfaces pass release checks
The system SHALL verify the public entry, successful workflow, degraded workflow, reset, trust receipt, and responsive rendering before the change is considered complete.

#### Scenario: Release verification runs
- **WHEN** the full release verification is executed
- **THEN** unit and fixture-contract tests, end-to-end tests, typecheck, lint, and production build pass
- **AND** the public and product routes contain no reserved contact destination or contradictory capability claim

#### Scenario: Narrow mobile viewport is used
- **WHEN** the public page and core review path render at the supported mobile viewport
- **THEN** primary actions, disclosures, evidence access, and review status remain visible and operable without horizontal page overflow
