# HTTP Runtime Adapter Specification

## Requirements

### Requirement: HTTP adapter routes product-shaped workspace requests

The HTTP runtime adapter SHALL expose workspace read and command routes using Delphi product vocabulary.
It SHALL map each route to `WorkspaceApiRuntime` methods.

#### Scenario: Workspace route

GIVEN a client sends `GET /api/workspace`
WHEN the HTTP handler processes the request
THEN it SHALL return a success envelope containing workspace data.

### Requirement: HTTP client implements runtime contract

The HTTP workspace client SHALL implement `WorkspaceApiRuntime`.
It SHALL send product-shaped requests and return the same safe envelopes as the in-process runtime.

#### Scenario: API repository over HTTP client

GIVEN an `ApiWorkspaceRepository` uses the HTTP client
WHEN workspace data is requested
THEN it SHALL receive the same product-shaped data as the runtime contract.

### Requirement: HTTP failures are safe

Unknown routes, invalid methods, missing bodies, and runtime failures SHALL return normalized failure envelopes.
Failure bodies SHALL NOT expose stack traces, raw provider payloads, model prompts, graph terms, Cypher, secrets, or chain-of-thought.

#### Scenario: Unknown route

GIVEN a client requests an unknown route
WHEN the handler processes the request
THEN it SHALL return a failure envelope
AND the response body SHALL use safe product language.

### Requirement: Provider refresh remains non-mutating to thesis state

HTTP provider refresh SHALL create reviewable evidence candidates only.
It SHALL NOT update conviction, assumption status, or decision trace.

#### Scenario: Provider refresh over HTTP

GIVEN provider data crosses tracked assumption thresholds
WHEN the client sends `POST /api/provider-evidence/refresh`
THEN candidates MAY be returned
AND thesis conviction SHALL remain unchanged
AND no decision trace SHALL be appended.

### Requirement: HTTP adapter never produces investment advice

The HTTP adapter SHALL NOT generate buy/sell recommendations, price targets, portfolio sizing, conviction changes, or decision rationale.

#### Scenario: Command routing without advice

GIVEN the handler routes a provider refresh or evidence command
WHEN the response is serialized
THEN the serialized response SHALL NOT contain advice-like language.
