## Context

Delphi is currently a Next.js prototype with a typed investment-thesis domain, schema-validated synthetic fixtures, a semantic patch allowlist, a state-transition gateway, a deterministic analysis adapter, a persisted browser store, and unit/contract/end-to-end coverage. The product already separates agent proposals from approved state and records human review actions.

The current implementation has four gaps that matter before the prototype is treated as a credible product artifact:

1. A `replace` patch can set a field to its existing value. The gateway then increments the thesis version and records a transition whose only changes are approval metadata.
2. The successful fixture currently proposes `teamConviction: high` for a pillar that is already `high`, so the shortest accepted review path demonstrates the no-op case.
3. The analysis adapter has a fixture implementation and a deliberately unavailable live-model stub, but configuration, capability reporting, and a graph-projection boundary are not yet expressed as one composition contract.
4. The public website can fall back to a reserved example email address, which creates a visible action that cannot reach the team.

The change must preserve the current narrow product scope: synthetic public-equity-shaped data, deterministic replay, no external model dependency, and no direct agent write to canonical state. The affected stakeholders are product maintainers, future backend implementers, reviewers of the interactive product, and eventual design partners.

## Goals / Non-Goals

**Goals:**

- Make every applied thesis version represent at least one meaningful domain-state change.
- Keep proposal review, authorization, evidence validation, application, audit, rollback, and reset deterministic and fail-closed.
- Align the canonical fixture, expected snapshots, ledger presentation, and end-to-end path around a truthful v12 to v13 transition.
- Introduce a small typed composition boundary that can select fixture-backed analysis and report unavailable live capabilities without exposing secrets.
- Define graph behavior as a read-only projection of canonical thesis and evidence state, not as a second source of truth.
- Keep public capability claims and actions consistent with what the running product actually provides.
- Preserve a clear path to later live providers, persistence, and graph infrastructure without implementing them now.

**Non-Goals:**

- Calling a real LLM or implementing provider-specific SDK logic.
- Deploying Neo4j or any other graph database.
- Adding Postgres, queues, durable orchestration, server-sent events, or a separate backend service.
- Adding authentication, enterprise RBAC, multi-tenancy, customer-owned deployment, or production compliance controls.
- Connecting licensed research, market data, portfolio, order-management, email, or chat systems.
- Supporting real investment decisions, portfolio construction, trading, or automated execution.
- Expanding beyond the current representative case and deterministic degraded scenario.

## Decisions

### 1. Detect no-ops at both patch and transition boundaries

The semantic patch validator will reject a `replace` operation when the parsed value is equal to the target field's current value. The state-transition gateway will also compare a canonical semantic projection before and after the complete approved batch, before version and approval metadata are changed. If the batch has no net semantic effect, the gateway will reject it atomically and record no new thesis version or transition.

This two-level check covers both the common single-operation mistake and composite patches that cancel each other out. Comparing only full snapshot hashes is insufficient because approval timestamps, version numbers, and status metadata can make a no-op appear different.

**Alternative considered:** rely only on the ledger diff. Rejected because the invalid transition would already have entered canonical history.

### 2. Treat the semantic thesis projection as an explicit domain concept

A single helper will define the thesis fields that constitute governed domain state for semantic equality and structural diffing. It will include the investment content collections and their governed fields, while excluding version-envelope and recording metadata such as `version`, `approvedAt`, `recordedAt`, and snapshot hashes.

The same projection will be used by no-op validation and ledger diff generation so acceptance and presentation cannot disagree about whether a change occurred.

**Alternative considered:** maintain separate comparison and display rules. Rejected because they can drift and recreate metadata-only transitions.

### 3. Correct the fixture at its source and invalidate stale persisted demo state

The initial enterprise-demand conviction will be changed from `high` to `medium`; the supported proposal will continue to propose `high`. The expected v13 fixture will therefore show the accepted increase in conviction alongside the forecast review flag and the new open question. Fixture narratives, evidence, expected hashes, and screenshots will be updated together.

Because the browser store persists state, the storage schema/version will be advanced or migrated so an old persisted v12 cannot override the corrected fixture. Reset must always restore the new canonical baseline.

**Alternative considered:** change the proposal to set a different pillar status. Rejected because the proposal text already says the evidence raises confidence, making `medium` to `high` the most direct semantic match.

