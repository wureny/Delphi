# PRD: Polymarket Ontology (v0.4)

## 0. Product Definition (One line)
Delphi is an ontology-driven Agentic Fund system.

## 1. Background & Problem
Polymarket raw data is distributed across event, market, token, price, liquidity, order book, and trade structures. Those source fields are storage- and API-oriented, not naturally shaped for stable agent understanding, which causes:
1. Agents to flatten raw fields instead of understanding what entities exist, how they relate, and what state they are in.
2. Weak reuse across markets and weak traceability for downstream decision paths.
3. Agents that rely on displayed probability or a single price point can overreact to shallow-liquidity moves that do not reflect the real world.
4. Future multi-agent workflows to inherit accidental source-model complexity if the ontology simply mirrors raw interfaces.

## 2. Why Now
Delphi's multi-agent layer depends on a stable semantic foundation. Without ontology-first delivery, orchestration will amplify ambiguity and tech debt.

## 3. Product Goals
Build an extensible, verifiable, and implementation-ready Polymarket ontology layer so Delphi can:
1. Represent core Polymarket objects, relationships, states, and trading microstructure without directly mirroring database/API fields.
2. Enforce constraints for validity, consistency, and completeness.
3. Provide a standardized semantic interface better suited for downstream agents, decision records, risk gates, and audit trails.
4. Separate market semantics from short-horizon order-book signals so agents do not confuse the two.
5. Support visualization and controlled structure editing for human-in-the-loop ontology iteration.

## 4. Design Principles
### P1 Ontology is not a mirror of source tables
1. Raw Polymarket data remains the source of truth.
2. The ontology is a semantic layer above the data layer, optimized for entities, relationships, state, and evidence attribution rather than field transport.
3. It is acceptable to add explicit relationship-oriented or normalized fields for agent reasoning, such as `market_ids`, `outcome_ids`, `binary_side`, `complement_outcome_id`, and `display_price_source`.

### P2 Optimize for agent perception of existence and relationships
Agents reading the ontology should more easily answer:
1. What object is this?
2. What does it belong to?
3. What is it directly related to?
4. Is it tradable, resolved, or evidence-backed?

The ontology should therefore prioritize explicit semantic links over raw field replication.

### P3 Stay aligned with official Polymarket concepts
Based on official Polymarket documentation for `Markets & Events`, `Market Channel`, and the API introduction, the ontology assumes:
1. An `Event` is a semantic container that can include one or more markets.
2. A `Market` is the fundamental tradable proposition, currently modeled as a binary yes/no market.
3. `enableOrderBook=true` indicates that the market is tradable through the CLOB.
4. `book`, `price_change`, `last_trade_price`, and `best_bid_ask` streams are first-class inputs for understanding how price is being formed.
5. Resolution belongs to a `Market`, not abstractly to an `Event`.

### P4 Restrict current scope
v0.4 only covers:
1. `crypto`
2. `finance`

Other categories remain out of scope in the current phase to reduce early complexity and improve validation quality.

### P5 Separate semantic, microstructure, and derived-analysis layers
1. The semantic layer answers what real-world proposition the market is about.
2. The microstructure layer answers how the current order book and trades are producing the observed price.
3. The derived-analysis layer answers whether the observed price/probability is reliable or potentially distorted by shallow books or adversarial behavior.
4. Downstream agents should consume `Market`, `OrderBookSnapshot`, `TradePrint`, `MarketMicrostructureState`, and external evidence together instead of relying on a single price field.

## 5. Non-Goals (v0.4 Out of Scope)
1. Multi-agent framework selection.
2. Automated trading execution and treasury management.
3. Multi-platform prediction market support beyond Polymarket.
4. Broad support for all categories such as politics, sports, or pop culture.
5. A 1:1 replica of every raw API field.
6. Claiming that a single heuristic can prove manipulation; the current phase only outputs risk assessments and robust signals.

## 6. Users & Use Cases
User roles:
1. Research Agent: semantic attribution and extraction.
2. Strategy Agent: market comparison, signal aggregation, and draft decision generation.
3. Risk/Audit Agent: evidence tracing, resolution tracing, state transitions, order-book fragility, and approval chain inspection.
4. Project owner: iteration management, quality acceptance, and direction decisions.

Core use cases:
1. Given a market, parse it into a unified ontology graph and identify its parent event, outcomes, and tradability state.
2. Trace relations among market, outcome, price points, order book, trades, liquidity, news signals, and resolution state.
3. Distinguish displayed probability from robust probability so agents are less vulnerable to shallow-book distortions.
4. Attach research conclusions to stable entity IDs as a foundation for `DecisionRecord -> Order -> Execution` later.
5. Validate completeness and output structured error reports.
6. Visualize entity relations and perform controlled edits of fields, relationships, and constraints.

## 7. Functional Requirements
### FR1 Entity Modeling
Define the minimum entity set:
- Event
- Market
- Outcome
- PricePoint
- OrderBookSnapshot
- TradePrint
- LiquiditySnapshot
- Source
- NewsSignal
- ResolutionState
- MarketMicrostructureState

Where:
1. `Event` is a thematic container, not the tradable object itself.
2. `Market` is the tradable proposition unit and is currently limited to binary markets.
3. `OrderBookSnapshot` captures aggregated book state for an outcome token at a point in time.
4. `TradePrint` represents executed trades rather than resting intent.
5. `MarketMicrostructureState` is a derived-analysis entity expressing reliability, robust probability, and manipulation-risk heuristics.
6. `ResolutionState` belongs to a `Market` and captures settlement state plus evidence.

