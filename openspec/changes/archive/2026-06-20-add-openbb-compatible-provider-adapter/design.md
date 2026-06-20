# Design: OpenBB-Compatible Provider Adapter

## Architecture

The adapter has two layers:

```text
OpenBB raw client port
  -> OpenBBFinancialDataProvider
  -> FinancialDataProvider normalized results
  -> existing provider evidence ingestion service
```

The raw client port is dependency-injected so tests can use deterministic fixtures and production can later provide a network-backed OpenBB implementation.

## Provider Metadata

`ProviderResult` will carry optional metadata:

* `latencyMs`: elapsed time for the provider request.
* `errorCode`: normalized provider error code.
* `entitlement`: whether data access was allowed, denied, or unknown.

These fields are provider-boundary metadata, not investment claims.
UI and thesis services should not depend on OpenBB-specific names.

## Normalization

The adapter accepts raw records with provider-shaped field variants and maps them into Delphi objects:

* profile -> `AssetProfile`
* quote -> `PriceSnapshot`
* fundamentals -> `FundamentalSnapshot`
* events -> `MarketEvent[]`
* search -> `AssetProfile[]`

Malformed or incomplete raw responses degrade to `unavailable`.
The adapter must never fabricate missing values.

## Freshness

The adapter compares provider observation timestamps with a configurable stale window.
Old but valid data returns `status: "stale"` and keeps provenance timestamps.

## Error Handling

Known error classes:

* `entitlement_denied`
* `timeout`
* `rate_limited`
* `not_found`
* `malformed_response`
* `provider_unavailable`
* `unknown`

Failures return `data: null`, a safe message, normalized error metadata, and OpenBB provenance.

## Safety

The adapter does not generate evidence, conviction, advice, or decision rationale.
It only returns structured provider context.
Existing ingestion logic decides whether facts become evidence candidates.
