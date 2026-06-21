# Proposal: Add Runtime API Boundary

## Why

Delphi now has product-shaped services, repository boundaries, provider ingestion, and an OpenBB-compatible adapter contract.
The frontend still composes fixture repositories and ingestion services directly.
Before adding Neo4j, context graph generation, external LLM APIs, or live provider clients, Delphi needs a runtime/API boundary that isolates UI-facing code from backend orchestration and persistence details.

This change introduces a fixture-backed API-like runtime without adding a server, database, or network dependency.

## Scope

* Define API query/command DTOs for workspace reads and mutations.
* Define an API client/runtime contract with safe envelopes for success and failure.
* Add mappers that preserve product vocabulary and block raw provider, graph, or model implementation fields.
* Implement a fixture-backed runtime that composes the existing workspace service and provider evidence service.
* Add an `ApiWorkspaceRepository` so UI-facing services continue to use `WorkspaceRepository`.
* Route provider refresh through the runtime API boundary.
* Add tests and evals for command integrity, safe errors, no raw implementation leakage, and no automatic conviction changes.

## Out of Scope

* HTTP server implementation
* Neo4j persistence
* Context graph or ontology generation
* Live OpenBB network calls
* External LLM API calls
* Authentication, authorization, or user accounts
