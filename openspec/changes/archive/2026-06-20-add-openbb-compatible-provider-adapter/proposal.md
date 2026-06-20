# Proposal: Add OpenBB-Compatible Provider Adapter

## Why

Delphi now has a financial data provider boundary and a fixture-backed evidence ingestion path.
The next step is to define and test the replaceable adapter layer that can later call OpenBB without leaking OpenBB request/response shapes into thesis, evidence, decision trace, or UI code.

This change creates an OpenBB-compatible provider adapter with an injected raw client.
It does not add a network dependency or live market-data calls yet.

## Scope

* Add provider metadata for entitlement state, latency, and normalized error codes.
* Add an `OpenBBFinancialDataProvider` that implements `FinancialDataProvider`.
* Define a minimal raw OpenBB client port for profile, quote, fundamentals, events, and search.
* Normalize raw client responses into Delphi asset profile, price snapshot, fundamental snapshot, and market event objects.
* Map entitlement failures, timeouts, unavailable data, and malformed responses to safe `ProviderResult` values.
* Add parity tests against fixture-like OpenBB raw responses.
* Add evals that enforce no advice leakage, no raw provider shape leakage, and safe degradation.

## Out of Scope

* Installing or importing OpenBB packages
* Real OpenBB credentials or network calls
* Server-side secret management
* UI changes
* Neo4j/context graph persistence
* External LLM calls
