# OpenBB Provider Adapter Specification

## Requirements

### Requirement: OpenBB adapter implements the provider boundary

The OpenBB-compatible adapter SHALL implement `FinancialDataProvider`.
It SHALL return Delphi product-shaped provider results, not OpenBB raw response objects.

#### Scenario: Profile normalized

GIVEN the raw OpenBB client returns a company profile
WHEN Delphi requests an asset profile
THEN the adapter SHALL return an `AssetProfile`
AND SHALL preserve provider provenance.

### Requirement: Raw provider details do not leak

OpenBB-specific request names, raw field names, entitlement payloads, or transport errors SHALL NOT leak into UI-facing data, evidence candidates, decision traces, or AI proposal schemas.

#### Scenario: Raw quote response normalized

GIVEN the raw OpenBB client returns quote fields using provider-specific keys
WHEN Delphi requests a price snapshot
THEN the adapter SHALL normalize the fields to `PriceSnapshot`
AND SHALL not expose raw provider field names.

### Requirement: Adapter records provider metadata

Provider results SHALL include request latency, normalized error code when applicable, entitlement state, and provenance timestamps.

#### Scenario: Entitlement denied

GIVEN the raw OpenBB client rejects a request because data access is denied
WHEN Delphi requests the data
THEN the adapter SHALL return an unavailable provider result
AND SHALL mark entitlement as denied
AND SHALL not fabricate data.

### Requirement: Stale provider data is explicit

The adapter SHALL mark data stale when the provider observation timestamp exceeds the configured stale window.

#### Scenario: Old fundamentals

GIVEN the raw OpenBB client returns old fundamentals with a valid observation timestamp
WHEN Delphi normalizes the response
THEN the provider result SHALL have status `stale`
AND SHALL preserve the observation timestamp.

### Requirement: Adapter never generates investment advice

The adapter SHALL NOT generate buy/sell recommendations, price targets, conviction changes, assumption status changes, or decision rationale.

#### Scenario: Quote normalized without advice

GIVEN the raw OpenBB client returns a price quote
WHEN the adapter returns a price snapshot
THEN the result SHALL contain market data only
AND SHALL NOT contain advice-like language.
