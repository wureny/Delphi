# Polymarket Ontology Task Breakdown & Milestones (v0.2)

## 1. Epic Structure
### Epic A: Ontology Domain Modeling
Goal: define entities, relationships, fields, and constraints.

Suggested issues:
1. A1 Define core entity dictionary (Event/Market/Outcome/...)
2. A2 Define relationship graph and cardinality
3. A3 Define field standards (naming/type/time/currency)
4. A4 Define validation rules and error codes
5. A5 Define market microstructure entities (OrderBookSnapshot/TradePrint/MarketMicrostructureState)

### Epic B: Data Mapping Pipeline
Goal: map raw Polymarket structures into ontology schema.

Suggested issues:
1. B1 Sample and curate input datasets
2. B2 Write mapping spec (field mapping table)
3. B3 Implement mapper v0
4. B4 Add malformed/edge-case handling paths
5. B5 Ingest CLOB / WebSocket order-book and trade data
6. B6 Merge market metadata and microstructure into one ontology bundle

### Epic C: Validation & QA
Goal: ensure trust, traceability, and regression safety.

Suggested issues:
1. C1 Implement schema validator
2. C2 Build test case library (normal + abnormal)
3. C3 Generate validation reports and metrics
4. C4 Establish regression process
5. C5 Add dedicated shallow-book / wide-spread / weak-trade-confirmation validation cases

### Epic D: Documentation & Governance
Goal: keep execution sustainable as a professional team workflow.

Suggested issues:
1. D1 Maintain PRD and technical docs
2. D2 Set issue templates and label conventions
3. D3 Define milestone board rules
4. D4 Add ADR (architecture decision record) template

### Epic E: Evaluation Benchmark (Core)
Goal: prove ontology improves agent understanding of market reality.

Suggested issues:
1. E1 Define eval task set (retrieval/understanding/relation tracing)
2. E2 Build Raw Dataset Agent baseline flow
3. E3 Build Ontology Agent comparison flow
4. E4 Produce benchmark report and conclusions
5. E5 Add a shallow-book robustness benchmark to test whether agents get misled by anomalous price moves

### Epic F: Visualization & Editable Ontology
Goal: deliver relation visualization and controlled ontology editing.

Suggested issues:
1. F1 Define JSON -> Graph mapping spec
2. F2 Implement Neo4j import/export scripts
3. F3 Implement basic relation visualization page/script
4. F4 Define edit constraints to prevent schema breakage

### Epic G: Trading & Execution Ontology
Goal: allow agent conclusions to enter a risk-gated, auditable execution semantic chain.

Suggested issues:
1. G1 Define Portfolio/Order/Execution/RiskPolicy entities
2. G2 Build execution-domain JSON schema
3. G3 Build decision -> order -> execution sample chain
4. G4 Define and implement risk gates (including human approval)

## 2. Suggested Milestones
1. Milestone 1 (Week 1-2): Finish Epic A + B1/B2 + A5
2. Milestone 2 (Week 3-4): Finish B3/B4/B5/B6 + C1/C2
3. Milestone 3 (Week 5-6): Finish C5 + E-series + F1/F2
4. Milestone 4 (Week 7): Finish F3/F4 + D-series closure
5. Milestone 5 (Week 8-9): Finish G-series and close paper-trading loop

## 3. Current Status Snapshot (2026-02-28)
1. Epic A/B/C/D foundations are in place at v0 (ontology, mapping, smoke tests, CI, bilingual docs/templates).
2. Epic E has a microstructure benchmark and live-case labeling workflow, but execution-safety benchmarking is still pending.
3. Epic F (visualization/Neo4j) has not started yet and remains a later-phase track.
4. Epic G has runnable foundations through G1-G5 (entities, schema, sample chain, risk gate, order proposal).
5. Current execution focus is G6/G7/G8 (paper-trading loop, audit trail, safety benchmark).

## 4. Label Taxonomy (GitHub)
1. `type:epic`
2. `type:story`
3. `type:task`
4. `area:ontology`
5. `area:mapping`
6. `area:validation`
7. `area:docs`
8. `priority:p0`
9. `priority:p1`
10. `status:blocked`
11. `area:evaluation`
12. `area:visualization`
13. `area:execution`
14. `area:risk`

## 5. Definition of Done (DoD)
1. Code or docs committed and self-checked.
2. Acceptance checklist completed in issue.
3. Related docs (PRD/mapping spec/progress) updated.
4. Issue linked to correct milestone and labels.
5. Evaluation issues must include baseline comparison outputs.