### 4. Keep fixture analysis canonical and introduce configuration at a composition seam

`AnalysisAdapter` remains the product-shaped runtime interface. A typed, server-owned runtime configuration will resolve an adapter and an explicit capability descriptor. Fixture mode remains the default and only required runnable mode.

Missing, incomplete, or invalid live-provider configuration will not silently instantiate a live adapter, reach the network, or expose a live control. The capability descriptor and receipts will report the actual selected mode. Provider credentials will never enter client-visible configuration or receipts.

**Alternative considered:** wire one real model provider now. Rejected because it adds availability, cost, privacy, and output-variance risk without improving the core governed-state proof.

### 5. Model graph support as a replaceable read-only projection

A graph projection port will accept canonical product objects and return product-shaped nodes, relationships, and provenance references using stable IDs. It will not own approved thesis state, authorize changes, or accept raw provider output. The initial implementation may be a pure deterministic projection or an unavailable capability descriptor; no graph database is required.

Any future Neo4j adapter must sit behind this port. Cypher, database identifiers, and vendor-specific errors must not cross the product boundary.

**Alternative considered:** make a graph database the canonical store. Rejected because the current product proof does not require multi-hop persistence and a second write model would complicate governance.

### 6. Fail closed while preserving useful degraded output

Unavailable required evidence continues to block accept and edit while permitting non-mutating actions such as escalation. Safe proposals produced from still-available evidence remain reviewable. No component may reconstruct missing evidence or imply that an unavailable provider completed successfully.

This behavior remains independent of whether the run was produced by a fixture or a future live adapter.

### 7. Render only truthful public actions and claims

The public website will always offer a working route into the interactive product. A contact action will render only when a valid configured destination is available; a reserved or example-domain address will never be presented as reachable. Synthetic-data, fixture-mode, and pre-production disclosures will remain visible wherever capability claims could otherwise be misread.

Public copy will describe future deployment options as planned architecture, not current runtime behavior.

### 8. Use behavior-level verification as the completion gate

Tests will cover direct no-op replacement, composite net no-op, atomic rejection, meaningful fixture diff, stale persisted-state handling, adapter selection, secret non-exposure, graph projection isolation, public action validity, successful review, degraded review, and reset. The change is complete only when unit/contract tests, Playwright E2E, typecheck, lint, and production build pass.

## Risks / Trade-offs

- **[Risk] Fixture-backed behavior may be mistaken for a live backend.** → Keep mode and synthetic-data disclosures in the product, receipts, and public surface; hide unavailable live controls.
- **[Risk] A semantic projection can omit a newly governed field.** → Centralize it, add exhaustive contract tests, and update it whenever domain schemas gain a governed field.
- **[Risk] Changing the baseline fixture conflicts with persisted browser state.** → Version or migrate the persistence envelope and test hydration followed by reset.
- **[Risk] Provider and graph ports become speculative abstractions.** → Keep each port minimal, product-shaped, and exercised by fixture/unavailable implementations only.
- **[Risk] Hiding an unconfigured contact action reduces conversion.** → Keep the interactive-product CTA available and require a real destination before public release.
- **[Trade-off] No live inference means the prototype does not prove output quality on arbitrary source material.** → Treat that as a later validation track; this change proves workflow, governance, failure behavior, and migration seams.

## Migration Plan

1. Capture the current test baseline and fixture hashes.
2. Add failing unit and contract tests for direct and net semantic no-ops.
3. Implement the shared semantic projection and reject no-ops at review and apply boundaries.
4. Correct the v12/v13 fixtures, expected transition, persistence version, and visible ledger diff.
5. Add the runtime configuration/capability seam and the read-only graph projection port without enabling external services.
6. Replace invalid public fallback actions and align capability copy.
7. Run the full verification gate and manually inspect the successful, degraded, reset, trust, and public entry paths.

Rollback is file-level: the existing fixture adapter remains available throughout, and no external data migration occurs. If a later adapter fails, composition returns to fixture mode without changing UI contracts or canonical thesis state.

## Open Questions

- Which real contact destination should be configured for the public website? Until supplied, the contact action remains hidden and the interactive-product action remains primary.
- Should the first graph projection be exposed through an internal debug/architecture surface, or remain contract-only until a user-visible graph task is validated? This does not block the projection port or its tests.
