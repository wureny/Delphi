# Server Composition Boundary Specification

## Requirements

### Requirement: Server dependencies have one composition root

The server composition root SHALL construct the workspace repository, financial-data provider, workspace runtime, and HTTP handler.
Client application code SHALL depend on `WorkspaceApiRuntime` and SHALL NOT select concrete server repository or provider implementations.

#### Scenario: Application workspace read

GIVEN the default server composition is created
WHEN the application reads the workspace through `HttpWorkspaceApiClient`
THEN the request SHALL cross the HTTP handler and runtime boundary
AND it SHALL return product-shaped workspace data.

### Requirement: Server configuration is explicit and fail-closed

The server composition root SHALL validate repository and financial-data provider modes before constructing runtime dependencies.
Unsupported modes SHALL fail startup and SHALL NOT silently fall back to fixture or mock implementations.
Failure messages SHALL NOT echo supplied configuration values, secrets, graph terms, raw provider terms, model prompts, or chain-of-thought.

#### Scenario: Unsupported provider mode

GIVEN configuration requests an unsupported financial-data provider mode
WHEN server composition is created
THEN creation SHALL fail with a stable configuration error
AND no runtime SHALL be returned.

### Requirement: Runtime orchestration is dependency-injected

The server workspace runtime SHALL depend on `WorkspaceRepository`, `FinancialDataProvider`, and metric-threshold contracts rather than concrete fixture classes.
The fixture runtime MAY remain as a compatibility wrapper around the dependency-injected runtime.

#### Scenario: Fixture compatibility

GIVEN the fixture runtime is created by an existing test
WHEN workspace data is requested
THEN it SHALL preserve the existing safe API envelope and behavior.

### Requirement: Composition preserves reviewable evidence behavior

Provider refresh through the composed HTTP path SHALL create reviewable evidence candidates only.
Every provider-derived investment-relevant candidate SHALL have exactly one of citation or explicit uncertainty.
Provider refresh SHALL NOT alter thesis conviction, assumption status, or decision traces.

#### Scenario: Provider threshold crossing

GIVEN mock fundamentals cross a tracked assumption threshold
WHEN provider refresh runs through the composed HTTP client
THEN one or more evidence candidates MAY be added
AND each added candidate SHALL be grounded or explicitly uncertain
AND thesis conviction and decision trace length SHALL remain unchanged.

### Requirement: Composition preserves counter-evidence and correction

The composed workspace path SHALL return counter-evidence without hiding or neutralizing it.
It SHALL preserve the user correction command and user attribution after correction.

#### Scenario: User corrects evidence

GIVEN an evidence item has an AI classification
WHEN the user corrects it through the composed HTTP client
THEN the corrected classification SHALL be returned
AND its classification source SHALL be `user`.

### Requirement: Composition preserves decision trace integrity

Decision recording through the composed path SHALL reject an empty human rationale.
A successful decision trace SHALL contain the human-provided rationale, timestamp, source references, and follow-up state.
It SHALL NOT contain model-authored rationale, prompts, private reasoning, or chain-of-thought.

#### Scenario: Empty rationale

GIVEN a decision command has an empty rationale
WHEN it is sent through the composed HTTP client
THEN it SHALL return a validation failure
AND no decision trace SHALL be appended.

### Requirement: Composition does not produce investment advice

The composition boundary SHALL NOT generate buy/sell recommendations, price targets, portfolio-sizing instructions, or automatic conviction changes.

#### Scenario: Provider refresh response

GIVEN provider data is refreshed through the composed runtime
WHEN the response is serialized
THEN it SHALL contain no advice-like language or automatic decision rationale.
