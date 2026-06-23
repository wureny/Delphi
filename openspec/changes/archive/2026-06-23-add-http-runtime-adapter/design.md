# Design: HTTP Runtime Adapter

## Architecture

```text
HTTP client adapter
  -> WorkspaceHttpTransport
  -> createWorkspaceHttpHandler(runtime)
  -> WorkspaceApiRuntime
```

The transport is injected.
Tests use an in-memory transport that calls the handler directly.
Production can later replace the transport with `fetch` against a server endpoint.

## Endpoints

Read endpoints:

* `GET /api/workspace`
* `GET /api/evidence?filter=new`
* `GET /api/theses/:thesisId`
* `GET /api/what-changed`

Command endpoints:

* `POST /api/evidence/:evidenceId/accept`
* `POST /api/evidence/:evidenceId/dismiss`
* `POST /api/evidence/correct`
* `POST /api/decisions`
* `POST /api/provider-evidence/refresh`

Internal runtime compatibility endpoints:

* `POST /api/internal/evidence-candidates`
* `POST /api/internal/decision-traces`
* `POST /api/internal/thesis-review`

Internal endpoints exist only so `HttpWorkspaceApiClient` can fully implement the current `WorkspaceApiRuntime` interface.
They are not UI concepts and must still preserve product-shaped payloads.

## Error Handling

The handler always returns an HTTP status plus a `WorkspaceApiResult` body.
Known route and validation failures use safe normalized errors.
Errors must not expose stack traces, raw provider payloads, model prompts, graph terms, Cypher, secrets, or chain-of-thought.

## Safety

The adapter does not make investment claims.
It only routes product-shaped requests to runtime methods.
Provider refresh remains a candidate-generation command and does not update conviction or decision traces.
