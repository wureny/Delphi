# Proposal: Add Provider Evidence Ingestion

## Why

Delphi already has a financial data provider boundary and a workspace service/repository boundary, but provider facts do not yet flow into the user's evidence workflow.
The next production slice should turn normalized provider facts into reviewable evidence candidates while preserving Delphi's product rules: source grounding, uncertainty on stale or missing data, no advice, no automatic conviction changes, and user correction before durable attachment.

This creates a practical seam for a future OpenBB adapter without adding network dependencies or provider-specific UI.

## Scope

* Add a provider ingestion service that reads normalized financial data through `FinancialDataProvider`.
* Map threshold-crossing fundamentals into new evidence candidates.
* Preserve stale/unavailable provider states as uncertainty or partial context.
* Add repository support for appending provider-generated evidence candidates.
* Surface provider candidates in the Evidence Inbox and keep user accept/correct/dismiss flow unchanged.
* Add unit, integration, and eval coverage for grounding, stale data, unavailable data, advice refusal, and no auto-conviction changes.

## Out of Scope

* Real OpenBB API integration
* Real-time market ingestion
* Neo4j/context graph persistence
* External LLM classification
* Portfolio sizing, trade recommendations, price targets, or automatic conviction updates
