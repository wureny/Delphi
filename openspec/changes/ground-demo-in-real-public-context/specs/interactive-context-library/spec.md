## ADDED Requirements

### Requirement: Evaluators can manage a case context set
The system SHALL provide a product-facing Context Library where an evaluator can inspect, add, and remove context without modifying approved thesis state.

#### Scenario: Context Library loads
- **WHEN** the evaluator opens `/context`
- **THEN** the page shows the active case context set, curated source catalog, origin/role filters, provenance inspector, and Add context action
- **AND** the current real-public, demo-derived, synthetic, and local counts are visible

#### Scenario: Curated public context is added
- **WHEN** the evaluator previews an available catalog artifact, assigns its role and case, and confirms
- **THEN** a validated case-context binding is created and persisted in demo state
- **AND** the approved thesis version and Decision Ledger remain unchanged

#### Scenario: Context is removed
- **WHEN** the evaluator removes a non-canonical context binding
- **THEN** it disappears from the active context set and future run-input preview
- **AND** historical ledger transitions retain their recorded context-set hash and evidence lineage

### Requirement: Context addition exposes provenance and policy before confirmation
The system SHALL show the evaluator what will be added, how it is classified, when it was available, who published or supplied it, and whether it may be used or transferred.

#### Scenario: Public artifact is previewed
- **WHEN** an official source is selected from the catalog
- **THEN** the preview shows canonical URI, publisher, origin, dates, hash, rights note, context role, classification, and input eligibility
- **AND** any institution-specific non-endorsement disclosure is visible before confirmation

#### Scenario: Point-in-time assignment is invalid
- **WHEN** an artifact is assigned to a pre-event context set with an as-of or observation time after the cutoff
- **THEN** confirmation fails with a product-safe point-in-time explanation
- **AND** no binding is created

### Requirement: Local file import is real, private, and limited
The system SHALL parse supported files in the browser, preview normalized content, and attach confirmed imports as local-only context without claiming automated analysis.

#### Scenario: Supported local file is imported
- **WHEN** the evaluator selects a text-based PDF, CSV, JSON, TXT, or Markdown file within the size limit
- **THEN** parsing, hashing, and preview occur locally
- **AND** the confirmed artifact is marked `user_provided_local`, external transfer blocked, and excluded from deterministic proposal generation

#### Scenario: Unsupported or unreadable file is selected
- **WHEN** the file is encrypted, image-only, oversized, malformed, or an unsupported type
- **THEN** the importer reports the specific limitation without adding partial context
- **AND** existing case, thesis, reviews, and ledger state remain unchanged

#### Scenario: Demo state is reset
- **WHEN** the evaluator activates Reset demo
- **THEN** all local imports and mutable context bindings are removed
- **AND** the curated MSFT baseline and synthetic ARCT degraded fixture return to their canonical initial state

### Requirement: Context usage is inspectable throughout the workflow
The system SHALL expose which context inputs were eligible, used, excluded, or unavailable in the case, run, trust, evidence, and ledger surfaces.

#### Scenario: Run input usage is inspected
- **WHEN** the evaluator opens the MSFT Run Observatory input view
- **THEN** each context artifact shows its usage state and reason
- **AND** local imports excluded from analysis are not presented as supporting a finding or proposal

#### Scenario: Applied transition is inspected
- **WHEN** the evaluator opens the resulting Decision Ledger transition
- **THEN** the immutable context-set hash and used evidence references are visible
- **AND** later context additions or removals do not rewrite that historical record
