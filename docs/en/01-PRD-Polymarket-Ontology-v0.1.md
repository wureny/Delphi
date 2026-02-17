# PRD: Polymarket Ontology (v0.2)

## 0. Product Definition (One line)
Delphi is an ontology-driven Agentic Fund system.

## 1. Background & Problem
Polymarket data is spread across market/event/outcome/trade-like structures with inconsistent semantics, causing:
1. Unstable agent reasoning.
2. Low reuse for cross-market analysis.
3. Weak traceability for decision pipelines.

## 2. Why Now
Delphi's multi-agent layer depends on a stable semantic foundation. Without ontology-first delivery, orchestration will amplify ambiguity and tech debt.

## 3. Product Goals
Build an extensible, verifiable, and implementation-ready Polymarket ontology layer so Delphi can:
1. Represent core Polymarket objects and relationships in a unified way.
2. Enforce constraints (validity, consistency, completeness).
3. Provide standardized outputs consumable by downstream agents.
4. Support visualization and controlled structure editing for human-in-the-loop ontology iteration.

## 4. Non-Goals (v0.1 Out of Scope)
1. Multi-agent framework selection.
2. Automated trading execution and treasury management.
3. Multi-platform prediction market support beyond Polymarket.

## 5. Users & Use Cases
User roles:
1. Research Agent: semantic attribution and extraction.
2. Strategy Agent: market comparison and signal aggregation.
3. Project owner: iteration management, quality acceptance, and direction decisions.

Core use cases:
1. Given a market, parse it into a unified ontology entity graph.
2. Trace market relations to event, outcomes, odds, and time windows.
3. Validate completeness and output structured error reports.
4. Visualize entity relations and perform controlled edits (fields, relationships, constraints).

## 6. Functional Requirements
### FR1 Entity Modeling
Define minimal entity set (for minimum executable Agentic Fund information):
- Event
- Market
- Outcome
- PricePoint
- LiquiditySnapshot
- Source
- Timestamp
- NewsSignal
- ResolutionState

### FR2 Relationship Modeling
Define key relationships:
- Event hasMany Market
- Market hasMany Outcome
- Outcome hasMany PricePoint
- Market hasMany LiquiditySnapshot
- AnyEntity hasOne Source

### FR3 Constraints & Validation
1. Each Market must belong to exactly one Event.
2. Each Outcome must belong to exactly one Market.
3. All time fields use UTC ISO8601.
4. Missing critical fields must produce structured errors.

### FR4 Mapping & Output
1. Support mapping from raw Polymarket data into ontology schema.
2. Primary output is JSON for agent consumption and versioning.
3. Also output graph representation (target: Neo4j) for visualization and graph queries.

### FR5 Streaming Evolution Path
1. v0.2 uses sample datasets first.
2. Reserve ingestion adapters for future continuous streams.
3. Streaming sources must not break ontology contracts.

### FR6 Evaluation Capability (Core)
1. Build A/B benchmark: Raw Dataset Agent vs Ontology Agent.
2. Generate a unified report to answer whether ontology improves market understanding.
3. Evaluate across retrieval, event understanding, relation tracing, and conclusion consistency.

## 7. Success Metrics (v0.2)
1. Mapping success rate >= 95% on sampled markets.
2. Core-field validation pass rate >= 98% on complete samples.
3. Adding a new market type requires <= 1 day schema change effort.
4. On the same eval set, Ontology Agent vs Raw Dataset Agent:
5. Fact retrieval accuracy improves by >= 15%.
6. Event state understanding consistency improves by >= 20%.
7. Relation tracing task success improves by >= 20%.

## 8. Risks & Dependencies
1. Polymarket source schema changes.
2. Incomplete historical data causing false validation alarms.
3. Over-engineered early schema reducing delivery speed.
4. JSON + graph dual write introduces consistency overhead.

## 9. Milestones (Suggested)
1. M1: Ontology Draft + Sample Data (1 week)
2. M2: Mapper + Validator + Basic graph export (1-2 weeks)
3. M3: Evaluation benchmark + visualization prototype (1-2 weeks)

## 10. Acceptance Criteria
1. At least 20 real/sample markets can be mapped end-to-end.
2. All errors are classifiable (schema/data missing/format errors).
3. Documentation and issue status remain traceable and consistent.
4. One completed same-task Raw vs Ontology benchmark report with explicit conclusions.
