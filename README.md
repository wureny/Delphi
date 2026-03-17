# Delphi

This repository is organized doc-first for an AI product / agentic engineering workflow.

Start here:

- [docs/README.md](/Users/wurenyu/workspace/Delphi/docs/README.md)

Core principle:

1. Clarify product intent before implementation.
2. Turn product requirements into agent behavior, evals, and safety rules.
3. Turn stable decisions into technical specs and ADRs.
4. Keep docs live and iterative instead of treating them as one-off deliverables.

Implementation skeleton:

- `src/research-graph/ontology.ts`
  - v0 ontology node types and stable relationship registry
- `src/research-graph/runtime.ts`
  - runtime meta graph node types, edge registry, and agent roster
- `src/research-graph/merge-policy.ts`
  - stable object identity keys, conflict strategy, and mutable field policy
- `src/research-graph/graph-patch.ts`
  - `GraphPatch` scope and operation contracts
- `src/research-graph/validator.ts`
  - patch validation rules for scope, schema, edge pairs, and evidence discipline
- `src/research-graph/graph-writer.ts`
  - writer interface and patch submission boundary for runtime integration
- `src/research-graph/neo4j-adapter.ts`
  - Neo4j statement planner and graph writer skeleton built on the same patch contract
- `src/research-graph/neo4j-driver.ts`
  - real Neo4j driver executor and env-based connection config
- `src/research-graph/index.ts`
  - single entrypoint for thread2 graph contracts
- `src/data-layer/`
  - thread3 runtime adapter, normalization, evidence-ready mapping, and OpenBB integration

OpenBB local setup:

- [openbb-local-setup.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/openbb-local-setup.md)
