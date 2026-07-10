# Deployable Server Runtime Specification

## Requirements

### Requirement: Server composition runs outside the browser

The production frontend SHALL communicate with Delphi through HTTP.
It SHALL NOT import or construct the server composition root, concrete workspace repository, or concrete financial-data provider.

#### Scenario: Production workspace load

GIVEN the Node server and frontend are running
WHEN the frontend loads the workspace
THEN it SHALL send `GET /api/workspace` through a fetch-based transport
AND receive product-shaped workspace data.

### Requirement: Node server exposes health and workspace routes

The Node server SHALL expose `GET /healthz` and SHALL forward `/api/*` requests to `WorkspaceHttpHandler`.
The health response SHALL disclose only service availability.

#### Scenario: Health check

GIVEN the server is listening
WHEN a client requests `GET /healthz`
THEN the server SHALL return HTTP 200
AND a minimal healthy status payload.

### Requirement: Startup configuration is validated

The server SHALL validate host, port, allowed origins, body limit, request timeout, repository mode, and provider mode before listening.
Invalid configuration SHALL fail startup without echoing supplied values, secrets, graph terms, raw-provider terms, prompts, or chain-of-thought.

#### Scenario: Invalid port

GIVEN the configured port is outside the valid TCP port range
WHEN server configuration is resolved
THEN resolution SHALL fail with a stable configuration error
AND the server SHALL NOT listen.

### Requirement: HTTP input is bounded and safely parsed

The Node server SHALL reject malformed JSON and request bodies above the configured limit before invoking workspace commands.
Errors SHALL use normalized product-safe envelopes and SHALL NOT expose stack traces or request contents.

#### Scenario: Oversized decision command

GIVEN a request body exceeds the configured limit
WHEN it is sent to `POST /api/decisions`
THEN the server SHALL return HTTP 413
AND SHALL NOT record a decision.

### Requirement: Browser origins are allowlisted

Requests without an `Origin` header SHALL be accepted as non-browser clients.
Browser requests with an allowed origin SHALL receive the corresponding CORS header.
Browser requests with a disallowed origin SHALL be rejected before business handling.

#### Scenario: Disallowed browser origin

GIVEN a request contains an origin outside the configured allowlist
WHEN the request reaches the Node server
THEN the server SHALL return HTTP 403
AND SHALL NOT expose workspace data.

### Requirement: Fetch transport fails safely

The browser fetch transport SHALL implement `WorkspaceHttpTransport`.
Network failures, non-JSON responses, and invalid API envelopes SHALL become `runtime_unavailable` failures without exposing raw response bodies or transport internals.

#### Scenario: Server is unavailable

GIVEN the browser cannot reach the configured API base URL
WHEN workspace data is requested
THEN the runtime client SHALL receive a safe `runtime_unavailable` envelope.

### Requirement: Frontend surfaces network failures without discarding state

An initial workspace network failure SHALL render a retryable error instead of indefinite loading.
A provider-refresh network failure SHALL end the loading state, show an error, and preserve already-loaded evidence.

#### Scenario: Provider refresh becomes unavailable

GIVEN the workspace and evidence inbox are already loaded
WHEN provider refresh fails at the network or runtime boundary
THEN the refresh control SHALL become available again
AND existing evidence SHALL remain visible
AND the UI SHALL explain that refresh is unavailable.

### Requirement: Network transport preserves evidence safeguards

Every provider-derived investment-relevant evidence item returned over HTTP SHALL have exactly one of citation or explicit uncertainty.
Counter-evidence SHALL remain visible and contradicting.
Provider refresh SHALL NOT change conviction, assumption status, or decision traces.

#### Scenario: Provider refresh over TCP

GIVEN the deployable server is running with fixture and mock adapters
WHEN a client refreshes provider evidence over real HTTP
THEN reviewable evidence candidates MAY be returned
AND grounding and counter-evidence guarantees SHALL hold
AND conviction and decision traces SHALL remain unchanged.

### Requirement: Network transport preserves correction and decision integrity

User corrections sent over HTTP SHALL retain `classification.source = user`.
Decision recording SHALL reject an empty human rationale and SHALL NOT generate model-authored rationale or chain-of-thought.

#### Scenario: Empty decision rationale over TCP

GIVEN a decision command has an empty rationale
WHEN it is sent to the Node server
THEN it SHALL return a validation failure
AND no decision trace SHALL be appended.

### Requirement: Network responses do not produce investment advice

The Node and fetch adapters SHALL NOT generate buy/sell recommendations, price targets, portfolio-sizing instructions, automatic conviction changes, or decision rationale.

#### Scenario: Serialized provider refresh

GIVEN provider evidence is refreshed over HTTP
WHEN the response is serialized
THEN it SHALL contain no advice-like language or automatic investment decision.
