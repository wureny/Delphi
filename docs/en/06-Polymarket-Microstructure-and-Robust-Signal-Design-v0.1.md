# Polymarket Microstructure and Robust Signal Design (v0.1)

## 1. Why this layer is needed
The previous Delphi Polymarket ontology mainly solved the semantic modeling problem for `Event / Market / Outcome`. That is necessary, but not sufficient.

If the goal is to help an agent better understand the real world, it must separate at least two kinds of information:
1. What real-world proposition the market is about.
2. How the current order book and trades are translating that proposition into a price/probability.

For `crypto` and `finance`, the second part is especially important because these categories often have:
1. shallow books,
2. tiny top-of-book resting size,
3. large displayed probability moves from small trades, and
4. quote changes that reflect temporary book structure more than genuine world-state updates.

Delphi should therefore avoid letting an agent treat the displayed probability as the same thing as real-world probability.

## 2. Official facts used as the foundation
Based on official Polymarket documentation, the design uses these facts directly:
1. `Market` is the fundamental tradable unit and each market is a binary Yes/No question.
2. `Event` is a container that can include one or more markets.
3. Only markets with `enableOrderBook=true` are tradable through the CLOB.
4. The WebSocket `market` channel provides:
   - `book`
   - `price_change`
   - `last_trade_price`
   - `best_bid_ask`
   - `tick_size_change`
5. The user-facing price/probability is order-book-based. In Polymarket's user docs, the displayed probability is generally the bid-ask midpoint, unless the spread is wider than 10 cents, in which case the last traded price is used.

Those items above are direct facts from the official docs.

## 3. Design judgments
The points below are Delphi design judgments, not direct Polymarket claims:
1. In shallow markets, midpoint is easily moved by tiny resting size.
2. In wide-spread markets, last trade can also be distorted by very small prints.
3. A single “current price” is therefore not sufficient as the only market signal for an agent.
4. The agent needs to see:
   - market semantics,
   - current book structure,
   - recent trade confirmation, and
   - a more robust derived probability estimate.

## 4. Three-layer design
### 4.1 Semantic layer
Answers: what real-world proposition is this market about?

Core entities:
- `Event`
- `Market`
- `Outcome`
- `NewsSignal`
- `ResolutionState`

This layer is for world understanding and does not directly answer whether the current book is reliable.

### 4.2 Microstructure layer
Answers: how is the current price being formed?

New entities:
- `OrderBookSnapshot`
- `TradePrint`
- `LiquiditySnapshot`

Where:
1. `OrderBookSnapshot` preserves top-N levels, best bid/ask, spread, midpoint, and depth.
2. `TradePrint` captures executed trades, not resting intent.
3. `LiquiditySnapshot` keeps market-level liquidity and 24h volume.

This layer is for understanding the price formation process.

### 4.3 Derived analysis layer
Answers: is the current price reliable enough to influence reasoning?

New entity:
- `MarketMicrostructureState`

This is not a raw ontology fact. It is a derived state computed from microstructure data.

## 5. Why `MarketMicrostructureState` must exist
If we only store `PricePoint`, the agent is likely to treat that point as “the market's opinion”.

But in reality:
1. A 0.49 / 0.51 book and a 0.10 / 0.90 book have very different tradability and informational quality.
2. A 0.62 price supported by deep liquidity is not the same as a 0.62 price created by a tiny top-level order.
3. A recently trade-confirmed price should not be treated the same way as a quote that exists only as resting interest.

So Delphi adds:
- `displayed_probability`
- `robust_probability`
- `book_reliability_score`
- `manipulation_risk_score`
- `depth_imbalance`
- `quote_trade_divergence`
- `explanatory_tags`

This makes the agent evaluate whether the current market price is trustworthy before using it as a proxy for world-state understanding.

## 6. Suggested computation framework
### 6.1 Inputs
From Gamma / CLOB / WebSocket:
- `best_bid`
- `best_ask`
- `spread`
- `tick_size`
- top-N `bid_levels`
- top-N `ask_levels`
- `last_trade_price`
- `last_trade_size`
- recent-window `price_change` frequency
- recent-window `trade_print` count and traded size
- `liquidity_usd`
- `volume_24h_usd`

