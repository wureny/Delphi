# Design

## Data Layers

Delphi separates financial context from thesis evidence.

* `MarketData`: price, volume, returns, market cap, and timestamped snapshots. This is context, not advice.
* `FundamentalData`: reported or derived company metrics such as revenue growth, gross margin, free cash flow margin, or net revenue retention.
* `EventData`: earnings, filing dates, investor days, product launches, or other catalysts.
* `ResearchEvidence`: source-backed user or ingestion inputs that can support, contradict, or update a thesis.
* `DerivedEvidence`: deterministic or AI-generated proposals derived from source-backed data and validated before display.
* `DecisionTrace`: human-authored decisions and rationale, never overwritten by provider data.

## Provider Boundary

`FinancialDataProvider` is a product-shaped interface.
It returns typed Delphi data and hides provider-specific APIs.

OpenBB's current Platform SDK exposes calls such as:

* `obb.equity.profile(symbol='AAPL', provider='fmp')`
* `obb.equity.price.historical(symbol='AAPL', provider='fmp')`

Future OpenBB adapters should map those outputs into Delphi types.
They must not leak provider response shapes into UI or AI prompts.

## Evidence Proposal Rules

Provider data becomes an evidence proposal only when it crosses a tracked assumption threshold or is explicitly linked to a catalyst.

Examples:

* Price moved down 5% today: market context only.
* Gross margin fell below an assumption threshold: counter-evidence proposal.
* Earnings date is next week: catalyst/event context.
* Provider data unavailable: partial/error state, not a fabricated observation.

## Guardrails

* Provider output must not generate buy/sell recommendations or price targets.
* Provider output must not change conviction, assumption status, or decision trace directly.
* Provider timestamps must be preserved; stale data must be labelled.
* Evidence proposals must cite the provider source or be marked uncertain.
* Missing data must be represented as unavailable/partial, not hallucinated.

## Implementation Shape

This change adds:

* `src/domain/financialData.ts` for provider and financial data contracts.
* `src/data/mockFinancialDataProvider.ts` for deterministic test data.
* `src/domain/researchContext.ts` for rules that convert provider facts to context or evidence proposals.
* Tests and evals covering stale data, price-only context, metric-threshold evidence, missing data, and no-advice leakage.
