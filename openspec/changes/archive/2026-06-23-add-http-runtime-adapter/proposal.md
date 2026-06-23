# Proposal: Add HTTP Runtime Adapter

## Why

Delphi now has an in-process runtime API boundary.
The next step is to define how that boundary can be exposed through HTTP without introducing a real server, auth, database, Neo4j, OpenBB network access, or LLM calls yet.

This creates a concrete path for a backend service while keeping the product invariants and eval coverage intact.

## Scope

* Define HTTP-like request and response types for the workspace runtime.
* Add a route handler that maps product-shaped HTTP endpoints to `WorkspaceApiRuntime`.
* Add an HTTP client adapter that implements `WorkspaceApiRuntime`.
* Preserve safe API envelopes and normalized error handling.
* Add tests and evals for routing, command behavior, provider refresh, safe errors, and no implementation leakage.

## Out of Scope

* Express/Fastify/Node server startup
* Network fetch integration
* Authentication and authorization
* Neo4j, graph repository, or ontology runtime
* Live OpenBB calls
* External LLM calls
