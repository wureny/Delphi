# Provider Evidence Ingestion Specification

## Requirements

### Requirement: Provider facts enter the inbox only as evidence candidates

Provider-derived facts SHALL be appended as `new` evidence candidates.
They SHALL NOT be auto-accepted, auto-dismissed, or directly attached to a thesis evidence map.

#### Scenario: Threshold breach creates new candidate

GIVEN provider fundamentals cross a tracked assumption threshold
WHEN Delphi refreshes provider evidence
THEN a new evidence candidate SHALL appear in the Evidence Inbox
AND the user SHALL be able to accept, correct, or dismiss it.

### Requirement: Provider evidence preserves grounding or uncertainty

Each provider-derived investment-relevant candidate SHALL include exactly one of a citation or an uncertainty marker.
Fresh provider data SHALL cite the provider source.
Stale provider data SHALL be marked stale and uncertain.

#### Scenario: Fresh candidate is cited

GIVEN a provider returns fresh fundamentals with provenance
WHEN a threshold-crossing candidate is created
THEN the candidate SHALL include a citation to the provider source
AND SHALL NOT be marked uncertain.

#### Scenario: Stale candidate is uncertain

GIVEN a provider returns stale fundamentals
WHEN a threshold-crossing candidate is created
THEN the candidate SHALL be marked stale and uncertain
AND SHALL NOT be presented as fresh cited evidence.

### Requirement: Missing provider data degrades safely

Unavailable provider responses SHALL NOT create evidence candidates.
Delphi SHALL NOT fabricate metrics, citations, summaries, sources, or assumption impacts from absent provider data.

#### Scenario: Provider unavailable

GIVEN provider fundamentals are unavailable for an asset
WHEN Delphi refreshes provider evidence
THEN no evidence candidate SHALL be created for that missing response
AND the refresh result SHALL report the unavailable provider context.

### Requirement: Provider ingestion never produces investment advice

Provider-derived candidates SHALL NOT contain buy/sell recommendations, price targets, portfolio sizing, or trade timing instructions.
Candidates that contain advice-like language SHALL be rejected before reaching the inbox.

#### Scenario: Advice-like candidate blocked

GIVEN a provider-derived candidate includes advice-like language
WHEN Delphi validates provider evidence
THEN the candidate SHALL be rejected
AND SHALL NOT appear in the inbox.

### Requirement: Provider ingestion does not mutate thesis conviction

Provider refresh SHALL NOT update conviction, assumption status, or decision traces.
Only explicit user actions SHALL attach evidence or record decisions.

#### Scenario: Refresh leaves thesis state unchanged

GIVEN a thesis has existing conviction and decision trace entries
WHEN Delphi refreshes provider evidence
THEN conviction SHALL remain unchanged
AND no decision trace entry SHALL be appended.