### FR2 Relationship Modeling
Define key relationships:
- Event hasMany Market
- Market hasExactlyTwo Outcome
- Outcome hasMany PricePoint
- Outcome hasMany OrderBookSnapshot
- Outcome hasMany TradePrint
- Outcome hasMany MarketMicrostructureState
- Market hasMany LiquiditySnapshot
- Market hasOne ResolutionState
- Event hasMany NewsSignal
- AnyEntity hasOne Source

### FR3 Constraints & Validation
1. Each `Event` must include at least one `Market`.
2. Each `Market` must belong to exactly one `Event`.
3. Each `Market` must contain two `Outcome` objects in the current scope (Yes / No).
4. Each `Outcome` must belong to exactly one `Market`.
5. `ResolutionState` must point to a `Market`, not only to an `Event`.
6. `OrderBookSnapshot` and `TradePrint` must point to an `Outcome` and remain traceable to the parent `Market`.
7. All time fields use UTC ISO8601.
8. `Event.category` currently allows only `crypto` or `finance`.
9. Probability fields such as `robust_probability`, `displayed_probability`, and `current_probability` must stay within `[0,1]`.
10. Missing critical fields must produce structured errors.

### FR4 Mapping & Output
1. Support mapping from raw Polymarket data into the ontology schema.
2. Inputs must cover at least two source families:
   - Gamma API for event/market metadata
   - CLOB / WebSocket for order book, best bid/ask, trades, tick size, and related microstructure data
3. Primary output is JSON for agent consumption and versioning.
4. JSON may intentionally include some explicit relationship redundancy if it improves agent readability without violating semantic consistency.
5. Derived analysis outputs such as robust probability and book reliability must be supported.
6. Also output a graph representation (target: Neo4j) for visualization and graph queries.

### FR5 Streaming Evolution Path
1. v0.4 uses sample datasets first.
2. Reserve ingestion adapters for future continuous streams.
3. Streaming sources must not break ontology contracts and should only extend source adapters and mappers.
4. The microstructure layer may ingest higher-frequency data, but downstream agents should default to aggregated snapshots and derived states rather than unbounded raw event streams.

### FR6 Derived Analysis Capability (New)
1. Produce `MarketMicrostructureState` from order-book and trade data.
2. Explicitly distinguish:
   - `displayed_probability`: close to platform display / instantaneous book state
   - `robust_probability`: a more manipulation-resistant probability estimate
3. Output at least the following analysis features:
   - `spread`
   - `depth`
   - `depth_imbalance`
   - `quote_trade_divergence`
   - `book_reliability_score`
   - `manipulation_risk_score`
4. These features are risk heuristics, not definitive proof of manipulation.

### FR7 Evaluation Capability (Core)
1. Build an A/B benchmark: Raw Dataset Agent vs Ontology Agent.
2. Generate a unified report answering whether ontology improves market understanding and why.
3. Evaluate retrieval, event understanding, relation tracing, resolution understanding, and conclusion consistency.
4. Add a decision-path traceability metric to test whether ontology improves auditable reasoning chains.
5. Add a shallow-book robustness metric to test whether the agent is less likely to follow distorted prices.

## 8. Success Metrics (v0.4)
1. Mapping success rate >= 95% on sampled markets.
2. Core-field validation pass rate >= 98% on complete samples.
3. Adding a new crypto or finance market type requires <= 1 day of schema change effort.
4. On the same eval set, Ontology Agent vs Raw Dataset Agent:
5. Fact retrieval accuracy improves by >= 15%.
6. Event/market state understanding consistency improves by >= 20%.
7. Relation tracing task success improves by >= 20%.
8. Decision-path traceability score improves by >= 20%.
9. On a shallow-book test set, the rate of following anomalous price jumps drops by >= 30%.

## 9. Risks & Dependencies
1. Polymarket source schema or field semantics change.
2. Incomplete historical data causes false validation alarms.
3. Over-copying raw fields makes the ontology collapse into a renamed database.
4. Over-abstracting away from official Polymarket concepts makes the model unrealistic.
5. Derived analysis may overfit to single heuristics and create false positives for manipulation risk.
6. JSON + graph dual write introduces consistency overhead.

## 10. Milestones (Suggested)
1. M1: Ontology draft + official concept alignment + sample data (1 week)
2. M2: Mapper + Validator + Basic graph export (1-2 weeks)
3. M3: Microstructure-derived analysis prototype (robust probability, shallow-book risk) + visualization prototype (1-2 weeks)
4. M4: Evaluation benchmark (Raw vs Ontology, including shallow-book robustness) (1-2 weeks)

## 11. Acceptance Criteria
1. At least 20 real/sample crypto and finance markets can be mapped end-to-end.
2. All errors are classifiable (schema/data missing/format/relationship errors).
3. Documentation and issue status remain traceable and consistent.
4. One completed same-task Raw vs Ontology benchmark report with explicit conclusions.
5. At least one validated example of `1 event -> many markets`.
6. At least one validated example showing that settlement belongs to a market rather than a whole event.
7. At least one validated shallow-book case where displayed probability moves but robust probability remains stable.

## 12. Phase 2 Extension (Trading Execution)
1. Add execution-domain ontology on top of market ontology (Portfolio/Order/Execution/RiskPolicy).
2. Complete paper-trading before moving to small live execution.
3. Live execution must include human approval and risk gates by default.
4. The execution layer must read `MarketMicrostructureState` to avoid acting on fragile books and noisy prices.
