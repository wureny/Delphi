# Proposal: Add Deployable Server Runtime

## Why

Delphi now has a server composition root and product-shaped HTTP handler, but the React application still creates that server composition inside the browser process. This prevents the server from becoming a real trust boundary: future financial-data credentials, persistence drivers, context-graph access, and model clients must never be bundled into frontend code.

The next vertical slice SHALL move the composition root into a separately running Node process and connect the browser through real HTTP using the existing runtime contract.

## Scope

This change SHALL:

* Add a Node HTTP adapter around `WorkspaceHttpHandler`.
* Add validated environment configuration for host, port, CORS, body limits, request timeouts, repository mode, and provider mode.
* Add a health endpoint and graceful shutdown behavior.
* Add a browser `fetch` transport implementing `WorkspaceHttpTransport`.
* Remove server composition imports from production frontend code.
* Add development and production server scripts and a bundled server build.
* Add real-network integration tests and product evals using an ephemeral local port.
* Preserve safe envelopes, grounding, counter-evidence visibility, user correction, and decision-trace integrity.

## Out Of Scope

* Authentication, authorization, sessions, or multi-tenancy.
* TLS termination, reverse-proxy configuration, or a cloud deployment.
* Live OpenBB requests or credentials.
* Neo4j, ontology, or context-graph persistence.
* External LLM APIs, prompts, or model orchestration.
* Background jobs, queues, ingestion scheduling, or durable storage.

## Success Criteria

* The production React bundle does not import fixture repositories, mock providers, or server composition modules.
* The built Node server can start, answer `/healthz`, and serve `/api/workspace`.
* The frontend client can read and mutate workspace state through real HTTP.
* Invalid JSON, excessive bodies, disallowed origins, unknown routes, and internal failures return safe responses.
* Existing investment-product invariants pass over the network path.
* Lint, typecheck, tests, evals, client build, server build, and a built-server smoke test pass.
