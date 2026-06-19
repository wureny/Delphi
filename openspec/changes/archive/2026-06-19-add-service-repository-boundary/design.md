# Design

## Boundary

The UI speaks to `WorkspaceService`.
`WorkspaceService` speaks to `WorkspaceRepository`.
The first repository adapter is `FixtureWorkspaceRepository`; future adapters may include Neo4j or API-backed repositories.

```text
React UI -> WorkspaceService -> WorkspaceRepository -> FixtureWorkspaceRepository
```

## Repository Port

The repository returns and updates product-shaped data only.
It must not expose graph, Neo4j, OpenBB, Cypher, or provider-specific response shapes.

Core methods:

* `getWorkspace()`
* `listEvidence(filter)`
* `acceptEvidence(id)`
* `dismissEvidence(id)`
* `correctEvidence(draft)`
* `recordDecision(entry)`
* `getThesisWorkspace(id)`
* `getWhatChanged()`

## Service Responsibilities

`WorkspaceService` owns deterministic product invariants:

* empty decision rationale is rejected
* correction source becomes `user`
* corrected evidence maps asset from the selected thesis
* accepted evidence is what appears in the thesis evidence map
* decision trace entries are human-authored and contain no chain-of-thought field
* decision recording updates conviction, band, freshness, and pending changes
* counter-evidence remains queryable through filters

## Testing

Add contract tests that run against the fixture repository/service.
Future Neo4j adapters should satisfy the same behaviour before replacing fixture state in UI flows.
