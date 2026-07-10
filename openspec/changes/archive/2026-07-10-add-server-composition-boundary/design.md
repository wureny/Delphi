# Design: Server Composition Boundary

## Architecture

```text
React application
  -> WorkspaceService / ProviderEvidenceApiService
  -> ApiWorkspaceRepository / HttpWorkspaceApiClient
  -> in-memory WorkspaceHttpTransport
  -> createWorkspaceHttpHandler
  -> ServerWorkspaceApiRuntime
  -> WorkspaceRepository + FinancialDataProvider
```

`createServerComposition` is the only default assembly point for server-side dependencies. It resolves configuration, creates the currently supported adapters, constructs the runtime, and exposes the HTTP handler. The application consumes a `WorkspaceApiRuntime` implemented by `HttpWorkspaceApiClient`; it does not select persistence or provider implementations.

## Runtime Split

`ServerWorkspaceApiRuntime` owns product-shaped command/query orchestration and normalized error envelopes. Its dependencies are injected as interfaces:

* `WorkspaceRepository`
* `FinancialDataProvider`
* `MetricThreshold[]`

`FixtureWorkspaceApiRuntime` remains as a test and compatibility convenience wrapper. It delegates to the generic runtime with a fixture repository, mock provider, and default thresholds.

## Configuration

The initial `ServerConfig` supports only:

* `repositoryMode: fixture`
* `financialDataProviderMode: mock`

Inputs are accepted as strings so environment-derived values can be validated at startup. Unsupported values fail closed with a stable message that does not echo secrets or backend implementation terms. New live modes must be introduced in later OpenSpec changes together with their adapters and operational requirements.

## Composition API

`createServerComposition(input)` returns:

* the resolved configuration;
* the `WorkspaceApiRuntime`;
* the `WorkspaceHttpHandler`.

No global singleton is created. Each composition owns its in-memory repository state, making tests isolated and future request-server integration explicit.

## Safety And Integrity

The composition layer does not generate investment language. Existing runtime safety envelopes remain the external contract. Tests and evals enforce:

* no buy/sell recommendation, price target, or portfolio-sizing language;
* exactly one of citation or uncertainty for provider-derived evidence;
* counter-evidence remains returned and visible;
* corrections retain user attribution;
* provider refresh does not alter conviction or decision traces;
* decision rationale remains human-authored;
* no graph, raw provider, prompt, secret, stack, or chain-of-thought leakage.

## Follow-On Boundaries

Future changes can add a network server adapter, a Neo4j repository, a live OpenBB client, and an external LLM behavior service independently. Each must plug into this composition root without changing product-facing client services or HTTP payloads.
