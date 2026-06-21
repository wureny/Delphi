# Design: Runtime API Boundary

## Architecture

```text
React App
  -> WorkspaceService
  -> ApiWorkspaceRepository
  -> WorkspaceApiRuntime contract
  -> FixtureWorkspaceApiRuntime
  -> WorkspaceService / ProviderEvidenceService
  -> FixtureWorkspaceRepository / MockFinancialDataProvider
```

The runtime contract is API-shaped but in-process for this slice.
Future work can replace the in-process runtime with HTTP handlers, Neo4j-backed repositories, OpenBB live clients, and external LLM orchestration without changing UI components.

## API Envelope

All runtime calls return:

* `ok: true`, `data`
* or `ok: false`, `error`

Errors use normalized codes and safe product language.
They must not expose stack traces, Cypher, raw OpenBB payloads, provider secrets, prompts, or chain-of-thought.

## DTOs

DTOs mirror Delphi product concepts:

* workspace
* thesis workspace
* evidence
* change summary
* correction command
* decision command
* provider evidence refresh command

The mapper layer deep-clones payloads and validates that serialized API payloads do not contain disallowed implementation terms.

## Runtime Commands

Runtime commands include:

* accept evidence
* dismiss evidence
* correct evidence
* record decision
* refresh provider evidence

The runtime preserves existing product invariants:

* corrections are user-attributed,
* empty decision rationale is rejected,
* provider refresh only creates review candidates,
* provider refresh does not update conviction or decision trace,
* counter-evidence remains visible and queryable.

## Testing Strategy

Tests cover:

* `ApiWorkspaceRepository` parity with the direct fixture repository,
* runtime command success and safe error envelopes,
* decision trace integrity,
* provider refresh behavior through API runtime,
* no implementation vocabulary leakage in serialized API payloads.

Evals cover:

* no graph/OpenBB/raw model leakage,
* no advice leakage,
* no chain-of-thought or model-authored decision rationale,
* no automatic conviction change from provider refresh,
* user correction path preserved.
