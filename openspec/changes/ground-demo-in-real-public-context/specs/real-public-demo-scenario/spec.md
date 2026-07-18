## ADDED Requirements

### Requirement: The default success scenario uses a frozen real public earnings event
The system SHALL present Microsoft FY2025 Q4 as the default successful Earnings-to-Thesis scenario using normalized facts and citations from official Microsoft Investor Relations and SEC sources.

#### Scenario: Evaluator opens the default inbox
- **WHEN** the evaluator starts from a reset demo
- **THEN** the primary actionable case is MSFT FY2025 Q4
- **AND** the case visibly identifies the company/event evidence as real public data and the run as deterministic fixture execution

#### Scenario: Evaluator opens official evidence
- **WHEN** a cited release, filing, financial statement, outlook item, slide, or earnings-call excerpt is inspected
- **THEN** the evidence shows publisher, canonical URI, published/observed/retrieved times, locator, origin, and content hash
- **AND** the complete source is reachable through the official publisher link when it remains available

### Requirement: Pre-event state is point-in-time correct
The system MUST construct the pre-event thesis and forecast only from sources available before the official FY2025 Q4 release cutoff.

#### Scenario: Later information is referenced by the pre-event thesis
- **WHEN** a derived thesis field references a source published or observed after the event cutoff
- **THEN** fixture validation fails
- **AND** the invalid thesis cannot be loaded as approved pre-event state

#### Scenario: Annual filing corroborates an event finding
- **WHEN** the FY2025 10-K is used after the event
- **THEN** it may corroborate an event finding or ledger record
- **AND** it is excluded from the pre-event context set

### Requirement: Real sources and demo-authored views are not conflated
The system SHALL distinguish real public evidence from demo-derived thesis, forecast, findings, and proposals in every primary workflow surface.

#### Scenario: Evaluator inspects the approved thesis
- **WHEN** the MSFT pre-event thesis is displayed
- **THEN** it is labeled as authored by the Delphi Demo Team and derived from cited public sources
- **AND** no real fund, Microsoft, CalPERS, or other institution is represented as having approved it

#### Scenario: Public institutional context is attached
- **WHEN** a CalPERS policy or Form 13F artifact is added to the case
- **THEN** it is labeled as a real public institutional reference
- **AND** the system states that a disclosed holding does not establish a private thesis, recommendation, endorsement, or active-management decision

### Requirement: The real-data run remains deterministic and governed
The system SHALL replay a fixed MSFT analysis result, validate every proposed patch and citation, require human review, and write canonical thesis state only through the existing transition gateway.

#### Scenario: Approved MSFT proposals are applied
- **WHEN** an authorized reviewer accepts or edits valid proposals and applies the approved batch
- **THEN** exactly one meaningful thesis version and Decision Ledger transition are created
- **AND** the transition records the context-set hash, used evidence, origin labels, reviews, exclusions, and deterministic runtime mode

#### Scenario: Evaluator mistakes real data for live AI
- **WHEN** run mode, trust, or provenance is inspected
- **THEN** the product states that inputs are real public snapshots but analysis output is deterministic fixture replay
- **AND** no live model or current-data claim is displayed

### Requirement: The synthetic degraded scenario remains available
The system SHALL retain ARCT as a visibly synthetic controlled failure scenario for unavailable-evidence and fail-closed behavior.

#### Scenario: Evaluator opens the degraded scenario
- **WHEN** the ARCT degraded run is selected
- **THEN** synthetic labels remain visible
- **AND** the prior blocked-evidence, safe-partial-output, escalation, reset, and authorization behavior is preserved
