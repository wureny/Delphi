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
  - includes local file-backed artifact persistence for raw snapshots and evidence-ready bundles

Frontend shell:

- `frontend/`
  - thread5 no-dependency TypeScript shell
  - recorded runtime fixture playback + future SSE adapter placeholder
  - left report / right agent canvas layout
- `npm run frontend:demo:record`
  - regenerate the recorded runtime fixture from the real thread4 fixture runtime
- `npm run frontend:build`
  - compile browser TypeScript into `frontend/dist`
- `npm run frontend:serve`
  - serve the frontend shell locally from `frontend/`
- `npm run dev:live`
  - start the thread4 runtime bridge and thread5 frontend shell together
  - opens the live path via `/?source=sse&runtime=http://127.0.0.1:8787&run=demo`

OpenBB local setup:

- [openbb-local-setup.md](/Users/wurenyu/workspace/Delphi/docs/03-engineering/openbb-local-setup.md)
