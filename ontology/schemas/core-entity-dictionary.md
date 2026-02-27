# Core Entity Dictionary (v0.4)

This dictionary defines the current executable ontology entities for Polymarket in Delphi.

## Modeling principles
1. This ontology is not a mirror of raw database tables or API payloads.
2. The main purpose is to make existence, parent-child relations, state, evidence, and market-formation mechanics easier for agents to reason about.
3. Some fields are intentionally explicit or denormalized for reasoning, such as `market_ids`, `outcome_ids`, `binary_side`, `complement_outcome_id`, and `display_price_source`.
4. The current scope is limited to `crypto` and `finance` categories.
5. The model follows official Polymarket concepts where `Event` groups one or more `Market` objects and `Market` is the tradable unit.
6. The ontology separates semantic entities from microstructure snapshots and from derived reliability signals.

## Event
Semantic container for one or more related tradable markets.
- `id` (string): unique event identifier.
- `title` (string): event title.
- `slug` (string): canonical event slug.
- `category` (string): normalized category. Current allowed values: `crypto`, `finance`.
- `sub_category` (string|null): optional normalized sub-category.
- `start_time` (string, date-time, UTC): event observation start.
- `end_time` (string, date-time, UTC): event observation end.
- `status` (string): `open`, `closed`, `resolved`.
- `market_ids` (string[]): explicit references to child markets.
- `source_id` (string): reference to Source.

## Market
Fundamental tradable proposition aligned with Polymarket market concepts.
- `id` (string): unique market identifier.
- `event_id` (string): parent event id.
- `question` (string): market question.
- `slug` (string): canonical market slug.
- `market_type` (string): currently `binary`.
- `condition_id` (string): stable Polymarket/Gamma condition identifier.
- `question_id` (string): stable question identifier from source data.
- `description` (string): optional market description.
- `close_time` (string, date-time, UTC): market close time.
- `trading_state` (string): `active`, `inactive`, `closed`, `resolved`, `archived`.
- `outcome_ids` (string[]): explicit references to the exactly-two binary outcomes.
- `orderbook_enabled` (boolean): whether order book trading is enabled.
- `source_id` (string): reference to Source.

## Outcome
Binary answer option under a market.
- `id` (string): unique outcome identifier.
- `market_id` (string): parent market id.
- `label` (string): raw or canonical outcome label.
- `binary_side` (string): normalized binary side, either `yes` or `no`.
- `token_id` (string): tradable token identifier.
- `complement_outcome_id` (string): explicit reference to the paired opposite outcome.
- `current_probability` (number, 0-1): latest implied probability from mapped market metadata.

## PricePoint
Time-series quote for an outcome.
- `id` (string): unique price point identifier.
- `outcome_id` (string): parent outcome id.
- `timestamp` (string, date-time, UTC): quote time.
- `probability` (number, 0-1): probability at this timestamp.
- `price` (number): quoted price at this timestamp.
- `source_id` (string): reference to Source.

## OrderBookSnapshot
Aggregated order book state for an outcome token at a point in time.
- `id` (string): unique snapshot identifier.
- `market_id` (string): parent market id.
- `outcome_id` (string): parent outcome id.
- `timestamp` (string, date-time, UTC): snapshot time.
- `best_bid` (number|null): best bid price.
- `best_ask` (number|null): best ask price.
- `spread` (number|null): best ask minus best bid.
- `midpoint` (number|null): midpoint of best bid and ask.
- `bid_depth_top_n` (number): total bid size across the stored levels.
- `ask_depth_top_n` (number): total ask size across the stored levels.
- `tick_size` (number): current minimum tick size.
- `bid_levels` (OrderBookLevel[]): aggregated book levels.
- `ask_levels` (OrderBookLevel[]): aggregated book levels.
- `source_id` (string): reference to Source.

## OrderBookLevel
One aggregated level inside an order book snapshot.
- `price` (number): level price.
- `size` (number): resting size at that level.

## TradePrint
Executed trade event for an outcome token.
- `id` (string): unique trade print identifier.
- `market_id` (string): parent market id.
- `outcome_id` (string): parent outcome id.
- `timestamp` (string, date-time, UTC): trade time.
- `price` (number): execution price.
- `size` (number): execution size.
- `side` (string): aggressor side, `buy` or `sell`.
- `fee_rate_bps` (number): fee rate in basis points.
- `source_id` (string): reference to Source.

## LiquiditySnapshot
Market-level liquidity and volume snapshot.
- `id` (string): unique liquidity snapshot identifier.
- `market_id` (string): parent market id.
- `timestamp` (string, date-time, UTC): snapshot time.
- `liquidity_usd` (number): available liquidity in USD terms.
- `volume_24h_usd` (number): 24h volume in USD terms.

## Source
Ingestion provenance for ontology facts.
- `id` (string): unique source identifier.
- `name` (string): source name.
- `type` (string): `api`, `stream`, `manual`, `derived`.
- `uri` (string): endpoint, data stream, or algorithm identifier.
- `ingested_at` (string, date-time, UTC): ingestion timestamp.

## NewsSignal
External evidence signal attached to an event and optionally scoped to a specific market.
- `id` (string): unique signal identifier.
- `event_id` (string): related event id.
- `market_id` (string|null): optional related market id.
- `timestamp` (string, date-time, UTC): signal time.
- `headline` (string): signal title.
- `url` (string): source URL.
- `sentiment_score` (number, -1 to 1): coarse sentiment score.
- `source_id` (string): reference to Source.

## ResolutionState
Settlement state of a single market.
- `id` (string): unique resolution state identifier.
- `market_id` (string): resolved or unresolved market id.
- `resolved` (boolean): whether settlement is complete.
- `resolution_time` (string, date-time, UTC): resolution timestamp or expected resolution time.
- `winning_outcome_id` (string|null): winning outcome id if known.
- `resolution_notes` (string): normalized settlement note.
- `evidence` (string): resolution evidence notes or source summary.

## MarketMicrostructureState
Derived state summarizing whether observed market prices are reliable for downstream reasoning.
- `id` (string): unique derived-state identifier.
- `market_id` (string): parent market id.
- `outcome_id` (string): analyzed outcome id.
- `timestamp` (string, date-time, UTC): analysis time.
- `displayed_probability` (number, 0-1): probability closest to what the platform would display or what the current top-of-book implies.
- `display_price_source` (string): where the displayed probability came from, e.g. `midpoint`, `last_trade`, or `derived`.
- `robust_probability` (number, 0-1): a manipulation-resistant estimate derived from depth, spread, and trades.
- `book_reliability_score` (number, 0-1): confidence that the current book reflects actionable consensus.
- `manipulation_risk_score` (number, 0-1): heuristic risk score for shallow-book distortion or adversarial behavior.
- `depth_imbalance` (number, -1 to 1): normalized imbalance between bid depth and ask depth.
- `quote_trade_divergence` (number, 0-1): discrepancy between quote-derived and trade-derived pricing.
- `explanatory_tags` (string[]): human/agent-readable reasons such as `wide_spread`, `shallow_book`, `trade_confirmed`, `spoof_like_churn`.
- `source_id` (string): reference to Source.
