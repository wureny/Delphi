# Delphi Ontology

This folder contains the executable ontology artifacts for Delphi.

## Current modeling stance
1. The ontology is a semantic layer above raw source data, not a direct mirror of storage tables or API payloads.
2. The current market ontology is optimized for agent reasoning, explicit relationship traversal, and future decision-path traceability.
3. The current scope is intentionally limited to Polymarket `crypto` and `finance` markets.
4. Modeling choices are aligned with official Polymarket concepts: an event groups one or more markets, each market is the fundamental tradable proposition, and order book availability depends on `enableOrderBook`.
5. The ontology now separates three layers:
   - market semantics
   - market microstructure
   - derived reliability / robust-price analysis

## Current contents
- `schemas/core-entity-dictionary.md`: human-readable entity definitions and semantic modeling choices.
- `schemas/polymarket-ontology.schema.json`: machine-readable schema contract for the current market ontology.
- `samples/polymarket-sample-bundle.json`: sample bundle aligned with the current schema.
- `mappings/polymarket-field-mapping.json`: multi-source mapping draft informed by official Polymarket docs.
- `schemas/fund-execution-entity-dictionary.md`: fund execution entity definitions.
- `schemas/fund-execution-ontology.schema.json`: machine-readable contract for execution domain.
- `samples/fund-execution-sample-bundle.json`: sample trading and execution bundle.
- `mappings/fund-execution-mapping.json`: mapping from agent decisions/execution logs.

## Current market ontology priorities
1. Make entities and relationships explicit for agents.
2. Keep provenance anchors to raw Polymarket identifiers where needed.
3. Represent settlement at the market level.
4. Add order-book and trade semantics so agents do not over-index on a single displayed price.
5. Output a derived `MarketMicrostructureState` so downstream agents can weight market-implied signals by reliability.
6. Avoid uncontrolled expansion to all categories before validation quality is good enough.

## Related design docs
- `docs/zh/06-Polymarket-市场微观结构与稳健信号设计-v0.1.md`
- `docs/en/06-Polymarket-Microstructure-and-Robust-Signal-Design-v0.1.md`

## Next expected issues
1. Relationship cardinality and graph constraints beyond basic JSON schema.
2. Schema validator and structured error code system.
3. JSON -> graph export (Neo4j).
4. Ingestion adapters for real Gamma API and CLOB samples.
5. Derived analysis implementation for robust probability and shallow-book manipulation-risk heuristics.
6. Execution safety gates and human-in-the-loop approval flow.
