# Financial Data Boundaries Specification

## ADDED Requirements

### Requirement: Financial providers supply context, not advice

Financial data providers SHALL return structured market, fundamental, event, and asset profile data.
Provider outputs SHALL NOT directly generate buy/sell recommendations, price targets, conviction scores, assumption status changes, or decision rationale.

#### Scenario: Price movement without thesis threshold

GIVEN a provider reports a price or volume movement
AND no tracked assumption threshold is crossed
WHEN Delphi evaluates the provider output
THEN the output SHALL be represented as market context only
AND SHALL NOT create thesis evidence or change conviction.

### Requirement: Provider facts become evidence only through explicit rules

Provider facts MAY become evidence proposals only when they are source-backed and cross a tracked assumption threshold or are explicitly linked to a catalyst/event.

#### Scenario: Fundamental metric crosses assumption threshold

GIVEN a thesis assumption tracks gross margin above 70%
AND provider data reports gross margin below 70%
WHEN Delphi evaluates the metric
THEN it SHALL create a counter-evidence proposal
AND the proposal SHALL cite the provider source or be marked uncertain
AND the proposal SHALL remain a proposal until accepted or corrected by the user.

### Requirement: Provider timestamps and freshness are preserved

Provider responses SHALL preserve observation timestamps and provider timestamps.
Stale provider data SHALL be labelled stale and SHALL NOT be presented as fresh evidence.

#### Scenario: Stale provider data

GIVEN provider data is older than the configured freshness window
WHEN Delphi evaluates the data
THEN the output SHALL be labelled stale
AND any derived evidence proposal SHALL be uncertain unless the user explicitly accepts it.

### Requirement: Missing provider data degrades safely

Missing or unavailable provider data SHALL render as unavailable or partial context.
The system SHALL NOT fabricate market data, fundamentals, sources, or citations.

#### Scenario: Provider returns unavailable data

GIVEN a provider cannot return fundamentals for an asset
WHEN Delphi evaluates the asset context
THEN it SHALL return an unavailable state
AND SHALL NOT create evidence or summary claims from absent data.

### Requirement: OpenBB integration remains behind provider boundary

OpenBB SHALL be treated as an implementation of the `FinancialDataProvider` boundary.
OpenBB-specific request/response shapes SHALL NOT leak into UI components, decision traces, or AI proposal schemas.

#### Scenario: Future OpenBB adapter returns profile data

GIVEN an OpenBB adapter retrieves equity profile data
WHEN the data enters Delphi
THEN it SHALL be normalized to Delphi asset profile fields
AND SHALL preserve provider name and timestamp for provenance.
