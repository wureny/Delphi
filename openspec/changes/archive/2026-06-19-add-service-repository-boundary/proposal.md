# Add Service Repository Boundary

## Why

Delphi now has product specs, financial data provider boundaries, and a fixture-backed UI.
The UI still mutates `WorkspaceData` directly inside React state.
That makes future OpenBB, Neo4j, and external LLM integration harder because product invariants are scattered in UI code.

This change creates a service/repository boundary while preserving the current fixture-backed behaviour.

## Scope

* Define a `WorkspaceRepository` port for workspace reads and writes.
* Implement a stateful `FixtureWorkspaceRepository` adapter backed by the existing fixture data.
* Add a `WorkspaceService` that enforces product invariants before mutating state.
* Refactor `App.tsx` to call service methods instead of mutating workspace data directly.
* Add repository/service contract tests that future Neo4j adapters can reuse.

## Out Of Scope

* Neo4j persistence
* OpenBB integration
* External LLM API calls
* Auth or multi-user isolation
* API server routes
* Changing visible UI behaviour
