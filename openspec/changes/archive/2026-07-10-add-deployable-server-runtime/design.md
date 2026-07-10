# Design: Deployable Server Runtime

## Architecture

```text
React application
  -> HttpWorkspaceApiClient
  -> FetchWorkspaceHttpTransport
  -> TCP / HTTP
  -> NodeWorkspaceServer
  -> WorkspaceHttpHandler
  -> ServerWorkspaceApiRuntime
  -> WorkspaceRepository + FinancialDataProvider
```

The Node adapter is deliberately thin. It translates Node requests into the existing `WorkspaceHttpRequest` contract and serializes `WorkspaceHttpResponse`. It does not classify evidence, summarise changes, update conviction, or construct decision rationale.

## Server Configuration

`resolveNodeServerConfig(env)` validates environment-derived strings before startup:

* `HOST`, default `127.0.0.1`
* `PORT`, default `8787`
* `DELPHI_CORS_ORIGINS`, default local Vite origins
* `DELPHI_BODY_LIMIT_BYTES`, default 1 MiB
* `DELPHI_REQUEST_TIMEOUT_MS`, default 15 seconds
* `DELPHI_REPOSITORY_MODE`, default `fixture`
* `DELPHI_FINANCIAL_DATA_PROVIDER_MODE`, default `mock`

Invalid numbers, hosts, origins, repository modes, or provider modes fail startup. Errors use stable messages and do not echo supplied values.

## HTTP Adapter

The Node adapter SHALL:

* expose `GET /healthz` outside the product API envelope;
* forward `/api/*` requests to `WorkspaceHttpHandler`;
* support JSON `GET`, `POST`, and CORS preflight requests;
* enforce an allowlist for browser origins;
* reject oversized bodies before business handling;
* reject malformed JSON with a normalized validation failure;
* normalize unexpected errors without stack, secret, provider, graph, or model leakage;
* set request and header timeouts;
* expose a programmatic listener on port `0` for isolated integration tests.

## Browser Transport

`createFetchWorkspaceHttpTransport` converts the existing request shape into `fetch` calls. It accepts an optional API base URL from `VITE_DELPHI_API_BASE_URL`, validates response envelopes, and converts network or malformed-response failures into safe `runtime_unavailable` envelopes.

`App` accepts an optional `WorkspaceApiRuntime` for deterministic UI tests. Production defaults to the browser runtime. This injection is a client testing seam, not a backend-selection path.

## Build And Development

Vite continues to build the React client. A Vite SSR build bundles the Node entrypoint into `dist-server/startServer.js`, avoiding Node ESM extension drift across the TypeScript module graph. `tsx` runs the server entrypoint in development.

Local development uses two processes:

* `npm run server:dev`
* `npm run dev`

The Vite dev server proxies `/api` and `/healthz` to the Node server.

## Safety Evaluation

Network evals use a real ephemeral listener and assert binary pass/fail conditions:

* provider-derived evidence has exactly one of citation or uncertainty;
* counter-evidence remains classified as contradicting;
* provider refresh does not alter conviction or decision traces;
* responses contain no advice, price targets, graph vocabulary, raw-provider fields, prompts, secrets, or chain-of-thought;
* correction remains attributed to the user;
* empty decision rationale is rejected.
