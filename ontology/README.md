# Delphi Ontology (Issue01)

This folder contains the first executable ontology deliverable for Delphi.

## Scope of Issue01
Issue01 implements the minimum ontology foundation:
1. Core entity dictionary.
2. JSON schema contract.
3. One sample ontology bundle.
4. Initial raw-to-ontology field mapping.

## Structure
- `schemas/core-entity-dictionary.md`: human-readable entity definitions.
- `schemas/polymarket-ontology.schema.json`: machine-readable schema contract.
- `samples/polymarket-sample-bundle.json`: sample instance following the schema.
- `mappings/polymarket-field-mapping.json`: initial mapping spec from Polymarket fields.
- `schemas/fund-execution-entity-dictionary.md`: fund execution entity definitions.
- `schemas/fund-execution-ontology.schema.json`: machine-readable contract for execution domain.
- `samples/fund-execution-sample-bundle.json`: sample trading and execution bundle.
- `mappings/fund-execution-mapping.json`: mapping from agent decisions/execution logs.

## Next expected issues
1. Relationship cardinality and graph constraints.
2. Schema validator and error code system.
3. JSON -> graph export (Neo4j).
4. Execution safety gates and human-in-the-loop approval flow.
