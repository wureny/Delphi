# Core Entity Dictionary (v0.1)

This dictionary defines the minimum executable ontology entities for Polymarket in Delphi.

## Event
- `id` (string): unique event identifier.
- `title` (string): event title.
- `category` (string): taxonomy category (for example Politics, Crypto).
- `start_time` (string, date-time, UTC): event observation start.
- `end_time` (string, date-time, UTC): event observation end.
- `status` (string): open, closed, resolved.
- `resolution_state_id` (string): reference to ResolutionState.
- `source_id` (string): reference to Source.

## Market
- `id` (string): unique market identifier.
- `event_id` (string): parent event id.
- `question` (string): market question.
- `description` (string): optional market description.
- `close_time` (string, date-time, UTC): market close time.
- `status` (string): open, closed, resolved.
- `outcome_ids` (string[]): references to outcomes.
- `source_id` (string): reference to Source.

## Outcome
- `id` (string): unique outcome identifier.
- `market_id` (string): parent market id.
- `label` (string): outcome label (Yes/No or custom).
- `token_id` (string): on-chain token identifier.
- `current_probability` (number, 0-1): latest implied probability.

## PricePoint
- `id` (string): unique price point identifier.
- `outcome_id` (string): parent outcome id.
- `timestamp` (string, date-time, UTC): quote time.
- `probability` (number, 0-1): probability at this timestamp.
- `price` (number): quoted price at this timestamp.
- `source_id` (string): reference to Source.

## LiquiditySnapshot
- `id` (string): unique liquidity snapshot identifier.
- `market_id` (string): parent market id.
- `timestamp` (string, date-time, UTC): snapshot time.
- `liquidity_usd` (number): available liquidity (USD).
- `volume_24h_usd` (number): 24h volume (USD).

## Source
- `id` (string): unique source identifier.
- `name` (string): source name.
- `type` (string): api, stream, manual.
- `uri` (string): endpoint or source locator.
- `ingested_at` (string, date-time, UTC): ingestion timestamp.

## NewsSignal
- `id` (string): unique signal identifier.
- `event_id` (string): related event id.
- `timestamp` (string, date-time, UTC): signal time.
- `headline` (string): signal title.
- `url` (string): source URL.
- `sentiment_score` (number, -1 to 1): coarse sentiment score.
- `source_id` (string): reference to Source.

## ResolutionState
- `id` (string): unique resolution state identifier.
- `event_id` (string): event id.
- `resolved` (boolean): if resolution completed.
- `resolution_time` (string, date-time, UTC): resolution timestamp.
- `resolution_outcome` (string): normalized final outcome.
- `evidence` (string): resolution evidence notes.