### 6.2 Intermediate quantities
At minimum, compute:
1. `quoted_mid = (best_bid + best_ask) / 2`
2. `depth_weighted_buy_price(size_n)`
3. `depth_weighted_sell_price(size_n)`
4. `depth_weighted_mid = (buy_exec_price_n + sell_exec_price_n) / 2`
5. `depth_imbalance = (bid_depth_top_n - ask_depth_top_n) / (bid_depth_top_n + ask_depth_top_n)`
6. `quote_trade_divergence = abs(quoted_mid - last_trade_price)`
7. `quote_churn_ratio = quote_update_count / max(trade_count, 1)`

### 6.3 `displayed_probability`
This is close to what the platform displays or what the instantaneous top-of-book implies. It is not the most trustworthy probability.

Suggested rule:
1. If both `best_bid` and `best_ask` exist and spread is not wide, use `midpoint`.
2. If spread is wide, fall back to `last_trade_price`.
3. If book quality is poor, fall back to the latest `PricePoint`.

This stays as close as practical to the Polymarket display convention.

### 6.4 `robust_probability`
This is the agent-facing robust market signal, not the UI price.

Suggested rule:
1. Use `depth_weighted_mid` as the main anchor.
2. Use `displayed_probability` as an input, not as the only truth.
3. Reduce trust in `displayed_probability` when:
   - spread is wide,
   - top-N depth is shallow,
   - `quote_trade_divergence` is large,
   - quote updates are frequent but trade confirmation is weak,
   - the book is extremely one-sided.
4. A simple v0 formula is:

```text
robust_probability =
  reliability_score * displayed_probability
  + (1 - reliability_score) * depth_weighted_mid
```

The lower the `reliability_score`, the less the agent should trust surface-level displayed pricing.

## 7. Suggested risk scores
### 7.1 `book_reliability_score`
Range `[0,1]`, higher means more trustworthy.

It should be influenced by:
- spread width,
- top-N depth,
- whether recent trades confirm current quotes,
- whether tick size is too coarse,
- whether quote churn is abnormal.

### 7.2 `manipulation_risk_score`
Range `[0,1]`, higher means higher heuristic risk of shallow-book distortion or adversarial behavior.

Important:
1. This is a heuristic risk score, not a legal or factual determination of manipulation.
2. `explanatory_tags` should be emitted, for example:
   - `wide_spread`
   - `shallow_book`
   - `quote_not_trade_confirmed`
   - `extreme_depth_imbalance`
   - `spoof_like_churn`

## 8. Practical meaning for the agent
The point of this design is not to make the agent “better at reading books” in isolation. It is to reduce specific reasoning failures:
1. treating a tiny resting order as a major world-state update,
2. treating stale quotes as market consensus,
3. treating wide-spread midpoint as a high-quality probability,
4. updating a thesis too aggressively without trade confirmation.

A better downstream flow is:
1. use `Event/Market/Outcome/NewsSignal` to understand the world proposition,
2. use `OrderBookSnapshot/TradePrint` to understand how the price is being formed,
3. use `MarketMicrostructureState` to decide how much weight the market-implied signal should receive.

## 9. Repository changes in this iteration
This design is now reflected in the repo by:
1. upgrading the PRD to v0.4,
2. extending the core entity dictionary with microstructure and derived-analysis entities,
3. extending `polymarket-ontology.schema.json` with:
   - `order_book_snapshots`
   - `trade_prints`
   - `market_microstructure_states`
4. expanding the sample bundle with crypto/finance book, trade, and robust-signal examples,
5. updating the mapping spec to a multi-source model: Gamma + CLOB + derived analytics.

## 10. Recommended next steps
1. Implement a real CLOB WebSocket / REST ingestion adapter.
2. Validate whether `robust_probability` is more stable than displayed probability on real shallow-book historical samples.
3. Build a benchmark set specifically around “agent gets misled by shallow books” and measure robustness directly.
