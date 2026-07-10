# Proposal: Add Server Composition Boundary

## Why

The workspace runtime and HTTP adapter exist, but `App.tsx` still chooses and constructs the fixture runtime directly. That leaves backend selection spread across client code and makes future repository, financial-data provider, graph, and model integrations likely to leak into the UI composition path.

Delphi needs one server-owned composition root that validates supported backend modes, constructs product-facing runtime dependencies, and exposes the existing HTTP handler contract. The first slice remains local and fixture-backed so the boundary can be proven before live infrastructure is introduced.

## Scope

This change SHALL:

* Add explicit server configuration for the currently supported fixture repository and mock financial-data provider.
* Fail closed when an unsupported backend mode is requested.
* Extract a dependency-injected workspace runtime from the fixture convenience runtime.
* Add one server composition root that creates the repository, provider, runtime, and HTTP handler.
* Route the application through the HTTP client and composed handler.
* Preserve grounding, counter-evidence visibility, user correction, provider-refresh, and decision-trace guarantees.
* Add deterministic tests and evals for the composition boundary.

## Out Of Scope

* A network-listening Node server or deployment target.
* Live OpenBB credentials or requests.
* Neo4j persistence, context-graph queries, or ontology implementation.
* External LLM calls, prompt orchestration, or model selection.
* Authentication, multi-tenancy, secrets management, queues, or background jobs.

## Success Criteria

* Client code no longer imports or constructs `FixtureWorkspaceApiRuntime`.
* A composed HTTP client can complete workspace reads, corrections, provider refresh, and decision recording.
* Unsupported backend configuration is rejected without leaking the supplied value or implementation details.
* Provider refresh creates reviewable evidence only and does not mutate conviction or decision traces.
* All lint, typecheck, test, eval, and build checks pass.
